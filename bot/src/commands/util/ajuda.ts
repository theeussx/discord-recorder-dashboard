import {
  SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ComponentType
} from 'discord.js';
import { DiscordBot } from '../../bot/client.ts';

const CATEGORY_LABELS: Record<string, { emoji: string; label: string }> = {
  gravacao: { emoji: '🎙️', label: 'Gravação' },
  util:     { emoji: '🛠️', label: 'Utilidades' },
};

export const command = {
  data: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Central de ajuda — lista todos os comandos disponíveis'),

  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    // Agrupa comandos por categoria
    const categories = new Map<string, { name: string; description: string }[]>();
    for (const cmd of client.commands.values()) {
      const cat = cmd.category ?? 'outros';
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat)!.push({
        name: cmd.data.name,
        description: cmd.data.description,
      });
    }

    const homeEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📖 Central de Ajuda')
      .setDescription('Selecione uma categoria no menu abaixo para ver os comandos disponíveis.')
      .addFields(
        ...[...categories.entries()].map(([cat, cmds]) => {
          const meta = CATEGORY_LABELS[cat] ?? { emoji: '📦', label: cat };
          return {
            name: `${meta.emoji} ${meta.label} (${cmds.length})`,
            value: cmds.map(c => `\`/${c.name}\``).join(' '),
            inline: false,
          };
        })
      )
      .setFooter({ text: `${client.commands.size} comandos disponíveis` })
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ajuda_category')
      .setPlaceholder('Selecione uma categoria...')
      .addOptions(
        ...[...categories.keys()].map(cat => {
          const meta = CATEGORY_LABELS[cat] ?? { emoji: '📦', label: cat };
          return new StringSelectMenuOptionBuilder()
            .setLabel(meta.label)
            .setValue(cat)
            .setEmoji(meta.emoji)
            .setDescription(`Ver comandos de ${meta.label}`);
        }),
        new StringSelectMenuOptionBuilder()
          .setLabel('Página inicial')
          .setValue('home')
          .setEmoji('🏠')
          .setDescription('Voltar ao menu principal')
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const msg = await interaction.reply({
      embeds: [homeEmbed],
      components: [row],
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120_000,
      filter: i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async i => {
      const selected = i.values[0];

      if (selected === 'home') {
        await i.update({ embeds: [homeEmbed], components: [row] });
        return;
      }

      const cmds = categories.get(selected) ?? [];
      const meta = CATEGORY_LABELS[selected] ?? { emoji: '📦', label: selected };

      const catEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`${meta.emoji} ${meta.label}`)
        .setDescription(
          cmds.map(c => `**\`/${c.name}\`**\n> ${c.description}`).join('\n\n') ||
          '_Nenhum comando nesta categoria._'
        )
        .setFooter({ text: 'Use /ajuda para voltar ao menu' })
        .setTimestamp();

      await i.update({ embeds: [catEmbed], components: [row] });
    });

    collector.on('end', () => {
      const disabled = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        selectMenu.setDisabled(true)
      );
      msg.edit({ components: [disabled] }).catch(() => {});
    });
  },
};
