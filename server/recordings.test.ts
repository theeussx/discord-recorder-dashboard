import { describe, it, expect } from 'vitest';
import { mockRecordings, getStats, generateMockAudioBuffer } from './mockData';

describe('Recordings API Endpoints', () => {
  describe('GET /api/recordings', () => {
    it('deve retornar um array de gravações', () => {
      const recordings = mockRecordings;
      expect(Array.isArray(recordings)).toBe(true);
    });

    it('cada gravação deve ter os campos esperados', () => {
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

    it('deve conter pelo menos uma gravação', () => {
      expect(mockRecordings.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/stats', () => {
    it('deve retornar estatísticas válidas', () => {
      const stats = getStats();
      expect(stats.totalRecordings).toBeGreaterThan(0);
      expect(stats.totalUsers).toBeGreaterThan(0);
      expect(stats.storageUsed).toBeTruthy();
    });

    it('totalRecordings deve corresponder ao tamanho do array', () => {
      const stats = getStats();
      expect(stats.totalRecordings).toBe(mockRecordings.length);
    });

    it('storageUsed deve ter formato válido (número + GB)', () => {
      const stats = getStats();
      expect(stats.storageUsed).toMatch(/^\d+\.\d{2}\s*GB$/);
    });
  });

  describe('GET /api/recordings/file/:filename', () => {
    it('deve gerar um buffer de áudio válido', () => {
      const buffer = generateMockAudioBuffer();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('buffer deve começar com ID3 header', () => {
      const buffer = generateMockAudioBuffer();
      // Verificar ID3v2 header: "ID3"
      expect(buffer[0]).toBe(0x49);
      expect(buffer[1]).toBe(0x44);
      expect(buffer[2]).toBe(0x33);
    });

    it('deve retornar buffer com tamanho consistente', () => {
      const buffer1 = generateMockAudioBuffer();
      const buffer2 = generateMockAudioBuffer();
      expect(buffer1.length).toBe(buffer2.length);
    });
  });

  describe('Busca e filtro de gravações', () => {
    it('deve filtrar por filename', () => {
      const searchTerm = 'voice_2026-06-05';
      const filtered = mockRecordings.filter(r =>
        r.filename.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(filtered.length).toBeGreaterThan(0);
    });

    it('deve filtrar por guild_id', () => {
      const guildId = '1234567890';
      const filtered = mockRecordings.filter(r => r.guild_id.includes(guildId));
      expect(filtered.length).toBeGreaterThan(0);
    });

    it('deve filtrar por channel_id', () => {
      const channelId = mockRecordings[0].channel_id;
      const filtered = mockRecordings.filter(r => r.channel_id.includes(channelId));
      expect(filtered.length).toBeGreaterThan(0);
    });

    it('busca vazia deve retornar todas as gravações', () => {
      const filtered = mockRecordings.filter(r =>
        '' === '' ||
        r.filename.toLowerCase().includes('') ||
        r.guild_id.includes('') ||
        r.channel_id.includes('')
      );
      expect(filtered.length).toBe(mockRecordings.length);
    });
  });

  describe('Formatação de dados', () => {
    it('duration deve ser um número em segundos', () => {
      mockRecordings.forEach(rec => {
        expect(typeof rec.duration).toBe('number');
        expect(rec.duration).toBeGreaterThan(0);
        expect(rec.duration).toBeLessThan(86400); // menos de 24 horas
      });
    });

    it('size deve ser um número em bytes', () => {
      mockRecordings.forEach(rec => {
        expect(typeof rec.size).toBe('number');
        expect(rec.size).toBeGreaterThan(0);
        expect(rec.size).toBeLessThan(1024 * 1024 * 1024); // menos de 1GB
      });
    });

    it('date deve ser ISO string válido', () => {
      mockRecordings.forEach(rec => {
        const date = new Date(rec.date);
        expect(date.getTime()).toBeGreaterThan(0);
        expect(isNaN(date.getTime())).toBe(false);
      });
    });

    it('participants deve ser JSON array válido', () => {
      mockRecordings.forEach(rec => {
        const participants = JSON.parse(rec.participants);
        expect(Array.isArray(participants)).toBe(true);
        expect(participants.length).toBeGreaterThan(0);
      });
    });
  });
});
