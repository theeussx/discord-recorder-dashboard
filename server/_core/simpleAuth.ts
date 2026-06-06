import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";
import { ONE_YEAR_MS } from "@shared/const";
import { createSecretKey } from "crypto";

function getKey() {
  const secret = ENV.cookieSecret || process.env.JWT_SECRET || "dev-secret";
  return createSecretKey(Buffer.from(secret));
}

export async function createSessionToken(payload: { username: string }) {
  const key = getKey();
  const exp = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);

  const token = await new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.username)
    .setExpirationTime(exp)
    .sign(key as any);

  return token;
}

export async function verifySessionToken(token: string) {
  try {
    const key = getKey();
    const { payload } = await jwtVerify(token, key as any);
    return payload as { username?: string } | null;
  } catch (err) {
    return null;
  }
}

export default { createSessionToken, verifySessionToken };
