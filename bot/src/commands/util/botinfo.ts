import {
  SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType
} from 'discord.js';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../../../package.json') as { version: string; dependencies: Record<string, string> };

export const command = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Exibe informações detalhadas sobre o bot'),

  async execute(interaction: ChatInputCommandInteraction) {
    const bot = interaction.client;

    const buildEmbeds = () => {
      const uptimeSecs = Math.floor((bot.uptime ?? 0) / 1000);
      const d = Math.floor(uptimeSecs / 86400);
      const h = Math.floor((uptimeSecs % 86400) / 3600);
      const m = Math.floor((uptimeSecs % 3600) / 60);
      const s = uptimeSecs % 60;
      const uptimeStr = [
        d > 0 ? `${d}d` : '',
        h > 0 ? `${h}h` : '',
        m > 0 ? `${m}m` : '',
        `${s}s`,
      ].filter(Boolean).join(' ');

      const heapMB  = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
      const totalMB = (os.totalmem() / 1024 / 1024).toFixed(0);
      const freeMB  = (os.freemem() / 1024 / 1024).toFixed(0);

      let totalUsers = 0;
      bot.guilds.cache.forEach(g => (totalUsers += g.memberCount));

      const footer = { text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() };

      const embed1 = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🤖 Informações do Bot — Página 1/3')
        .setThumbnail(bot.user!.displayAvatarURL())
        .addFields(
          { name: '📛 Nome',        value: `**${bot.user!.username}**`, inline: true },
          { name: '🆔 ID',          value: `\`${bot.user!.id}\``,       inline: true },
          { name: '📦 Versão',      value: `v${pkg.version}`,           inline: true },
          { name: '⏱️ Uptime',      value: uptimeStr,                   inline: true },
          { name: '🏠 Servidores',  value: `${bot.guilds.cache.size}`,  inline: true },
          { name: '👥 Usuários',    value: totalUsers.toLocaleString(), inline: true },
          { name: '📢 Canais',      value: `${bot.channels.cache.size}`, inline: true },
          { name: '📅 Criado em',   value: `<t:${Math.floor(bot.user!.createdTimestamp / 1000)}:D>`, inline: true },
        )
        .setFooter(footer)
        .setTimestamp();

      const embed2 = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('💻 Recursos do Sistema — Página 2/3')
        .setThumbnail(bot.user!.displayAvatarURL())
        .addFields(
          { name: '📡 Ping API',    value: `\`${Math.round(bot.ws.ping)}ms\``,      inline: true },
          { name: '🧠 Heap usado',  value: `\`${heapMB} MB\``,                       inline: true },
          { name: '💾 RAM total',   value: `\`${totalMB} MB\``,                      inline: true },
          { name: '💾 RAM livre',   value: `\`${freeMB} MB\``,                       inline: true },
          { name: '🖥️ CPU',         value: os.cpus()[0]?.model ?? 'N/A',             inline: false },
          { name: '⚙️ Cores',       value: `${os.cpus().length}`,                    inline: true },
          { name: '🐧 SO',          value: os.platform(),                            inline: true },
        )
        .setFooter(footer)
        .setTimestamp();

      const embed3 = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🛠️ Stack Técnica — Página 3/3')
        .addFields(
          { name: '🟢 Node.js',     value: process.version,                          inline: true },
          { name: '📘 Discord.js',  value: pkg.dependencies['discord.js'] ?? '?',   inline: true },
          { name: '⏳ Uptime proc', value: `${process.uptime().toFixed(0)}s`,        inline: true },
          { name: '📌 Ambiente',    value: process.env.NODE_ENV ?? 'production',     inline: true },
        )
        .setFooter(footer)
        .setTimestamp();

      return [embed1, embed2, embed3];
    };

    const embeds = buildEmbeds();
    let page = 0;

    const buildRow = (p: number) =>
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('bi_prev')
          .setLabel('Anterior')
          .setEmoji('⬅️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(p === 0),
        new ButtonBuilder()
          .setCustomId('bi_next')
          .setLabel('Próxima')
          .setEmoji('➡️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(p === embeds.length - 1),
      );

    const msg = await interaction.reply({
      embeds: [embeds[page]],
      components: [buildRow(page)],
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000,
      filter: i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async i => {
      if (i.customId === 'bi_prev' && page > 0) page--;
      if (i.customId === 'bi_next' && page < embeds.length - 1) page++;
      await i.update({ embeds: [embeds[page]], components: [buildRow(page)] });
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('bi_prev').setLabel('Anterior').setEmoji('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('bi_next').setLabel('Próxima').setEmoji('➡️').setStyle(ButtonStyle.Primary).setDisabled(true),
      );
      msg.edit({ components: [disabledRow] }).catch(() => {});
    });
  },
};
