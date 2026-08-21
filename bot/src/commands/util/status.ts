import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DiscordBot } from '../../bot/client.ts';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import { existsSync } from 'fs';

function getFolderSize(dir: string): number {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? getFolderSize(full) : statSync(full).size;
  }
  return total;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

export const command = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Mostra o status atual do sistema de gravação'),

  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    const guildId = interaction.guildId!;
    const activeRec = client.activeRecordings.get(guildId);
    const session = client.recorder.sessions.get(guildId);

    const storagePath = path.resolve(process.env.STORAGE_PATH || './recordings');
    const clipsPath   = path.join(path.dirname(storagePath), 'clips');

    const recBytes  = getFolderSize(storagePath);
    const clipBytes = getFolderSize(clipsPath);

    // Conta arquivos MP3 em recordings
    let recCount = 0;
    const countMp3 = (dir: string) => {
      if (!existsSync(dir)) return;
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) countMp3(path.join(dir, e.name));
        else if (e.name.endsWith('.mp3')) recCount++;
      }
    };
    countMp3(storagePath);

    let clipCount = 0;
    if (existsSync(clipsPath)) {
      clipCount = readdirSync(clipsPath).filter(f => f.endsWith('.mp3')).length;
    }

    const isRecording = !!activeRec && !!session;
    let sessionInfo = '—';
    if (isRecording && session) {
      const secs  = Math.floor((Date.now() - session.startTime) / 1000);
      const m     = Math.floor(secs / 60);
      const s     = secs % 60;
      const users = session.users.size;
      sessionInfo = `${m}m ${s}s | ${users} usuário(s) falando`;
    }

    const embed = new EmbedBuilder()
      .setColor(isRecording ? 0xED4245 : 0x57F287)
      .setTitle(`${isRecording ? '🔴 Gravando agora' : '⚪ Sem gravação ativa'}`)
      .addFields(
        { name: '🎙️ Sessão atual',   value: sessionInfo,              inline: false },
        { name: '📁 Gravações',       value: `${recCount} arquivo(s)`, inline: true  },
        { name: '✂️ Clips',           value: `${clipCount} clip(s)`,   inline: true  },
        { name: '💾 Recordings',      value: formatBytes(recBytes),    inline: true  },
        { name: '💾 Clips',           value: formatBytes(clipBytes),   inline: true  },
        { name: '📊 Total em disco',  value: formatBytes(recBytes + clipBytes), inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `Solicitado por ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
