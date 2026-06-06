export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Bot connection (optional) - set to your bot host/IP
  botHost: process.env.BOT_HOST ?? "",
  botPort: process.env.BOT_PORT ?? "",
  botProtocol: process.env.BOT_PROTOCOL ?? "http",
  botAuthToken: process.env.BOT_AUTH_TOKEN ?? "",
  // If your bot exposes a base API URL like http://host:port/api, set it here.
  botApiBase: process.env.BOT_API_BASE ?? "",
};