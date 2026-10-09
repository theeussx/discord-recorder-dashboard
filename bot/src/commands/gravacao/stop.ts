import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { DiscordBot } from '../../bot/client.ts';
import pool from '../../database/db.ts';
import path from 'node:path';
import { stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { getIO } from '../../events.ts';

export const command = {
  data: new SlashCommandBuilder().setName('parar').setDescription('Para a gravação e gera o arquivo único com a call inteira'),
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    const guildId = interaction.guildId;
    if (!guildId) return;
    const rec = client.activeRecordings.get(guildId);
    if (!rec) return interaction.reply({ content: '❌ Não há nenhuma gravação em andamento neste servidor.', ephemeral: true });
    await interaction.deferReply();
    try {
      const result = await client.recorder.stopSession(guildId);
      if (!existsSync(result.mixedMp3Path)) throw new Error('Arquivo final não encontrado.');
      const size = (await stat(result.mixedMp3Path)).size;
      if (size <= 0) throw new Error('Arquivo final vazio.');
      rec.connection.destroy();
      client.activeRecordings.delete(guildId);
      await pool.query(
        'INSERT INTO recordings (filename, duration, size, participants, guild_id, channel_id) VALUES (?, ?, ?, ?, ?, ?)',
        [path.basename(result.mixedMp3Path), result.duration, size, JSON.stringify(result.participants), guildId, rec.channelId]
      );
      const dur = `${Math.floor(result.duration / 60)}:${String(result.duration % 60).padStart(2, '0')}`;
      await interaction.editReply(`✅ Gravação encerrada e mixada!\n⏱️ Tempo da sessão: ${dur}\n📁 Arquivo salvo com ${(size / 1024 ** 2).toFixed(2)} MB.`);
      getIO()?.emit('recording:stop', { guildId });
    } catch (error) {
      console.error('[stop] error:', error instanceof Error ? error.message : error);
      client.activeRecordings.delete(guildId);
      rec.connection.destroy();
      await interaction.editReply('❌ Não foi possível finalizar a gravação. Nenhum registro foi salvo; tente iniciar uma nova sessão.');
    }
  },
};
