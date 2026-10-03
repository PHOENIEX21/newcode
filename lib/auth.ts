import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE = "mma_admin";

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET is missing");
  return s;
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || password.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expected));
}

export function makeAdminToken() {
  const payload = `admin:${Math.floor(Date.now()/1000/86400)}`;
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function validAdminToken(token?: string) {
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx+1);
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  const [,dayRaw] = payload.split(":");
  const day = Number(dayRaw);
  const nowDay = Math.floor(Date.now()/1000/86400);
  return Number.isFinite(day) && Math.abs(nowDay-day) <= 7;
}

export async function isAdmin() {
  const store = await cookies();
  return validAdminToken(store.get(COOKIE)?.value);
}

export const adminCookieName = COOKIE;
