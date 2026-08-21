import { readdirSync, lstatSync } from 'fs';
import path from 'path';
import { DiscordBot } from '../bot/client.ts';

// Lê recursivamente a pasta de comandos e registra cada um no client
export function loadCommands(client: DiscordBot) {
  const commandsPath = path.join(process.cwd(), 'src', 'commands');

  const load = (dir: string) => {
    for (const file of readdirSync(dir)) {
      const fullPath = path.join(dir, file);
      if (lstatSync(fullPath).isDirectory()) {
        load(fullPath);
        continue;
      }
      if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;

      import(fullPath).then(module => {
        const command = module.command ?? module.default;
        if (!command?.data || typeof command.execute !== 'function') return;

        // Guarda a categoria baseada na subpasta (util, gravacao, etc.)
        command.category = path.basename(path.dirname(fullPath));
        client.commands.set(command.data.name, command);
        console.log(`✅ Comando carregado: /${command.data.name} [${command.category}]`);
      }).catch(err => {
        console.error(`❌ Erro ao carregar comando ${file}:`, err.message);
      });
    }
  };

  load(commandsPath);
}
