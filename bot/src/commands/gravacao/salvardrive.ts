import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { uploadToDrive } from '../../utils/drive.ts';
import { resolveAuthorizedAudioPath } from '../../utils/paths.ts';
import { existsSync } from 'node:fs';

export const command = {
  data: new SlashCommandBuilder()
    .setName('salvardrive')
    .setDescription('Salva um arquivo de áudio autorizado no Google Drive')
    .addStringOption(option => option.setName('caminho').setDescription('Caminho de um áudio dentro de recordings ou clips').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member;
    const permissions = member && typeof member === 'object' && 'permissions' in member ? member.permissions : null;
    const canManage = permissions && typeof permissions !== 'string' && permissions.has(PermissionFlagsBits.ManageGuild);
    if (!canManage) {
      return interaction.reply({ content: '❌ Você não tem permissão para enviar arquivos ao Drive.', ephemeral: true });
    }
    const input = interaction.options.getString('caminho')!;
    const filePath = resolveAuthorizedAudioPath(input);
    if (!filePath || !existsSync(filePath)) return interaction.reply({ content: '❌ Informe um arquivo de áudio existente dentro de recordings ou clips.', ephemeral: true });
    await interaction.deferReply();
    try {
      const link = await uploadToDrive(filePath);
      if (link) return interaction.editReply(`☁️ Upload concluído com segurança.\n${link}`);
      return interaction.editReply('❌ Falha ao tentar fazer o upload para o Drive.');
    } catch (error) {
      console.error('[salvardrive] upload error:', error instanceof Error ? error.message : error);
      return interaction.editReply('❌ Falha ao tentar fazer o upload para o Drive.');
    }
  },
};
