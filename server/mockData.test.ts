import { describe, it, expect } from 'vitest';
import { mockRecordings, getStats, generateMockAudioBuffer } from './mockData';

describe('mockData', () => {
  describe('mockRecordings', () => {
    it('deve conter pelo menos 8 gravações', () => {
      expect(mockRecordings.length).toBeGreaterThanOrEqual(8);
    });

    it('cada gravação deve ter todos os campos obrigatórios', () => {
      mockRecordings.forEach(rec => {
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('filename');
        expect(rec).toHaveProperty('date');
        expect(rec).toHaveProperty('duration');
        expect(rec).toHaveProperty('size');
        expect(rec).toHaveProperty('participants');
        expect(rec).toHaveProperty('guild_id');
        expect(rec).toHaveProperty('channel_id');
      });
    });

    it('cada gravação deve ter ID único', () => {
      const ids = mockRecordings.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('cada gravação deve ter filename válido', () => {
      mockRecordings.forEach(rec => {
        expect(rec.filename).toMatch(/\.mp3$/);
        expect(rec.filename).toContain('voice_');
      });
    });

    it('cada gravação deve ter data em formato ISO', () => {
      mockRecordings.forEach(rec => {
        const date = new Date(rec.date);
        expect(date.getTime()).toBeGreaterThan(0);
        expect(rec.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
    });

    it('cada gravação deve ter duração positiva', () => {
      mockRecordings.forEach(rec => {
        expect(rec.duration).toBeGreaterThan(0);
        expect(typeof rec.duration).toBe('number');
      });
    });

    it('cada gravação deve ter size positivo', () => {
      mockRecordings.forEach(rec => {
        expect(rec.size).toBeGreaterThan(0);
        expect(typeof rec.size).toBe('number');
      });
    });

    it('participants deve ser JSON válido com array de strings', () => {
      mockRecordings.forEach(rec => {
        const participants = JSON.parse(rec.participants);
        expect(Array.isArray(participants)).toBe(true);
        expect(participants.length).toBeGreaterThan(0);
        participants.forEach(p => {
          expect(typeof p).toBe('string');
        });
      });
    });

    it('guild_id e channel_id devem ser strings não vazias', () => {
      mockRecordings.forEach(rec => {
        expect(typeof rec.guild_id).toBe('string');
        expect(typeof rec.channel_id).toBe('string');
        expect(rec.guild_id.length).toBeGreaterThan(0);
        expect(rec.channel_id.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getStats', () => {
    it('deve retornar objeto com totalRecordings, totalUsers e storageUsed', () => {
      const stats = getStats();
      expect(stats).toHaveProperty('totalRecordings');
      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('storageUsed');
    });

    it('totalRecordings deve ser igual ao número de gravações mock', () => {
      const stats = getStats();
      expect(stats.totalRecordings).toBe(mockRecordings.length);
    });

    it('totalUsers deve ser maior que 0', () => {
      const stats = getStats();
      expect(stats.totalUsers).toBeGreaterThan(0);
    });

    it('storageUsed deve conter "GB"', () => {
      const stats = getStats();
      expect(stats.storageUsed).toContain('GB');
    });

    it('storageUsed deve ser um número válido em GB', () => {
      const stats = getStats();
      const match = stats.storageUsed.match(/^([\d.]+)\s*GB$/);
      expect(match).not.toBeNull();
      if (match) {
        const gb = parseFloat(match[1]);
        expect(gb).toBeGreaterThan(0);
      }
    });

    it('totalUsers deve ser menor ou igual ao total de participantes únicos', () => {
      const stats = getStats();
      const allParticipants = new Set<string>();
      mockRecordings.forEach(rec => {
        try {
          const participants = JSON.parse(rec.participants);
          if (Array.isArray(participants)) {
            participants.forEach((p: string) => allParticipants.add(p));
          }
        } catch {
          // ignore
        }
      });
      expect(stats.totalUsers).toBeLessThanOrEqual(allParticipants.size);
    });
  });

  describe('generateMockAudioBuffer', () => {
    it('deve retornar um Buffer', () => {
      const buffer = generateMockAudioBuffer();
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('deve retornar um buffer com tamanho razoável', () => {
      const buffer = generateMockAudioBuffer();
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer.length).toBeLessThan(1024 * 1024); // menos de 1MB
    });

    it('deve começar com ID3 header', () => {
      const buffer = generateMockAudioBuffer();
      expect(buffer[0]).toBe(0x49); // 'I'
      expect(buffer[1]).toBe(0x44); // 'D'
      expect(buffer[2]).toBe(0x33); // '3'
    });
  });
});
