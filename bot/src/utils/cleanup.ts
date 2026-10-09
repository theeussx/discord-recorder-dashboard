import cron from 'node-cron';
import fs from 'node:fs';
import path from 'node:path';
import { DiscordBot } from '../bot/client.ts';
import { getStorageConfig, getStoragePath } from './config.ts';

export interface CleanupFile {
  path: string;
  size: number;
  mtimeMs: number;
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export function getFolderSize(dirPath: string): number {
  let total = 0;
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dirPath, { withFileTypes: true }); } catch { return 0; }
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    try {
      total += entry.isDirectory() ? getFolderSize(full) : fs.statSync(full).size;
    } catch (error) {
      console.warn(`[Cleanup] Não foi possível ler ${entry.name}; nenhum arquivo será removido por essa leitura.`, error instanceof Error ? error.message : 'erro desconhecido');
    }
  }
  return total;
}

export function listCleanupFiles(root: string, protectedPaths = new Set<string>()): CleanupFile[] {
  const files: CleanupFile[] = [];
  const rootResolved = path.resolve(root);
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.resolve(dir, entry.name);
      if (!isInside(rootResolved, full)) continue;
      if (entry.isDirectory()) walk(full);
      else {
        try {
          const stat = fs.statSync(full);
          if (![...protectedPaths].some(active => isInside(path.resolve(active), full))) {
            files.push({ path: full, size: stat.size, mtimeMs: stat.mtimeMs });
          }
        } catch { /* arquivo pode ter sido removido durante a varredura */ }
      }
    }
  };
  walk(rootResolved);
  return files.sort((a, b) => a.mtimeMs - b.mtimeMs);
}

export function selectFilesForLimit(files: CleanupFile[], currentBytes: number, limitBytes: number): CleanupFile[] {
  if (!Number.isFinite(limitBytes) || limitBytes <= 0 || currentBytes <= limitBytes) return [];
  const selected: CleanupFile[] = [];
  let remaining = currentBytes;
  for (const file of files) {
    if (remaining <= limitBytes) break;
    selected.push(file);
    remaining -= file.size;
  }
  return selected;
}

function activeProtectedPaths(client: DiscordBot): Set<string> {
  const paths = new Set<string>();
  for (const session of client.recorder.sessions.values()) {
    paths.add(session.folderPath);
  }
  return paths;
}

async function runCleanup(client: DiscordBot): Promise<void> {
  const storagePath = getStoragePath();
  const { valid, maxStorageBytes, maxStorageGb, autoDeleteDays } = getStorageConfig();
  if (!valid) {
    console.error('[Cleanup] MAX_STORAGE_GB ou AUTO_DELETE_DAYS inválido; limpeza desativada por segurança.');
    return;
  }
  const currentBytes = getFolderSize(storagePath);
  if (currentBytes === 0) return;

  const protectedPaths = activeProtectedPaths(client);
  const files = listCleanupFiles(storagePath, protectedPaths);
  const now = Date.now();
  const retentionCutoff = now - autoDeleteDays * 24 * 60 * 60 * 1000;
  const oldFiles = files.filter(file => file.mtimeMs < retentionCutoff);
  const overLimit = selectFilesForLimit(files, currentBytes, maxStorageBytes);
  const candidates = [...new Map([...oldFiles, ...overLimit].map(file => [file.path, file])).values()]
    .sort((a, b) => a.mtimeMs - b.mtimeMs);
  const toDelete = new Set(candidates.map(file => file.path));
  if (currentBytes > maxStorageBytes) {
    for (const file of selectFilesForLimit(files, currentBytes, maxStorageBytes)) toDelete.add(file.path);
  }

  if (toDelete.size === 0) return;
  let deletedBytes = 0;
  for (const file of files) {
    if (!toDelete.has(file.path)) continue;
    try {
      fs.unlinkSync(file.path);
      deletedBytes += file.size;
      console.log(`[Cleanup] Arquivo removido: ${path.relative(storagePath, file.path)}`);
    } catch (error) {
      console.error(`[Cleanup] Falha ao remover arquivo: ${path.relative(storagePath, file.path)}`, error instanceof Error ? error.message : error);
    }
  }
  console.log(`[Cleanup] Removidos ${(deletedBytes / 1024 ** 2).toFixed(1)} MB; limite configurado: ${maxStorageGb} GB; retenção: ${autoDeleteDays} dias.`);
}

export function startCleanupJob(client: DiscordBot) {
  let running = false;
  cron.schedule('*/5 * * * *', async () => {
    if (running) return;
    running = true;
    try { await runCleanup(client); }
    catch (error) { console.error('[Cleanup] Falha inesperada; nenhum reset destrutivo será executado.', error); }
    finally { running = false; }
  });
}
