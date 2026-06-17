import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

/**
 * Password hashing for the optional username/password login path. Uses Node's
 * built-in scrypt (memory-hard KDF) — no external dependency. Hashes are stored
 * in `User.passwordHash` as a self-describing string:
 *
 *   scrypt$<N>$<r>$<p>$<saltHex>$<hashHex>
 *
 * so the cost params travel with the hash and can be upgraded later without a
 * migration. Verification is constant-time (timingSafeEqual).
 */

const scrypt = promisify(_scrypt) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

// N=16384 (2^14), r=8, p=1 → ~16MB, fits Node's default 32MB maxmem and is
// comfortably above the throwaway-cost threshold for a learner app.
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  const salt = Buffer.from(parts[4], "hex");
  const expected = Buffer.from(parts[5], "hex");
  if (salt.length === 0 || expected.length === 0) return false;
  let derived: Buffer;
  try {
    derived = await scrypt(password, salt, expected.length, { N: n, r, p });
  } catch {
    return false;
  }
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/**
 * Shared username rules, used by both the API boundary and the UI hint. A login
 * ID is 3–30 chars of lowercase letters, digits, dot or underscore. We lowercase
 * before validating so "Minh_IELTS" and "minh_ielts" are the same account.
 */
export const USERNAME_RE = /^[a-z0-9._]{3,30}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}
