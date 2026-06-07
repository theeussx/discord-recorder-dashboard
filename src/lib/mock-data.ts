export interface Recording {
  id: number;
  filename: string;
  date: string;
  duration: number;
  size: number;
  participants: string[];
  guildId: string;
  channelId: string;
  channelName: string;
}

export interface Clip {
  id: number;
  filename: string;
  size: number;
  date: string;
  sourceRecording?: string;
  duration: number;
}

export interface Stats {
  totalRecordings: number;
  totalUsers: number;
  totalClips: number;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  uptimeHours: number;
}

const NAMES = [
  "theeussx",
  "joaopedro",
  "marina",
  "lucas.gg",
  "felipemvp",
  "carla.dev",
  "rafa_bot",
  "gabi",
  "henrique",
  "bia.s",
  "andre.k",
  "leo",
];

function pickParticipants(n: number): string[] {
  const shuffled = [...NAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function daysAgo(d: number, h = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(date.getHours() - h);
  return date.toISOString();
}

const CHANNELS = [
  { id: "847291029384756123", name: "Sala de Jogos" },
  { id: "947182039482710334", name: "Reunião Semanal" },
  { id: "748192038475612933", name: "Geral" },
  { id: "382910384756123847", name: "Estúdio" },
  { id: "192038475612938475", name: "Café com Time" },
];

const GUILDS = ["Wardizitto", "Squad Noturno", "Dev House"];

export const mockRecordings: Recording[] = Array.from({ length: 14 }).map((_, i) => {
  const ch = CHANNELS[i % CHANNELS.length];
  return {
    id: i + 1,
    filename: `rec_${ch.name.toLowerCase().replace(/\s+/g, "-")}_${1000 + i}.mp3`,
    date: daysAgo(Math.floor(i / 2), i * 3),
    duration: 60 + Math.floor(Math.random() * 5400),
    size: Math.floor((1 + Math.random() * 120) * 1024 * 1024),
    participants: pickParticipants(2 + Math.floor(Math.random() * 6)),
    guildId: GUILDS[i % GUILDS.length],
    channelId: ch.id,
    channelName: ch.name,
  };
});

export const mockClips: Clip[] = Array.from({ length: 9 }).map((_, i) => ({
  id: i + 1,
  filename: `clip_${["highlight", "momento", "risada", "play", "destaque"][i % 5]}_${200 + i}.mp3`,
  size: Math.floor((0.5 + Math.random() * 12) * 1024 * 1024),
  date: daysAgo(Math.floor(i / 2), i * 5),
  sourceRecording: mockRecordings[i % mockRecordings.length]?.filename,
  duration: 8 + Math.floor(Math.random() * 90),
}));

export const mockStats: Stats = {
  totalRecordings: mockRecordings.length,
  totalUsers: new Set(mockRecordings.flatMap((r) => r.participants)).size,
  totalClips: mockClips.length,
  storageUsedBytes:
    mockRecordings.reduce((a, r) => a + r.size, 0) +
    mockClips.reduce((a, c) => a + c.size, 0),
  storageQuotaBytes: 5 * 1024 ** 3,
  uptimeHours: 312,
};
