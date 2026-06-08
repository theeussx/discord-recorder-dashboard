import { loginFn, logoutFn, meFn } from './auth-functions';

// Lê o cookie de sinalização (não-httpOnly) — só indica se há sessão ativa
// O JWT real fica no cookie httpOnly e nunca é acessível via JS
const SESSION_KEY = 'wr_session';

export function hasSessionSync(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some(c => c.trim().startsWith(`${SESSION_KEY}=`));
}

export async function signIn(password: string): Promise<void> {
  await loginFn({ data: { password } });
}

export async function signOut(): Promise<void> {
  await logoutFn();
}

export async function checkSession(): Promise<boolean> {
  try {
    await meFn();
    return true;
  } catch {
    return false;
  }
}

export function displayName(): string {
  return 'Admin';
}
