import { VoiceConnection, EndBehaviorType } from '@discordjs/voice';
import { createWriteStream, WriteStream } from 'fs';
import { mkdir, stat, appendFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import prism from 'prism-media';
import ffmpeg from 'fluent-ffmpeg';
import { Client } from 'discord.js';

const AUDIO = {
  SAMPLE_RATE: 48000,
  CHANNELS: 2,
  BIT_DEPTH: 2,
  get BYTES_PER_SECOND() {
    return this.SAMPLE_RATE * this.CHANNELS * this.BIT_DEPTH;
  }
};

export interface StopSessionResult {
  mixedMp3Path: string;
  duration: number;
  participants: string[];
  folderPath: string;
}

interface UserSession {
  pcmPath: string;
  writeStream: WriteStream;
  decoder: prism.opus.Decoder;                                // Fix 4: decoder no interface
  opusStream: ReturnType<VoiceConnection['receiver']['subscribe']>;
  cleaned: boolean;
}

interface GuildSession {
  connection: VoiceConnection;
  guildId: string;
  discordClient: Client;
  startTime: number;
  folderPath: string;
  tracksPath: string;
  mixedMp3Path: string;
  active: boolean;
  finished: boolean;
  users: Map<string, UserSession>;
  finishedPcms: Set<string>;
}

export class VoiceRecorder {
  private recordingsPath: string;
  public sessions: Map<string, GuildSession> = new Map();

  constructor() {
    this.recordingsPath = process.env.STORAGE_PATH || path.resolve('./recordings');
  }

  public async startSession(
    connection: VoiceConnection,
    guildId: string,
    discordClient: Client
  ): Promise<GuildSession> {
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-');
    const dayFolder = now.toISOString().split('T')[0];

    const folderPath = path.join(this.recordingsPath, guildId, dayFolder, `session-${ts}`);
    const tracksPath = path.join(folderPath, 'tracks');

    await mkdir(tracksPath, { recursive: true });

    const session: GuildSession = {
      connection,
      guildId,
      discordClient,
      startTime: Date.now(),
      folderPath,
      tracksPath,
      mixedMp3Path: path.join(folderPath, `Call_Completa_${ts}.mp3`),
      active: true,
      finished: false,
      users: new Map(),
      finishedPcms: new Set(),
    };

    this.sessions.set(guildId, session);

    // Fix 1: void + .catch() para capturar erros de subscribeUser sem crashar
    connection.receiver.speaking.on('start', (userId: string) => {
      if (!session.active || session.finished) return;
      if (session.users.has(userId)) return;
      void this.subscribeUser(session, userId).catch(err =>
        console.error(`[Recorder] subscribeUser error (${userId}):`, err)
      );
    });

    return session;
  }

  private async subscribeUser(session: GuildSession, userId: string): Promise<void> {
    const userCache = session.discordClient.users.cache.get(userId);
    const rawName = userCache ? userCache.username : userId;
    const safeName = rawName.replace(/[^a-zA-Z0-9]/g, '_');

    const pcmPath = path.join(session.tracksPath, `${safeName}.pcm`);

    // Fix 2: silêncio escrito direto no arquivo via appendFile, ANTES de abrir
    // o writeStream — elimina a race condition com o pipe
    const currentDuration = (Date.now() - session.startTime) / 1000;
    let currentFileBytes = 0;
    if (existsSync(pcmPath)) currentFileBytes = (await stat(pcmPath)).size;

    const expectedBytes = Math.floor(currentDuration * AUDIO.BYTES_PER_SECOND);
    const silenceNeeded = expectedBytes - currentFileBytes;
    const alignedSilence = silenceNeeded - (silenceNeeded % 4);

    if (alignedSilence > 100) {
      await this.writeSilenceToFile(pcmPath, alignedSilence);
    }

    // Só abre o writeStream depois do silêncio estar em disco
    const writeStream = createWriteStream(pcmPath, { flags: 'a' });

    const opusStream = session.connection.receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.AfterSilence, duration: 1500 },
    });

    const decoder = new prism.opus.Decoder({
      rate: AUDIO.SAMPLE_RATE,
      channels: AUDIO.CHANNELS,
      frameSize: 960,
    });

    opusStream.pipe(decoder).pipe(writeStream, { end: false });

    decoder.on('error', (err: Error) => {
      if (!err.message.includes('Invalid packet')) {
        console.error(`[Recorder] Decoder error (${userId}):`, err.message);
      }
    });

    // Fix 4: decoder salvo no userSession para poder destruir no stopSession
    const userSession: UserSession = { pcmPath, writeStream, decoder, opusStream, cleaned: false };
    session.users.set(userId, userSession);

    const onEnd = () => {
      if (userSession.cleaned) return;
      userSession.cleaned = true;
      try { opusStream.destroy(); } catch {}
      try { decoder.destroy(); } catch {}
      session.users.delete(userId);
      writeStream.end(() => {
        if (existsSync(pcmPath)) session.finishedPcms.add(pcmPath);
      });
    };

    opusStream.on('end', onEnd);
    opusStream.on('close', onEnd);
    opusStream.on('error', () => onEnd());
  }

  public async stopSession(guildId: string): Promise<StopSessionResult> {
    const session = this.sessions.get(guildId);
    if (!session) throw new Error(`Sessão não encontrada.`);
    if (session.finished) throw new Error(`Sessão já finalizada.`);

    session.active = false;
    session.finished = true;
    const participants = Array.from(session.users.keys());

    const closePromises = [...session.users.entries()].map(async ([userId, user]) => {
      if (user.cleaned) return;
      user.cleaned = true;
      try { user.opusStream.destroy(); } catch {}
      try { user.decoder.destroy(); } catch {}  // Fix 4: destrói decoder
      session.users.delete(userId);
      return new Promise<void>((resolve) => {
        user.writeStream.end(() => {
          if (existsSync(user.pcmPath)) session.finishedPcms.add(user.pcmPath);
          resolve();
        });
      });
    });

    await Promise.all(closePromises);
    await new Promise(r => setTimeout(r, 500));

    // Fix 3: duration calculado APÓS fechar todas as streams
    const duration = Math.floor((Date.now() - session.startTime) / 1000);

    const pcmFiles = Array.from(session.finishedPcms).filter(f => existsSync(f));

    // Padroniza tamanho de todas as faixas (Fix 3: usa duration pós-close)
    const expectedBytes = Math.floor(duration * AUDIO.BYTES_PER_SECOND);
    for (const pcmPath of pcmFiles) {
      const currentBytes = (await stat(pcmPath)).size;
      const missing = expectedBytes - currentBytes;
      const aligned = missing - (missing % 4);
      if (aligned > 100) {
        await appendFile(pcmPath, Buffer.alloc(Math.min(aligned, 10 * 1024 * 1024), 0));
      }
    }

    if (pcmFiles.length > 0) {
      await this.mixPcmsToSingleMp3(pcmFiles, session.mixedMp3Path);
      for (const pcm of pcmFiles) {
        try { await unlink(pcm); } catch {}
      }
    }

    this.sessions.delete(guildId);

    return { mixedMp3Path: session.mixedMp3Path, duration, participants, folderPath: session.folderPath };
  }

  // Retorna os PCMs finalizados de uma sessão ativa (para o /clip)
  // Exclui PCMs de usuários ainda com stream aberta (arquivo incompleto)
  public getFinishedPcms(guildId: string): string[] {
    const session = this.sessions.get(guildId);
    if (!session) return [];
    return Array.from(session.finishedPcms).filter(f => existsSync(f));
  }

  // Retorna o tracksPath e startTime de uma sessão ativa (para o /clip calcular offset)
  public getSessionInfo(guildId: string): { tracksPath: string; startTime: number } | null {
    const session = this.sessions.get(guildId);
    if (!session) return null;
    return { tracksPath: session.tracksPath, startTime: session.startTime };
  }

  private mixPcmsToSingleMp3(pcmFiles: string[], output: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cmd = ffmpeg();
      for (const f of pcmFiles) {
        cmd.input(f).inputFormat('s16le').inputOptions(['-ar 48000', '-ac 2']);
      }
      cmd
        .complexFilter([`amix=inputs=${pcmFiles.length}:duration=longest:normalize=0,dynaudnorm=f=200:g=15`])
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .on('end', () => resolve())
        .on('error', (err: Error) => { console.error('[Recorder] Mix error:', err.message); reject(err); })
        .save(output);
    });
  }

  // Fix 2: escreve silêncio diretamente no arquivo (sem WriteStream aberto)
  private async writeSilenceToFile(filePath: string, bytes: number): Promise<void> {
    const CHUNK = 1024 * 1024;
    let remaining = bytes;
    while (remaining > 0) {
      const toWrite = Math.min(remaining, CHUNK);
      await appendFile(filePath, Buffer.alloc(toWrite, 0));
      remaining -= toWrite;
    }
  }

  // Mantido para o stopSession que usa WriteStream já aberto
  private writeSilence(stream: WriteStream, bytes: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const CHUNK = 1024 * 1024;
      let remaining = bytes;
      const write = () => {
        let ok = true;
        while (remaining > 0 && ok) {
          const toWrite = Math.min(remaining, CHUNK);
          const buf = Buffer.alloc(toWrite, 0);
          remaining -= toWrite;
          if (remaining === 0) {
            stream.write(buf, (err) => err ? reject(err) : resolve());
          } else {
            ok = stream.write(buf);
          }
        }
        if (remaining > 0) stream.once('drain', write);
      };
      stream.on('error', reject);
      write();
    });
  }
}
