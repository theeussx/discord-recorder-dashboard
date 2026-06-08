import { createServerFn } from '@tanstack/react-start';
import type { Recording, Clip } from './mock-data';

// Toda a lógica de fetch fica DENTRO do handler — nunca vaza pro client bundle
// O .server.ts separado causava erro de Rollup ao tentar resolver o import

function getBotBase(): string {
  return (process.env.BOT_API_BASE ?? '').replace(/\/+$/, '');
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

export const getRecordingsFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<Recording[]> => {
    const data = await botFetch<any[]>('/recordings');
    if (!data) return [];
    return data.map(normalizeRecording);
  });

export const getClipsFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<Clip[]> => {
    const data = await botFetch<any[]>('/clips');
    if (!data) return [];
    return data.map(normalizeClip);
  });

export const getStatsFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const data = await botFetch<any>('/stats');
    return data ?? { totalRecordings: 0, totalUsers: 0, storageUsed: '—' };
  });

