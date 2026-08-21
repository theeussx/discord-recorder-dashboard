import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { VoiceRecorder } from '../voice/recorder.ts';
import { DiscordBot } from '../bot/client.ts';
import { joinVoiceChannel, VoiceConnectionStatus, entersState } from '@discordjs/voice';
import { getIO } from '../events.ts';

const MAX_SIZE_BYTES = 3 * 1024 * 1024 * 1024; // 3GB

// Apaga tudo dentro de um diretório mas mantém a pasta raiz
function nukeDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) return;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(full, { recursive: true, force: true });
    } else {
      try { fs.unlinkSync(full); } catch {}
    }
  }
}

function getFolderSize(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    try {
      total += entry.isDirectory()
        ? getFolderSize(full)
        : fs.statSync(full).size;
    } catch {}
  }
  return total;
}

async function restartRecording(client: DiscordBot, guildId: string) {
  const rec = client.activeRecordings.get(guildId);
  if (!rec) return;

  const { connection, channelId } = rec;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const voiceChannel = guild.channels.cache.get(channelId);
  if (!voiceChannel?.isVoiceBased()) return;

  // Para a sessão atual sem gerar mix (dados vão ser apagados mesmo)
  try {
    await client.recorder.stopSession(guildId);
  } catch {}
  connection.destroy();
  client.activeRecordings.delete(guildId);

  // Apaga recordings
  const storagePath = path.resolve(process.env.STORAGE_PATH || './recordings');
  nukeDirectory(storagePath);
  console.log('🗑️ [Cleanup] recordings/ limpo completamente.');

  // Aguarda um segundo para garantir que os file handles fecharam
  await new Promise(r => setTimeout(r, 1000));

  // Reinicia a gravação no mesmo canal
  try {
    const newConnection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    await entersState(newConnection, VoiceConnectionStatus.Ready, 15_000);

    const session = await client.recorder.startSession(newConnection, guildId, client);

    client.activeRecordings.set(guildId, {
      session,
      connection: newConnection,
      channelId: voiceChannel.id,
    });

    getIO()?.emit('recording:start', { guildId });

    // Avisa no canal de texto mais recente do servidor
    const textChannel = guild.channels.cache
      .filter(c => c.isTextBased() && c.permissionsFor(guild.members.me!)?.has('SendMessages'))
      .first();

    if (textChannel?.isTextBased()) {
      await textChannel.send(
        `♻️ **Reset automático de armazenamento**\n` +
        `O limite de **3GB** foi atingido. As gravações foram apagadas e a call foi reiniciada automaticamente.\n` +
        `✂️ Clips não foram afetados.`
      ).catch(() => {});
    }

    console.log(`♻️ [Cleanup] Gravação reiniciada em "${voiceChannel.name}" (${guildId})`);
  } catch (err) {
    console.error('[Cleanup] Falha ao reiniciar gravação:', err);
  }
}

export function startCleanupJob(client: DiscordBot) {
  const storagePath = path.resolve(process.env.STORAGE_PATH || './recordings');

  cron.schedule('*/5 * * * *', async () => {
    const totalSize = getFolderSize(storagePath);

    if (totalSize <= MAX_SIZE_BYTES) return;

    const mb = (totalSize / 1024 / 1024).toFixed(0);
    console.log('\n==================================================');
    console.log(`🚨 [ALERTA] Limite de 3GB atingido! (${mb}MB em uso)`);
    console.log('♻️ [Cleanup] Parando calls, limpando e reiniciando...');
    console.log('==================================================\n');

    // Processa cada guild que tem gravação ativa
    const activeGuilds = [...client.activeRecordings.keys()];

    if (activeGuilds.length > 0) {
      // Para e reinicia cada sessão ativa
      for (const guildId of activeGuilds) {
        await restartRecording(client, guildId);
      }
    } else {
      // Sem sessão ativa — apaga direto
      nukeDirectory(storagePath);
      console.log('🗑️ [Cleanup] recordings/ limpo (sem sessão ativa).');
    }
  });
}