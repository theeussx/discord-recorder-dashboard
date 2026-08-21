import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { readdirSync, statSync, existsSync } from 'fs';
import pool from '../database/db.ts';
import { setIO } from '../events.ts';
import path from 'path';

const app = express();
const httpServer = createServer(app);

const DASHBOARD_URL = process.env.DASHBOARD_URL?.trim();
const corsOrigin = DASHBOARD_URL || true;
const corsOptions = { origin: corsOrigin, credentials: true };
const io = new Server(httpServer, { cors: corsOptions });

setIO(io);

app.use(cors(corsOptions));
app.use(express.json());

function getFolderSizeBytes(folderPath: string): number {
  let total = 0;
  try {
    for (const entry of readdirSync(folderPath, { withFileTypes: true })) {
      const fullPath = path.join(folderPath, entry.name);
      total += entry.isDirectory() ? getFolderSizeBytes(fullPath) : statSync(fullPath).size;
    }
  } catch {}
  return total;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function findFile(rootPath: string, filename: string): string | null {
  if (!existsSync(rootPath)) return null;
  try {
    for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
      const fullPath = path.join(rootPath, entry.name);
      if (entry.isDirectory()) {
        const found = findFile(fullPath, filename);
        if (found) return found;
      } else if (entry.name === filename) {
        return fullPath;
      }
    }
  } catch {}
  return null;
}

const clipsPath = () => {
  const storage = process.env.STORAGE_PATH || './recordings';
  return path.join(path.dirname(path.resolve(storage)), 'clips');
};

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'wardizitto-recorder', timestamp: new Date().toISOString() });
});

// ─── Recordings ───────────────────────────────────────────────────────────────

app.get('/api/recordings', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM recordings ORDER BY date DESC');
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/recordings/file/:filename', (req, res) => {
  const storagePath = process.env.STORAGE_PATH || './recordings';
  const filename = path.basename(req.params.filename);
  const filePath = findFile(storagePath, filename);
  if (filePath) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// ─── Clips ────────────────────────────────────────────────────────────────────

app.get('/api/clips', (_req, res) => {
  const folder = clipsPath();
  if (!existsSync(folder)) return res.json([]);
  try {
    const files = readdirSync(folder)
      .filter(f => f.endsWith('.mp3'))
      .map(f => {
        const filePath = path.join(folder, f);
        const stat = statSync(filePath);
        return { filename: f, size: stat.size, date: stat.mtime.toISOString() };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(files);
  } catch {
    res.status(500).json({ error: 'Erro ao listar clips' });
  }
});

app.get('/api/clips/file/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(clipsPath(), filename);
  if (existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'Clip não encontrado' });
  }
});

// ─── Stats ────────────────────────────────────────────────────────────────────

app.get('/api/stats', async (_req, res) => {
  try {
    const [totalRecs]: any = await pool.query('SELECT COUNT(*) as count FROM recordings');

    // Conta participantes únicos extraindo o JSON de participants de cada gravação
    const [allRecs]: any = await pool.query('SELECT participants FROM recordings WHERE participants IS NOT NULL');
    const uniqueUsers = new Set<string>();
    for (const row of allRecs) {
      try {
        const ids = JSON.parse(row.participants);
        if (Array.isArray(ids)) ids.forEach((id: string) => uniqueUsers.add(id));
      } catch {}
    }

    const storagePath = process.env.STORAGE_PATH || './recordings';
    const recBytes  = getFolderSizeBytes(storagePath);
    const clipBytes = getFolderSizeBytes(clipsPath());

    res.json({
      totalRecordings: totalRecs[0].count,
      totalUsers: uniqueUsers.size,
      storageUsed: formatBytes(recBytes + clipBytes),
    });
  } catch {
    res.status(500).json({ error: 'Database error' });
  }
});

// ─── WebSocket ────────────────────────────────────────────────────────────────

io.on('connection', socket => {
  console.log('[ws] client conectado');
  socket.on('disconnect', () => console.log('[ws] client desconectado'));
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || '2312';

export const startServer = () => {
  httpServer.listen(Number(PORT), '0.0.0.0', () =>
    console.log(`🌐 Server na porta ${PORT}`)
  );
};