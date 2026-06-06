Deploy rápido (Replit / Vercel)

Requisitos de ambiente (variáveis):

- `ADMIN_USER` — usuário admin (ex: admin)
- `ADMIN_PASS` — senha admin (ex: changeme)
- `JWT_SECRET` — segredo forte para assinar JWTs
- `NODE_ENV` — `production` em produção
- `PORT` — (opcional) porta (padrão 3000)

Se você quer que a aplicação use o seu bot para dados reais, defina também:

- `BOT_HOST` — IP ou hostname do seu bot (ex: 192.95.37.8)
- `BOT_PORT` — porta do serviço do bot (ex: 8080)
- `BOT_PROTOCOL` — `http` ou `https` (se seu bot usa HTTPS)
- `BOT_AUTH_TOKEN` — token Bearer para autenticação no bot
- `BOT_API_BASE` — URL base completa do serviço do bot (opcional; sobrescreve `BOT_HOST`/`BOT_PORT`)

> Se o bot usa HTTPS e você conecta pelo IP, pode haver erro TLS de nome de host.
> Nesse caso, prefira `BOT_API_BASE=https://cn-01.hostzera.com.br:8080/api` ou o hostname correto do certificado.

Replit (recomendado):

1. Crie um novo Replit e importe este repositório.
2. Vá em Secrets / Environment Variables e adicione `ADMIN_USER`, `ADMIN_PASS`, `JWT_SECRET`.
3. O arquivo `.replit` já executa:

```
pnpm install && pnpm build && NODE_ENV=production node dist/index.js
```

4. Inicie o Replit; a aplicação ficará disponível na URL do Replit.

Vercel (opcional):

1. Vercel não é ideal para long-running Express servers em modo process (serverless é diferente).
2. Para Vercel recomenda-se portar a API para Serverless Functions (api/*) ou usar uma plataforma que aceite Node long-running (Render, Fly, Railway, Replit).

Testes locais:

```
pnpm install
pnpm build
NODE_ENV=production node dist/index.js
# Acesse http://localhost:3000 ou a porta mostrada
```
