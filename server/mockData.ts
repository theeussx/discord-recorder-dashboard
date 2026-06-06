interface Recording {
  id: number;
  filename: string;
  date: string;
  duration: number;
  size: number;
  participants: string;
  guild_id: string;
  channel_id: string;
}

// Dados mock realistas com todos os campos
export const mockRecordings: Recording[] = [
  {
    id: 1,
    filename: 'voice_2026-06-05_14-32-18.mp3',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    duration: 1245,
    size: 15728640,
    participants: JSON.stringify(['user_123', 'user_456', 'user_789']),
    guild_id: '1234567890',
    channel_id: '9876543210',
  },
  {
    id: 2,
    filename: 'voice_2026-06-05_13-15-42.mp3',
    date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    duration: 2847,
    size: 35651584,
    participants: JSON.stringify(['user_111', 'user_222', 'user_333', 'user_444']),
    guild_id: '1234567890',
    channel_id: '1111111111',
  },
  {
    id: 3,
    filename: 'voice_2026-06-05_11-08-55.mp3',
    date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    duration: 892,
    size: 11010048,
    participants: JSON.stringify(['user_555', 'user_666']),
    guild_id: '9876543210',
    channel_id: '2222222222',
  },
  {
    id: 4,
    filename: 'voice_2026-06-04_22-45-30.mp3',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    duration: 3600,
    size: 44564480,
    participants: JSON.stringify(['user_777', 'user_888', 'user_999', 'user_101', 'user_102']),
    guild_id: '5555555555',
    channel_id: '3333333333',
  },
  {
    id: 5,
    filename: 'voice_2026-06-04_18-22-10.mp3',
    date: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    duration: 1567,
    size: 19660800,
    participants: JSON.stringify(['user_103', 'user_104', 'user_105']),
    guild_id: '1234567890',
    channel_id: '4444444444',
  },
  {
    id: 6,
    filename: 'voice_2026-06-03_20-10-45.mp3',
    date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    duration: 2134,
    size: 26738688,
    participants: JSON.stringify(['user_106', 'user_107', 'user_108', 'user_109']),
    guild_id: '7777777777',
    channel_id: '5555555555',
  },
  {
    id: 7,
    filename: 'voice_2026-06-03_15-33-22.mp3',
    date: new Date(Date.now() - 54 * 60 * 60 * 1000).toISOString(),
    duration: 945,
    size: 11796480,
    participants: JSON.stringify(['user_110', 'user_111']),
    guild_id: '9876543210',
    channel_id: '6666666666',
  },
  {
    id: 8,
    filename: 'voice_2026-06-02_19-47-58.mp3',
    date: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    duration: 2456,
    size: 30777344,
    participants: JSON.stringify(['user_112', 'user_113', 'user_114', 'user_115', 'user_116']),
    guild_id: '3333333333',
    channel_id: '7777777777',
  },
];

export function getStats() {
  const uniqueUsers = new Set<string>();
  let totalSize = 0;

  mockRecordings.forEach(rec => {
    try {
      const participants = JSON.parse(rec.participants);
      if (Array.isArray(participants)) {
        participants.forEach((user: string) => uniqueUsers.add(user));
      }
    } catch {
      // ignore parse errors
    }
    totalSize += rec.size;
  });

  const sizeInGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);

  return {
    totalRecordings: mockRecordings.length,
    totalUsers: uniqueUsers.size,
    storageUsed: `${sizeInGB} GB`,
  };
}

// Gerar arquivo de áudio mock (MP3 mínimo válido)
export function generateMockAudioBuffer(): Buffer {
  // ID3v2 header + minimal MP3 frame
  // Este é um arquivo MP3 mínimo que pode ser reproduzido
  const id3Header = Buffer.from([
    0x49, 0x44, 0x33, // "ID3"
    0x04, 0x00, // version
    0x00, // flags
    0x00, 0x00, 0x00, 0x00, // size
  ]);

  // MP3 frame header (MPEG Layer III, 128 kbps, 44.1 kHz)
  const mp3Frame = Buffer.from([
    0xFF, 0xFB, // frame sync + MPEG version
    0x10, 0x00, // bitrate + sample rate
    0x00, 0x00, 0x00, 0x00,
  ]);

  // Repetir frames para criar um arquivo de tamanho razoável
  const frames = Buffer.alloc(1024 * 100); // ~100KB
  for (let i = 0; i < frames.length; i += 8) {
    mp3Frame.copy(frames, i);
  }

  return Buffer.concat([id3Header, frames]);
}
