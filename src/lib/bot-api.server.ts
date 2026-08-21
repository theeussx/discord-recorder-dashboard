// Server-only — nunca vai pro bundle do client
import type { Recording, Clip } from './mock-data';

export interface BotStats {
  totalRecordings: number;
  totalUsers: number;
  storageUsed: string;
  totalClips?: number;
}

function getBotBase(): string | null {
  const base = process.env.BOT_API_BASE;
  return base ? base.replace(/\/+$/, '') : null;
}

async function botFetch<T>(path: string): Promise<T | null> {
  const base = getBotBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

// Normaliza o formato da API do bot para o formato do dashboard
function normalizeRecording(r: any, idx: number): Recording {
  let participants: string[] = [];
  try {
    participants = Array.isArray(r.participants)
      ? r.participants
      : JSON.parse(r.participants ?? '[]');
  } catch {}

  return {
    id: r.id ?? idx,
    filename: r.filename ?? '',
    date: r.date ?? new Date().toISOString(),
    duration: r.duration ?? 0,
    size: r.size ?? 0,
    participants,
    guildId: r.guild_id ?? r.guildId ?? '',
    channelId: r.channel_id ?? r.channelId ?? '',
    channelName: r.channel_id ?? r.channelId ?? 'Canal',
  };
}

function normalizeClip(c: any, idx: number): Clip {
  return {
    id: idx,
    filename: c.filename ?? '',
    size: c.size ?? 0,
    date: c.date ?? new Date().toISOString(),
    duration: c.duration ?? 0,
    sourceRecording: c.sourceRecording,
  };
}

export async function fetchRecordings(): Promise<Recording[]> {
  const data = await botFetch<any[]>('/api/recordings');
  if (!data) return [];
  return data.map(normalizeRecording);
}

export async function fetchClips(): Promise<Clip[]> {
  const data = await botFetch<any[]>('/api/clips');
  if (!data) return [];
  return data.map(normalizeClip);
}

export async function fetchStats(): Promise<BotStats> {
  const data = await botFetch<BotStats>('/api/stats');
  return data ?? { totalRecordings: 0, totalUsers: 0, storageUsed: '—' };
}

export function getFileUrl(type: 'recordings' | 'clips', filename: string): string {
  const base = getBotBase();
  if (!base) return '';
  return `${base}/api/${type}/file/${encodeURIComponent(filename)}`;
                   }

