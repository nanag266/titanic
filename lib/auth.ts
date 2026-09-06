import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "tcv_admin";
const TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  email: string;
  exp: number;
};

const secret = () => process.env.SESSION_SECRET ?? "";

const sign = (payload: string) =>
  crypto.createHmac("sha256", secret()).update(payload).digest("base64url");

export const createSessionToken = (email: string): string => {
  const payload: SessionPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
};

export const verifySessionToken = (token?: string): SessionPayload | null => {
  if (!token || !secret()) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
};

export const isAdminRequest = async (): Promise<boolean> => {
  const cookieStore = await cookies();
  return Boolean(verifySessionToken(cookieStore.get(COOKIE_NAME)?.value));
};

export const adminCookie = {
  name: COOKIE_NAME,
  maxAge: TTL_SECONDS
};

export const secureCompare = (left: string, right: string): boolean => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};
