/**
 * Minimal admin auth — single shared password, HMAC-signed session cookie.
 * No user table, no external service. Set ADMIN_PASSWORD + AUTH_SECRET in env.
 *
 * Runs in the Node runtime (uses node:crypto), so guard admin pages/actions by
 * calling requireAdmin() in the admin layout and in every server action / API.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  return process.env.AUTH_SECRET ?? "";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Verify the submitted password against ADMIN_PASSWORD. */
export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || !secret()) return false;
  return safeEqual(input, expected);
}

export function makeSessionValue(): string {
  const exp = Date.now() + MAX_AGE * 1000;
  return `${exp}.${sign(String(exp))}`;
}

function isValid(value: string | undefined): boolean {
  if (!value || !secret()) return false;
  const [expStr, mac] = value.split(".");
  if (!expStr || !mac) return false;
  if (!safeEqual(mac, sign(expStr))) return false;
  return Number(expStr) > Date.now();
}

export async function setSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, makeSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  return isValid(store.get(COOKIE)?.value);
}

/** Redirect to login if not authenticated. Call at the top of admin work. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAuthed())) redirect("/admin/login");
}

/** True when the admin feature is configured (env present). */
export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.AUTH_SECRET);
}
