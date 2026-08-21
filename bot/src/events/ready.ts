import { ActivityType, Client } from 'discord.js';

export default {
  name: 'clientReady',
  once: true,
  async execute(client: Client) {
    console.log(`\n⚡ ${client.user!.tag} está online!`);
    console.log(`📊 Servidores: ${client.guilds.cache.size}`);
    console.log(`👥 Usuários: ${client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0)}\n`);

    // Presença rotativa a cada 30s
    const activities = [
      { name: `${client.guilds.cache.size} servidores`, type: ActivityType.Watching },
      { name: '/gravar | /ajuda', type: ActivityType.Listening },
      { name: 'chamadas de voz 🎙️', type: ActivityType.Watching },
    ];
    let i = 0;

    const updatePresence = () => {
      client.user!.setPresence({
        activities: [activities[i % activities.length]],
        status: 'online',
      });
      i++;
    };

    updatePresence();
    setInterval(updatePresence, 30_000);
  },
};
