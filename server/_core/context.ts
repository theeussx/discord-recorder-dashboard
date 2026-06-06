import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { verifySessionToken } from "./simpleAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    let cookie: string | null = null;
    if (opts.req.cookies && opts.req.cookies[COOKIE_NAME]) {
      cookie = opts.req.cookies[COOKIE_NAME];
    } else if (opts.req.headers && typeof opts.req.headers.cookie === "string") {
      const raw = opts.req.headers.cookie.split(";").map(s => s.trim());
      for (const part of raw) {
        const [k, v] = part.split("=");
        if (k === COOKIE_NAME) {
          cookie = decodeURIComponent(v || "");
          break;
        }
      }
    }
    if (cookie) {
      const payload = await verifySessionToken(cookie as string);
      if (payload?.username) {
        user = {
          id: 0,
          openId: payload.username,
          name: payload.username,
          email: null,
          loginMethod: "local",
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        } as unknown as User;
      }
    }
  } catch (error) {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
