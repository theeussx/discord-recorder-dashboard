import { createServerFn } from '@tanstack/react-start';
import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server';
import { z } from 'zod';
import { signToken, verifyToken, comparePassword, TOKEN_TTL } from './auth-utils.server';

const TOKEN_KEY = 'wr_token';

// POST /api/auth/login
export const loginFn = createServerFn({ method: 'POST' })
  .validator(z.object({ password: z.string().min(1) }))
  .handler(async ({ data }) => {
    const valid = await comparePassword(data.password);
    if (!valid) {
      throw new Error('Senha incorreta');
    }
    const token = await signToken();
    setCookie(TOKEN_KEY, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_TTL,
      path: '/',
    });
    return { ok: true };
  });

// POST /api/auth/logout
export const logoutFn = createServerFn({ method: 'POST' })
  .handler(async () => {
    deleteCookie(TOKEN_KEY, { path: '/' });
    return { ok: true };
  });

// GET /api/auth/me
export const meFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const token = getCookie(TOKEN_KEY);
    if (!token) throw new Error('Não autenticado');
    const valid = await verifyToken(token);
    if (!valid) throw new Error('Sessão expirada');
    return { role: 'admin' };
  });
