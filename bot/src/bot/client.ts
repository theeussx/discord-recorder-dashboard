import {
  Client, GatewayIntentBits, Collection,
  type Interaction, Events
} from 'discord.js';
import dotenv from 'dotenv';
import { readdirSync, lstatSync } from 'fs';
import path from 'path';
import { VoiceRecorder } from '../voice/recorder.ts';
import { initDB } from '../database/db.ts';

dotenv.config();

export class DiscordBot extends Client {
  public commands: Collection<string, any> = new Collection();
  public recorder: VoiceRecorder;
  public activeRecordings: Map<string, any> = new Map();

  // Cooldowns por comando (adaptado do Wardizitto)
  private cooldowns: Map<string, Map<string, number>> = new Map();
  private readonly COOLDOWN_MS = 3000;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
    this.recorder = new VoiceRecorder();
  }

  // Carrega comandos e eventos dinamicamente
  private async loadHandlers() {
    // ── Comandos ──────────────────────────────────────────────────────────────
    const loadCommands = async (dir: string) => {
      for (const file of readdirSync(dir)) {
        const full = path.join(dir, file);
        if (lstatSync(full).isDirectory()) { await loadCommands(full); continue; }
        if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;
        try {
          const mod = await import(full);
          const cmd = mod.command ?? mod.default;
          if (!cmd?.data || typeof cmd.execute !== 'function') continue;
          cmd.category = path.basename(path.dirname(full));
          this.commands.set(cmd.data.name, cmd);
          console.log(`✅ Comando: /${cmd.data.name} [${cmd.category}]`);
        } catch (err: any) {
          console.error(`❌ Erro ao carregar ${file}:`, err.message);
        }
      }
    };

    // ── Eventos ───────────────────────────────────────────────────────────────
    const loadEvents = async (dir: string) => {
      if (!lstatSync(dir).isDirectory()) return;
      for (const file of readdirSync(dir)) {
        const full = path.join(dir, file);
        if (lstatSync(full).isDirectory()) { await loadEvents(full); continue; }
        if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;
        try {
          const mod = await import(full);
          const event = mod.default ?? mod;
          if (!event?.name) continue;
          if (event.once) {
            this.once(event.name, (...args) => event.execute(...args, this));
          } else {
            this.on(event.name, (...args) => event.execute(...args, this));
          }
          console.log(`📡 Evento: ${event.name}`);
        } catch (err: any) {
          console.error(`❌ Erro ao carregar evento ${file}:`, err.message);
        }
      }
    };

    const commandsDir = path.join(process.cwd(), 'src', 'commands');
    const eventsDir   = path.join(process.cwd(), 'src', 'events');

    await loadCommands(commandsDir);
    await loadEvents(eventsDir);
  }

  private registerInteractionHandler() {
    this.on(Events.InteractionCreate, async (interaction: Interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = this.commands.get(interaction.commandName);
      if (!command) {
        return interaction.reply({ content: '❌ Comando não encontrado.', ephemeral: true });
      }

      // Cooldown (adaptado do Wardizitto)
      if (!this.cooldowns.has(command.data.name)) {
        this.cooldowns.set(command.data.name, new Map());
      }
      const timestamps = this.cooldowns.get(command.data.name)!;
      const now = Date.now();
      const userId = interaction.user.id;

      if (timestamps.has(userId)) {
        const expiry = timestamps.get(userId)! + this.COOLDOWN_MS;
        if (now < expiry) {
          const left = ((expiry - now) / 1000).toFixed(1);
          return interaction.reply({
            content: `⏳ Aguarde **${left}s** antes de usar \`/${command.data.name}\` novamente.`,
            ephemeral: true,
          });
        }
      }
      timestamps.set(userId, now);
      setTimeout(() => timestamps.delete(userId), this.COOLDOWN_MS);

      try {
        await command.execute(interaction, this);
      } catch (error: any) {
        console.error(`❌ Erro em /${interaction.commandName}:`, error);
        const msg = { content: '⚠️ Ocorreu um erro ao executar este comando.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
    });
  }

  async start() {
    await initDB();
    await this.loadHandlers();
    this.registerInteractionHandler();
    await this.login(process.env.DISCORD_TOKEN);
  }
}
