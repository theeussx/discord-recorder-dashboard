import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { DiscordBot } from '../../bot/client.ts';
import pool from '../../database/db.ts';
import path from 'path';
import { getIO } from '../../events.ts';

export const command = {
  data: new SlashCommandBuilder()
    .setName('parar')
    .setDescription('Para a gravação e gera o arquivo único com a call inteira'),

  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const rec = client.activeRecordings.get(guildId);
    if (!rec) {
      return interaction.reply({ content: '❌ Não há nenhuma gravação em andamento neste servidor.', ephemeral: true });
    }

    await interaction.deferReply();

    try {
      const result = await client.recorder.stopSession(guildId);
      rec.connection.destroy();
      client.activeRecordings.delete(guildId);

      // Salva o arquivo único no banco de dados
      await pool.query(
        `INSERT INTO recordings (filename, duration, size, participants, guild_id, channel_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [path.basename(result.mixedMp3Path), result.duration, 0, JSON.stringify(result.participants), guildId, rec.channelId]
      );

      const dur = `${Math.floor(result.duration / 60)}:${String(result.duration % 60).padStart(2, '0')}`;

      await interaction.editReply(
        `✅ Gravação encerrada e mixada!\n` +
        `⏱️ Tempo da sessão: ${dur}\n` +
        `📁 Arquivo único gerado com sucesso na pasta da sessão.`
      );

      getIO()?.emit('recording:stop', { guildId });
    } catch (err) {
      console.error('[stop] error:', err);
      await interaction.editReply('❌ Erro ao encerrar a gravação.');
    }
  },
};
