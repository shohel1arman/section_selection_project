// Uses Web Crypto so this module works in both the Node (API routes) and
// Edge (middleware) runtimes.

const COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours
const encoder = new TextEncoder();

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "SESSION_SECRET env var is required and must be at least 16 chars",
    );
  }
  return s;
}

function bufToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  // btoa is available in both runtimes
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(value: string): Promise<string> {
  const key = await importKey();
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bufToBase64Url(sig);
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function createSessionCookie() {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `admin.${expires}`;
  const sig = await sign(payload);
  return {
    name: COOKIE_NAME,
    value: `${payload}.${sig}`,
    options: {
      httpOnly: true as const,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    },
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true as const,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    },
  };
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;

export async function verifySessionCookie(
  raw: string | undefined | null,
): Promise<boolean> {
  if (!raw) return false;
  const parts = raw.split(".");
  if (parts.length !== 3) return false;
  const [role, expStr, sig] = parts;
  if (role !== "admin") return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = await sign(`${role}.${expStr}`);
  return timingSafeEqualString(sig, expected);
}
