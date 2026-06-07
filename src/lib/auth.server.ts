import { createServerFn } from '@tanstack/react-start';
import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import * as jose from 'jose';

const TOKEN_KEY = 'wr_token';
const TOKEN_TTL = 60 * 60 * 24 * 7; // 7 dias em segundos

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não definido no .env');
  return new TextEncoder().encode(secret);
}

function getPasswordHash(): string {
  const hash = process.env.ADMIN_PASS_HASH;
  if (!hash) throw new Error('ADMIN_PASS_HASH não definido no .env');
  return hash;
}

// Gera um JWT assinado com HS256
async function signToken(): Promise<string> {
  return new jose.SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL}s`)
    .sign(getSecret());
}

// Verifica o JWT do cookie
async function verifyToken(token: string): Promise<boolean> {
  try {
    await jose.jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

// POST /api/auth/login
export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ password: z.string().min(1) }))
  .handler(async ({ data }) => {
    const hash = getPasswordHash();
    const valid = await bcrypt.compare(data.password, hash);
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
