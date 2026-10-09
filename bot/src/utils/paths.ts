import fs from 'node:fs';
import path from 'node:path';
import { getClipsPath, getStoragePath } from './config.ts';

function isContained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export function resolveAuthorizedAudioPath(input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.includes('\0')) return null;
  const candidate = path.resolve(raw);
  const roots = [getStoragePath(), getClipsPath()].map(root => path.resolve(root));
  if (!roots.some(root => isContained(root, candidate))) return null;
  const extension = path.extname(candidate).toLowerCase();
  if (!['.mp3', '.wav', '.ogg', '.pcm'].includes(extension)) return null;
  return candidate;
}

export function resolveStoredFile(root: string, filename: string): string | null {
  if (!filename || filename !== path.basename(filename) || filename.includes('\0')) return null;
  const candidate = path.resolve(root, filename);
  if (!isContained(path.resolve(root), candidate)) return null;
  try {
    if (!fs.statSync(candidate).isFile()) return null;
  } catch {
    return null;
  }
  return candidate;
}
