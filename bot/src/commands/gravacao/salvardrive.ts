import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { uploadToDrive } from '../../utils/drive.ts';
import path from 'path';
import { existsSync } from 'fs';

export const command = {
  data: new SlashCommandBuilder()
    .setName('salvardrive')
    .setDescription('Salva um arquivo de áudio permanentemente no Google Drive')
    .addStringOption(option =>
      option.setName('caminho')
        .setDescription('Caminho do arquivo na host (ex: recordings/guildId/Data/session/tracks/nome.mp3)')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const caminhoRelativo = interaction.options.getString('caminho')!;
    const filePath = path.resolve(caminhoRelativo);

    if (!existsSync(filePath)) {
      return interaction.reply({ content: '❌ Arquivo não encontrado na host. Tem certeza do caminho?', ephemeral: true });
    }

    await interaction.deferReply();

    const link = await uploadToDrive(filePath);

    if (link) {
      await interaction.editReply(`☁️ Sucesso! O arquivo foi blindado no Google Drive:\n${link}`);
    } else {
      await interaction.editReply('❌ Falha ao tentar fazer o upload para o Drive.');
    }
  },
};
