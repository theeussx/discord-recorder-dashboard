import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} from "discord.js";

const pages = {
    home: {
        title: "📜 Central de Ajuda",
        text:
`Escolha uma categoria abaixo.

🏠 Teletransporte
💬 Comunicação
💰 Economia
🛡️ Terrenos
⚙️ Utilidades`,
    },

    tp: {
        title: "🏠 Teletransporte",
        text:
`• /spawn
• /sethome
• /home
• /warp
• /warp list
• /tpa
• /tpaccept
• /tpdeny`,
    },

    economy: {
        title: "💰 Economia",
        text:
`• /pay
• /worth
• /itemdb
• /kit
• /kit tools`,
    },

    chat: {
        title: "💬 Comunicação",
        text:
`• /msg
• /reply
• /mail
• /helpop
• /motd
• /rules
• /list`,
    },

    region: {
        title: "🛡️ Terrenos",
        text:
`• /rp create
• /rp delete
• /rp rename
• /rp list
• /rp near
• /rp addmember
• /rp removemember
• /rp addowner
• /rp removeowner
• /rp flag
• /rp infowand`,
    },

    misc: {
        title: "⚙️ Utilidades",
        text:
`• /depth
• /getpos
• /nightvision
• /time
• /weather
• /opengrave`,
    }
};

function buildPage(page: keyof typeof pages) {
    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${pages[page].title}`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(pages[page].text)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
        )
        .addActionRowComponents(
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("help_home")
                    .setLabel("🏠 Início")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("help_tp")
                    .setLabel("Teleporte")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("help_economy")
                    .setLabel("Economia")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("help_chat")
                    .setLabel("Chat")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("help_region")
                    .setLabel("Terrenos")
                    .setStyle(ButtonStyle.Danger),
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("help_misc")
                    .setLabel("Utilidades")
                    .setStyle(ButtonStyle.Secondary)
            )
        );
}

export default {
    data: new SlashCommandBuilder()
        .setName("ajuda_minecraft")
        .setDescription("Mostra os comandos do servidor"),

    async execute(interaction: ChatInputCommandInteraction) {

        const message = await interaction.reply({
            components: [buildPage("home")],
            flags: ["IsComponentsV2"],
            withResponse: true,
        });

        const collector = message.resource.message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000,
        });

        collector.on("collect", async i => {

            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: "Somente quem executou o comando pode usar este painel.",
                    ephemeral: true
                });
            }

            const page = i.customId.replace("help_", "") as keyof typeof pages;

            await i.update({
                components: [buildPage(page)]
            });

        });

    }
};