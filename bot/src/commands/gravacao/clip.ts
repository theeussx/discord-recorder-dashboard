import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder } from 'discord.js';
import { DiscordBot } from '../../bot/client.ts';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { stat } from 'fs/promises';

const MAX_DISCORD_BYTES = 24 * 1024 * 1024; // 24MB — margem segura abaixo do limite de 25MB

export const command = {
  data: new SlashCommandBuilder()
    .setName('clip')
    .setDescription('Cria um clip dos últimos minutos da call')
    .addIntegerOption(option =>
      option.setName('minutos')
        .setDescription('Quantos minutos para trás clipar (1-10)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10)
    )
    .addStringOption(option =>
      option.setName('nome')
        .setDescription('Nome opcional para o arquivo do clip')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const rec = client.activeRecordings.get(guildId);
    if (!rec) {
      return interaction.reply({ content: '❌ Não há nenhuma gravação em andamento neste servidor.', ephemeral: true });
    }

    const minutos = interaction.options.getInteger('minutos')!;
    const nomeSugerido = interaction.options.getString('nome');

    await interaction.deferReply();

    try {
      const sessionInfo = client.recorder.getSessionInfo(guildId);
      if (!sessionInfo) {
        return interaction.editReply('❌ Sessão não encontrada.');
      }

      const { tracksPath, startTime } = sessionInfo;
      const now = Date.now();
      const sessionDurationSecs = (now - startTime) / 1000;

      if (sessionDurationSecs < 5) {
        return interaction.editReply('❌ A gravação acabou de começar, espere um pouco mais para clipar.');
      }

      // Fix 5: usa apenas os PCMs finalizados (streams fechadas) — exclui
      // arquivos de usuários ainda falando (incompletos/corrompidos)
      const finishedPcms = client.recorder.getFinishedPcms(guildId);

      // Também inclui PCMs de usuários que já terminaram de falar mas ainda
      // podem estar no tracksPath (sessões anteriores na mesma call)
      const allPcmsInFolder = existsSync(tracksPath)
        ? readdirSync(tracksPath)
            .filter(f => f.endsWith('.pcm'))
            .map(f => path.join(tracksPath, f))
        : [];

      // União: finishedPcms + arquivos da pasta que não estão em uso
      const activePcms = new Set(
        [...client.recorder.sessions.values()]
          .flatMap(s => [...s.users.values()])
          .map(u => u.pcmPath)
      );
      const safePcms = [
        ...new Set([
          ...finishedPcms,
          ...allPcmsInFolder.filter(p => !activePcms.has(p)),
        ])
      ].filter(f => existsSync(f));

      if (safePcms.length === 0) {
        return interaction.editReply('❌ Nenhum áudio gravado ainda. Alguém precisa falar primeiro!');
      }

      const clipDurationSecs = minutos * 60;
      const startSec = Math.max(0, sessionDurationSecs - clipDurationSecs);
      const actualDurationSecs = sessionDurationSecs - startSec;

      const clipsFolder = path.resolve('./clips');
      if (!existsSync(clipsFolder)) mkdirSync(clipsFolder, { recursive: true });

      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = nomeSugerido
        ? `${nomeSugerido.replace(/[^a-z0-9]/gi, '_')}.mp3`
        : `clip-${minutos}min-${ts}.mp3`;
      const outputPath = path.join(clipsFolder, fileName);

      // Fix 6: complexFilter correto com labels explícitos para chain amix→trim
      await new Promise<void>((resolve, reject) => {
        const cmd = ffmpeg();
        safePcms.forEach(f => {
          cmd.input(f).inputFormat('s16le').inputOptions(['-ar 48000', '-ac 2']);
        });

        const n = safePcms.length;
        // Cada faixa PCM já tem silêncio de offset injetado pelo recorder,
        // então o amix produz a linha do tempo correta sem adelay adicional
        const mixFilter   = `amix=inputs=${n}:duration=longest:normalize=0[mixed]`;
        const normFilter  = `[mixed]dynaudnorm=f=200:g=15[normed]`;
        const trimFilter  = `[normed]atrim=start=${startSec.toFixed(3)}:duration=${actualDurationSecs.toFixed(3)}[trimmed]`;
        const ptsFilter   = `[trimmed]asetpts=PTS-STARTPTS[out]`;

        cmd
          .complexFilter([mixFilter, normFilter, trimFilter, ptsFilter], 'out')
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .on('end', () => resolve())
          .on('error', (err: Error) => {
            console.error('[clip] ffmpeg error:', err.message);
            reject(err);
          })
          .save(outputPath);
      });

      if (!existsSync(outputPath)) {
        return interaction.editReply('❌ O arquivo do clip não foi gerado corretamente.');
      }

      const mins = Math.floor(actualDurationSecs / 60);
      const secs = Math.floor(actualDurationSecs % 60);
      const durStr = `${mins}m ${secs}s`;

      // Fix 7: verifica tamanho antes de tentar enviar pelo Discord
      const fileSize = (await stat(outputPath)).size;

      if (fileSize <= MAX_DISCORD_BYTES) {
        const attachment = new AttachmentBuilder(outputPath, { name: fileName });
        await interaction.editReply({
          content: `🎬 Clip de **${durStr}** gerado! Salvo em \`clips/${fileName}\`.`,
          files: [attachment],
        });
      } else {
        // Arquivo grande demais para o Discord — só avisa o caminho
        const sizeMb = (fileSize / 1024 / 1024).toFixed(1);
        await interaction.editReply(
          `🎬 Clip de **${durStr}** gerado com sucesso!\n` +
          `📁 Salvo em \`clips/${fileName}\`\n` +
          `⚠️ Arquivo com **${sizeMb}MB** — grande demais para enviar pelo Discord. Use o dashboard ou \`/salvardrive\` para acessá-lo.`
        );
      }
    } catch (err: any) {
      console.error('[clip] error:', err);
      await interaction.editReply(`❌ Ocorreu um erro: ${err.message}`);
    }
  },
};
