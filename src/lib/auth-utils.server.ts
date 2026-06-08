import * as bcrypt from 'bcryptjs';
import * as jose from 'jose';

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

export async function signToken(): Promise<string> {
  return new jose.SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL}s`)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jose.jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function comparePassword(password: string): Promise<boolean> {
  const hash = getPasswordHash();
  return bcrypt.compare(password, hash);
}

export { TOKEN_TTL };
