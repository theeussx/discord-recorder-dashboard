import { createMiddleware } from '@tanstack/react-start';
// Stub vazio — Supabase removido, auth local via cookie JWT
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => next()
);
