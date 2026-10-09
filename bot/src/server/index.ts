import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { readdirSync, statSync, existsSync } from 'node:fs';
import pool, { checkDatabase, getDatabaseStatus } from '../database/db.ts';
import { setIO } from '../events.ts';
import path from 'node:path';
import { getBotApiToken, getClipsPath, getDashboardUrl, getStorageConfig, getStoragePath } from '../utils/config.ts';
import { resolveStoredFile } from '../utils/paths.ts';

const app = express();
const httpServer = createServer(app);
const dashboardUrl = getDashboardUrl();
const corsOptions = {
  origin: dashboardUrl ? [dashboardUrl] : [],
  credentials: true,
};
const io = new Server(httpServer, { cors: corsOptions });

setIO(io);
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));

function requireApiAuth(req: Request, res: Response, next: NextFunction) {
  const expected = getBotApiToken();
  if (!expected) return next();
  const received = req.header('authorization')?.replace(/^Bearer\s+/i, '') ?? req.header('x-api-token');
  if (!received || received !== expected) return res.status(401).json({ error: 'Não autorizado' });
  next();
}

function getFolderSizeBytes(folderPath: string): number {
  let total = 0;
  try {
    for (const entry of readdirSync(folderPath, { withFileTypes: true })) {
      const fullPath = path.join(folderPath, entry.name);
      total += entry.isDirectory() ? getFolderSizeBytes(fullPath) : statSync(fullPath).size;
    }
  } catch (error) {
    console.warn('[API] Falha ao calcular armazenamento:', error instanceof Error ? error.message : 'erro desconhecido');
  }
  return total;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function findFile(rootPath: string, filename: string): string | null {
  if (!filename || filename !== path.basename(filename)) return null;
  if (!existsSync(rootPath)) return null;
  try {
    for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
      const full = path.join(rootPath, entry.name);
      if (entry.isDirectory()) {
        const found = findFile(full, filename);
        if (found) return found;
      } else if (entry.name === filename) return full;
    }
  } catch { return null; }
  return null;
}

app.get('/health', async (_req, res) => {
  const databaseOk = await checkDatabase();
  const status = getDatabaseStatus();
  res.status(databaseOk ? 200 : 503).json({
    ok: databaseOk,
    service: 'wardizitto-recorder',
    database: status.ready ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', requireApiAuth);

app.get('/api/recordings', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM recordings ORDER BY date DESC');
    res.json(rows);
  } catch (error) {
    console.error('[API] Falha ao listar gravações:', error instanceof Error ? error.message : error);
    res.status(503).json({ error: 'Banco de dados indisponível' });
  }
});

app.get('/api/recordings/file/:filename', (req, res) => {
  const filename = req.params.filename;
  if (filename !== path.basename(filename)) return res.status(400).json({ error: 'Nome de arquivo inválido' });
  const filePath = findFile(getStoragePath(), filename);
  if (!filePath || !resolveStoredFile(path.dirname(filePath), path.basename(filePath))) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }
  return res.download(filePath);
});

app.get('/api/clips', (_req, res) => {
  const folder = getClipsPath();
  if (!existsSync(folder)) return res.json([]);
  try {
    const files = readdirSync(folder).filter(f => f.toLowerCase().endsWith('.mp3')).map(filename => {
      const filePath = resolveStoredFile(folder, filename)!;
      const fileStat = statSync(filePath);
      return { filename, size: fileStat.size, date: fileStat.mtime.toISOString() };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return res.json(files);
  } catch (error) {
    console.error('[API] Falha ao listar clips:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Erro ao listar clips' });
  }
});

app.get('/api/clips/file/:filename', (req, res) => {
  const filePath = resolveStoredFile(getClipsPath(), req.params.filename);
  if (!filePath) return res.status(404).json({ error: 'Clip não encontrado' });
  return res.download(filePath);
});

app.get('/api/stats', async (_req, res) => {
  try {
    const [totalRecs]: any = await pool.query('SELECT COUNT(*) as count FROM recordings');
    const [allRecs]: any = await pool.query('SELECT participants FROM recordings WHERE participants IS NOT NULL');
    const uniqueUsers = new Set<string>();
    for (const row of allRecs) {
      try {
        const ids = JSON.parse(row.participants);
        if (Array.isArray(ids)) ids.forEach((id: string) => uniqueUsers.add(id));
      } catch { /* dado legado inválido não deve derrubar as estatísticas */ }
    }
    const storageUsedBytes = getFolderSizeBytes(getStoragePath()) + getFolderSizeBytes(getClipsPath());
    const { maxStorageBytes, maxStorageGb, autoDeleteDays } = getStorageConfig();
    return res.json({
      totalRecordings: Number(totalRecs[0].count),
      totalUsers: uniqueUsers.size,
      storageUsed: formatBytes(storageUsedBytes),
      storageUsedBytes,
      storageQuotaBytes: maxStorageBytes,
      storageQuotaGb: maxStorageGb,
      autoDeleteDays,
    });
  } catch (error) {
    console.error('[API] Falha nas estatísticas:', error instanceof Error ? error.message : error);
    return res.status(503).json({ error: 'Banco de dados indisponível' });
  }
});

io.on('connection', socket => {
  console.log('[ws] cliente conectado');
  socket.on('disconnect', () => console.log('[ws] cliente desconectado'));
});

const PORT = process.env.PORT || '2312';
export const startServer = () => {
  if (!dashboardUrl) console.warn('[API] DASHBOARD_URL não definida; CORS permanecerá fechado.');
  httpServer.listen(Number(PORT), '0.0.0.0', () => console.log(`🌐 Server na porta ${PORT}`));
};
