# Guia de Deploy no Render

## Pré-requisitos

1. Conta no [Render.com](https://render.com)
2. Repositório Git com este projeto
3. Variáveis de ambiente configuradas

## Passo 1: Preparar as Variáveis de Ambiente

Você precisa gerar ou definir as seguintes variáveis:

### JWT_SECRET
Uma string longa e aleatória (mínimo 32 caracteres). Pode ser gerada com:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### ADMIN_PASS_HASH
Hash bcrypt da sua senha de admin. Para gerar:
```bash
node -e "require('bcryptjs').hash('SUA_SENHA_AQUI', 12).then(console.log)"
```

Exemplo: `$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGnvRm9GJuHUoZoXvV3jJlJHKpK` (senha: "admin123")

### BOT_API_BASE
URL completa da sua API do bot Discord (com `/api` no final):
```
https://seu-bot-api.com/api
```

### VITE_BOT_API_BASE
Mesma URL que `BOT_API_BASE` (necessária para o frontend acessar os arquivos):
```
https://seu-bot-api.com/api
```

## Passo 2: Criar um Web Service no Render

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Clique em **New +** → **Web Service**
3. Conecte seu repositório Git
4. Preencha os campos:
   - **Name**: `wardizitto-recordings` (ou outro nome)
   - **Environment**: `Node`
   - **Build Command**: `npm install -g pnpm && pnpm install --no-frozen-lockfile && pnpm build`
   - **Start Command**: `pnpm run start`
   - **Plan**: Escolha o plano desejado (Free, Starter, etc.)

## Passo 3: Configurar Variáveis de Ambiente

1. No dashboard do Render, vá para **Environment**
2. Adicione as seguintes variáveis:
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
   - `JWT_SECRET` = (valor gerado no Passo 1)
   - `ADMIN_PASS_HASH` = (valor gerado no Passo 1)
   - `BOT_API_BASE` = (URL da sua API do bot)
   - `VITE_BOT_API_BASE` = (mesma URL da API do bot)

## Passo 4: Deploy

1. Clique em **Create Web Service**
2. O Render iniciará o build automaticamente
3. Aguarde o build completar (pode levar 5-10 minutos)
4. Acesse a URL fornecida pelo Render

## Troubleshooting

### Build falha com erro de esbuild
- Certifique-se de que o `render.yaml` está correto
- Verifique se `pnpm` está sendo instalado globalmente no build command

### Página em branco ou erro 500
- Verifique se todas as variáveis de ambiente estão configuradas
- Confira os logs no Render: **Logs** → **Build** e **Runtime**

### Não consegue fazer login
- Verifique se `JWT_SECRET` e `ADMIN_PASS_HASH` estão configurados
- Tente gerar novos valores

### Gravações não aparecem
- Verifique se `BOT_API_BASE` está correto e acessível
- Confira se a API do bot está rodando e respondendo em `/api/recordings`

## URLs Importantes

- **Dashboard Render**: https://dashboard.render.com
- **Documentação Render**: https://render.com/docs
- **Seu App**: `https://seu-app-name.onrender.com`

## Notas de Segurança

⚠️ **IMPORTANTE**: 
- Nunca compartilhe seu `JWT_SECRET` ou `ADMIN_PASS_HASH`
- Altere a senha padrão ("admin123") antes de fazer deploy
- Use HTTPS sempre (Render fornece automaticamente)
- Mantenha a URL da API do bot segura e autenticada se possível
