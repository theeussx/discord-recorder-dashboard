# Wardizitto Recordings

Painel web e bot do Discord para gravação de canais de voz, gerenciamento de sessões, criação de clipes e armazenamento de arquivos de áudio.

> **Aviso de segurança:** nunca versione `.env`, tokens do Discord, senhas do banco, segredos JWT ou credenciais OAuth do Google Drive. As credenciais presentes no pacote original devem ser revogadas e regeneradas antes de qualquer execução ou publicação.

## Visão geral

O projeto é composto por duas aplicações relacionadas:

| Componente | Diretório | Responsabilidade |
|---|---|---|
| Dashboard | raiz do projeto | Interface web privada para consultar gravações, clipes, estatísticas e estado do sistema. |
| Bot/API | `bot/` | Bot do Discord, gravação de voz, processamento FFmpeg, persistência MySQL e API HTTP para o dashboard. |

O dashboard usa TanStack Start, React, TypeScript e Vite. O bot usa Discord.js, `@discordjs/voice`, Express, Socket.IO, MySQL e FFmpeg.

## Funcionalidades

O bot disponibiliza comandos slash para iniciar e interromper gravações, gerar clipes, salvar arquivos no Google Drive, consultar ajuda e verificar o status do sistema. A API HTTP expõe gravações, clipes, estatísticas e um endpoint de saúde.

O dashboard possui login administrativo baseado em senha com hash bcrypt, sessão JWT em cookie `httpOnly`, proteção de rotas, reprodução de áudio, listagem de gravações e clipes, estatísticas de armazenamento e acompanhamento de sessões ao vivo.

## Requisitos

É necessário ter Node.js 22 ou superior, pnpm, uma aplicação Discord configurada, FFmpeg disponível no `PATH`, um banco MySQL compatível e, caso o armazenamento externo seja utilizado, credenciais válidas do Google Drive.

O bot precisa ser convidado ao servidor Discord com as permissões e intents necessários para acessar guildas, mensagens, estados de voz e conteúdo de mensagens. O uso de `MessageContent` e de eventos de voz deve ser habilitado no Developer Portal do Discord.

## Configuração de ambiente

### Dashboard

Copie o arquivo de exemplo e preencha os valores no ambiente de execução:

```bash
cp .env.example .env
```

As variáveis principais são:

| Variável | Obrigatória | Descrição |
|---|---:|---|
| `JWT_SECRET` | Sim | Segredo longo e aleatório usado para assinar sessões. |
| `ADMIN_PASS_HASH` | Sim | Hash bcrypt da senha administrativa. |
| `BOT_API_BASE` | Sim | URL base da API do bot, sem a barra final. |
| `VITE_BOT_API_BASE` | Conforme o deploy | URL pública do bot usada pelos players de áudio no navegador. |

Para gerar um hash bcrypt, use um gerador confiável ou um pequeno script local que utilize a mesma versão de `bcryptjs` do projeto. Nunca coloque a senha em arquivos versionados.

### Bot

Crie `bot/.env` a partir do seguinte modelo:

```dotenv
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID=
PORT=2312
JWT_SECRET=
DASHBOARD_URL=http://localhost:3000
DB_HOST=127.0.0.1
DB_USER=
DB_PASS=
DB_NAME=
STORAGE_PATH=./recordings
MAX_STORAGE_GB=4
AUTO_DELETE_DAYS=10
```

O bot também pode exigir um arquivo de credenciais do Google Drive, dependendo do comando de upload utilizado. Esse arquivo deve permanecer fora do Git e ser disponibilizado somente por secret, volume privado ou mecanismo equivalente do provedor de hospedagem.

## Instalação e execução local

Instale as dependências do dashboard:

```bash
pnpm install
```

Depois instale as dependências do bot:

```bash
cd bot
pnpm install
cd ..
```

Inicie o dashboard em um terminal:

```bash
pnpm dev
```

Inicie o bot em outro terminal:

```bash
cd bot
pnpm dev:bot
```

O dashboard deve apontar `BOT_API_BASE` e `VITE_BOT_API_BASE` para a URL onde o bot/API está ouvindo. Em desenvolvimento local, normalmente essa URL é `http://localhost:2312`.

## Scripts

### Dashboard

| Comando | Finalidade |
|---|---|
| `pnpm dev` | Inicia o servidor de desenvolvimento. |
| `pnpm build` | Gera o build de produção. |
| `pnpm start` | Inicia o servidor de produção gerado pelo build. |
| `pnpm check` | Executa a verificação TypeScript. |

### Bot

Execute os comandos dentro de `bot/`:

| Comando | Finalidade |
|---|---|
| `pnpm dev:bot` | Executa o bot em modo de desenvolvimento. |
| `pnpm build:bot` | Valida o TypeScript do bot. |
| `pnpm start` | Inicia o entrypoint ESM do bot. |
| `pnpm dev` | Inicia bot e dashboard legado, quando a estrutura correspondente estiver disponível. |

## API HTTP do bot

A API usa o prefixo `/api` para os recursos de dados e de arquivos.

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/health` | Retorna o estado básico do serviço. |
| `GET` | `/api/recordings` | Lista gravações persistidas no banco. |
| `GET` | `/api/recordings/file/:filename` | Faz download ou streaming de uma gravação. |
| `GET` | `/api/clips` | Lista clipes disponíveis no armazenamento. |
| `GET` | `/api/clips/file/:filename` | Faz download ou streaming de um clipe. |
| `GET` | `/api/stats` | Retorna totais e uso estimado do armazenamento. |

Exemplo de health check:

```bash
curl http://localhost:2312/health
```

A resposta esperada possui `ok: true`, o nome do serviço e um timestamp ISO-8601.

## Autenticação e correção do login

A autenticação administrativa utiliza uma senha comparada com `ADMIN_PASS_HASH` usando bcrypt. Após o login, o dashboard cria um JWT assinado por `JWT_SECRET` em cookie `httpOnly`, com `SameSite=Lax` e expiração limitada.

As rotas raiz, login e dashboard validam a sessão real por meio do JWT. O cookie `wr_session` não é tratado como prova suficiente de autenticação; ele serve apenas como sinalização de estado no cliente. Essa separação evita redirecionamentos incorretos quando o cookie visível permanece após expiração, logout incompleto ou alteração de domínio.

Se o login falhar, verifique primeiro se `JWT_SECRET` e `ADMIN_PASS_HASH` estão definidos no processo do dashboard, se a senha foi convertida em hash bcrypt corretamente e se os cookies não estão sendo bloqueados pelo domínio, HTTPS ou configuração de proxy reverso.

## Armazenamento e banco de dados

As gravações são consultadas na tabela `recordings` do MySQL. O diretório definido por `STORAGE_PATH` é usado para os arquivos de áudio, enquanto os clipes ficam no diretório irmão `clips`, conforme a implementação atual do bot.

Garanta que o processo tenha permissão de leitura e escrita no armazenamento e configure a política de limpeza automática de acordo com o espaço disponível. Antes de ativar a limpeza em produção, faça backup dos arquivos importantes e confirme o valor de `AUTO_DELETE_DAYS`.

## Deploy

O dashboard e o bot podem ser publicados como serviços separados. O dashboard deve receber as variáveis de autenticação e a URL da API. O bot deve receber as credenciais do Discord, banco, armazenamento e a URL permitida do dashboard.

Em produção, prefira HTTPS, defina explicitamente `DASHBOARD_URL`, use secrets do provedor de hospedagem e mantenha o banco e o armazenamento fora do controle de versão. Não use `origin: *` para um ambiente público com credenciais.

O endpoint `/health` pode ser utilizado por Render, Docker, Kubernetes ou outro monitor para verificar se o processo HTTP do bot está respondendo.

## Segurança operacional

Revogue imediatamente qualquer token, senha ou segredo que tenha sido incluído no ZIP original, em logs, screenshots ou commits anteriores. Depois gere novos valores e atualize somente os secrets do ambiente de deploy.

Também é recomendável restringir o acesso à API do bot à origem do dashboard, proteger os endpoints de arquivos com autenticação de aplicação ou rede privada e aplicar limites de tamanho e taxa para evitar abuso de armazenamento.

## Desenvolvimento e contribuição

Antes de abrir um pull request, execute os checks TypeScript do dashboard e do bot, confirme que nenhum `.env`, arquivo OAuth ou gravação foi adicionado ao Git e revise as mudanças com:

```bash
git diff --check
git status --short
```

Commits devem ser pequenos, descritivos e não devem conter segredos. Alterações na API devem atualizar a tabela de endpoints deste documento.

## Licença

Nenhuma licença explícita foi definida no projeto original. Defina uma licença antes de distribuir o software publicamente.
