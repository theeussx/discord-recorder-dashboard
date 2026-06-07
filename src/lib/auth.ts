import { loginFn, logoutFn, meFn } from './auth.server';

const TOKEN_KEY = 'wr_token';

export function hasSessionSync(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes(`${TOKEN_KEY}=`);
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
