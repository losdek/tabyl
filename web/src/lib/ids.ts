import { createHash, randomBytes } from "node:crypto";

const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz"; // no 0/1/l/o — easy to read aloud

/** Short random id, e.g. for ads (`/ad/k7m2p9xq4t`). */
export function shortId(len = 10): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function token(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}
