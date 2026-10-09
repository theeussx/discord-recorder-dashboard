import { VoiceConnection, EndBehaviorType } from '@discordjs/voice';
import { createWriteStream, WriteStream, existsSync } from 'node:fs';
import { mkdir, stat, appendFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import prism from 'prism-media';
import ffmpeg from 'fluent-ffmpeg';
import { Client } from 'discord.js';
import { getStoragePath } from '../utils/config.ts';

const AUDIO = { SAMPLE_RATE: 48000, CHANNELS: 2, BIT_DEPTH: 2, get BYTES_PER_SECOND() { return this.SAMPLE_RATE * this.CHANNELS * this.BIT_DEPTH; } };

export interface StopSessionResult { mixedMp3Path: string; duration: number; participants: string[]; folderPath: string; }
interface UserSession { pcmPath: string; writeStream: WriteStream; decoder: prism.opus.Decoder; opusStream: ReturnType<VoiceConnection['receiver']['subscribe']>; cleaned: boolean; }
interface GuildSession {
  connection: VoiceConnection; guildId: string; discordClient: Client; startTime: number; folderPath: string; tracksPath: string; mixedMp3Path: string;
  active: boolean; finished: boolean; users: Map<string, UserSession>; pendingUsers: Set<string>; participantIds: Set<string>; finishedPcms: Set<string>;
}

export class VoiceRecorder {
  private recordingsPath: string;
  public sessions: Map<string, GuildSession> = new Map();

  constructor() { this.recordingsPath = getStoragePath(); }

  public async startSession(connection: VoiceConnection, guildId: string, discordClient: Client): Promise<GuildSession> {
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-');
    const dayFolder = now.toISOString().split('T')[0];
    const folderPath = path.join(this.recordingsPath, guildId, dayFolder, `session-${ts}`);
    const tracksPath = path.join(folderPath, 'tracks');
    await mkdir(tracksPath, { recursive: true });
    const session: GuildSession = {
      connection, guildId, discordClient, startTime: Date.now(), folderPath, tracksPath,
      mixedMp3Path: path.join(folderPath, `Call_Completa_${ts}.mp3`), active: true, finished: false,
      users: new Map(), pendingUsers: new Set(), participantIds: new Set(), finishedPcms: new Set(),
    };
    this.sessions.set(guildId, session);
    connection.receiver.speaking.on('start', (userId: string) => {
      if (!session.active || session.finished || session.users.has(userId) || session.pendingUsers.has(userId)) return;
      session.pendingUsers.add(userId);
      session.participantIds.add(userId);
      void this.subscribeUser(session, userId).catch(error => console.error(`[Recorder] subscribeUser error (${userId}):`, error instanceof Error ? error.message : error));
    });
    return session;
  }

  private async subscribeUser(session: GuildSession, userId: string): Promise<void> {
    try {
      const rawName = session.discordClient.users.cache.get(userId)?.username ?? userId;
      const safeName = rawName.replace(/[^a-zA-Z0-9]/g, '_') || userId;
      const pcmPath = path.join(session.tracksPath, `${safeName}-${userId}.pcm`);
      const currentDuration = (Date.now() - session.startTime) / 1000;
      const currentFileBytes = existsSync(pcmPath) ? (await stat(pcmPath)).size : 0;
      const silenceNeeded = Math.floor(currentDuration * AUDIO.BYTES_PER_SECOND) - currentFileBytes;
      const alignedSilence = silenceNeeded - (silenceNeeded % 4);
      if (alignedSilence > 100) await this.writeSilenceToFile(pcmPath, alignedSilence);

      const writeStream = createWriteStream(pcmPath, { flags: 'a' });
      const opusStream = session.connection.receiver.subscribe(userId, { end: { behavior: EndBehaviorType.AfterSilence, duration: 1500 } });
      const decoder = new prism.opus.Decoder({ rate: AUDIO.SAMPLE_RATE, channels: AUDIO.CHANNELS, frameSize: 960 });
      const userSession: UserSession = { pcmPath, writeStream, decoder, opusStream, cleaned: false };
      session.users.set(userId, userSession);
      const onStreamError = (error: unknown) => console.error(`[Recorder] Erro de stream (${userId}):`, error instanceof Error ? error.message : error);
      writeStream.on('error', onStreamError);
      decoder.on('error', onStreamError);
      opusStream.on('error', onStreamError);
      const onEnd = () => {
        if (userSession.cleaned) return;
        userSession.cleaned = true;
        try { opusStream.destroy(); } catch {}
        try { decoder.destroy(); } catch {}
        session.users.delete(userId);
        writeStream.end(() => { if (existsSync(pcmPath)) session.finishedPcms.add(pcmPath); });
      };
      opusStream.pipe(decoder).pipe(writeStream, { end: false });
      opusStream.once('end', onEnd);
      opusStream.once('close', onEnd);
    } finally {
      session.pendingUsers.delete(userId);
    }
  }

  public async stopSession(guildId: string): Promise<StopSessionResult> {
    const session = this.sessions.get(guildId);
    if (!session) throw new Error('Sessão não encontrada.');
    if (session.finished) throw new Error('Sessão já finalizada.');
    session.active = false;
    session.finished = true;
    const participants = Array.from(session.participantIds);
    try {
      await Promise.all([...session.users.entries()].map(async ([userId, user]) => {
        if (user.cleaned) return;
        user.cleaned = true;
        try { user.opusStream.destroy(); } catch {}
        try { user.decoder.destroy(); } catch {}
        session.users.delete(userId);
        await new Promise<void>((resolve, reject) => {
          const onError = (error: Error) => { user.writeStream.removeListener('finish', onFinish); reject(error); };
          const onFinish = () => { user.writeStream.removeListener('error', onError); if (existsSync(user.pcmPath)) session.finishedPcms.add(user.pcmPath); resolve(); };
          user.writeStream.once('error', onError);
          user.writeStream.once('finish', onFinish);
          user.writeStream.end();
        });
      }));
      await new Promise(resolve => setTimeout(resolve, 250));
      const duration = Math.max(1, Math.floor((Date.now() - session.startTime) / 1000));
      const pcmFiles = Array.from(session.finishedPcms).filter(file => existsSync(file));
      if (pcmFiles.length === 0) throw new Error('Nenhum áudio finalizado foi encontrado.');
      const expectedBytes = Math.floor(duration * AUDIO.BYTES_PER_SECOND);
      for (const pcmPath of pcmFiles) {
        const missing = expectedBytes - (await stat(pcmPath)).size;
        const aligned = missing - (missing % 4);
        if (aligned > 100) await appendFile(pcmPath, Buffer.alloc(Math.min(aligned, 10 * 1024 * 1024), 0));
      }
      await this.mixPcmsToSingleMp3(pcmFiles, session.mixedMp3Path);
      if (!existsSync(session.mixedMp3Path) || (await stat(session.mixedMp3Path)).size === 0) throw new Error('FFmpeg não gerou um arquivo válido.');
      for (const pcm of pcmFiles) await unlink(pcm).catch(() => {});
      return { mixedMp3Path: session.mixedMp3Path, duration, participants, folderPath: session.folderPath };
    } finally {
      this.sessions.delete(guildId);
    }
  }

  public getFinishedPcms(guildId: string): string[] { const session = this.sessions.get(guildId); return session ? Array.from(session.finishedPcms).filter(file => existsSync(file)) : []; }
  public getSessionInfo(guildId: string): { tracksPath: string; startTime: number } | null { const session = this.sessions.get(guildId); return session ? { tracksPath: session.tracksPath, startTime: session.startTime } : null; }

  private mixPcmsToSingleMp3(pcmFiles: string[], output: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cmd = ffmpeg();
      for (const file of pcmFiles) cmd.input(file).inputFormat('s16le').inputOptions(['-ar 48000', '-ac 2']);
      cmd.complexFilter([`amix=inputs=${pcmFiles.length}:duration=longest:normalize=0,dynaudnorm=f=200:g=15`]).audioCodec('libmp3lame').audioBitrate('128k').on('end', () => resolve()).on('error', reject).save(output);
    });
  }

  private async writeSilenceToFile(filePath: string, bytes: number): Promise<void> {
    const chunk = 1024 * 1024; let remaining = bytes;
    while (remaining > 0) { const amount = Math.min(remaining, chunk); await appendFile(filePath, Buffer.alloc(amount, 0)); remaining -= amount; }
  }
}
