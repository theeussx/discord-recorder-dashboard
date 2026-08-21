import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export const command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica a latência do bot e da API'),

  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.reply({ content: '🏓 Calculando...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiPing = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setColor(latency < 100 ? 0x57F287 : latency < 200 ? 0xFEE75C : 0xED4245)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '📡 Latência', value: `\`${latency}ms\``, inline: true },
        { name: '💙 API Discord', value: `\`${apiPing}ms\``, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] });
  },
};
