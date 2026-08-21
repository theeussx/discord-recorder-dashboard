import { DiscordBot } from './bot/client.ts';
import { startServer } from './server/index.ts';
import { startCleanupJob } from './utils/cleanup.ts';

const bot = new DiscordBot();

async function main() {
  try {
    // O client agora carrega comandos e eventos automaticamente
    // Não precisa mais importar cada comando manualmente
    bot.once('clientReady', async () => {
      // Sincroniza slash commands com o Discord
      const slashCmds = [...bot.commands.values()].map(c => c.data.toJSON());
      await bot.application!.commands.set(slashCmds);
      console.log(`✅ ${slashCmds.length} comandos sincronizados.`);

      startServer();
      startCleanupJob(bot); // passa o client inteiro para poder reiniciar gravações
      console.log('🚀 Sistema iniciado!\n');
    });

    await bot.start();
  } catch (error) {
    console.error('❌ Erro ao iniciar:', error);
    process.exit(1);
  }
}

main();
