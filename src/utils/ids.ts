/**
 * Opaque identifier and random-token generation.
 *
 * The random source is injectable so tests stay deterministic and so the demo
 * never depends on native crypto being present in Jest. On device we prefer
 * `crypto.getRandomValues` when the runtime provides it.
 */

export type RandomSource = (byteCount: number) => Uint8Array;

function defaultRandomSource(byteCount: number): Uint8Array {
  const out = new Uint8Array(byteCount);
  const cryptoObject = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObject?.getRandomValues) {
    cryptoObject.getRandomValues(out);
    return out;
  }
  // Demo-only fallback. A production backend must never issue share tokens
  // from a non-cryptographic source.
  for (let i = 0; i < byteCount; i += 1) {
    out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}

const HEX = '0123456789abcdef';

export function newId(random: RandomSource = defaultRandomSource): string {
  const bytes = random(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  let hex = '';
  for (const b of bytes) {
    hex += HEX[b >> 4] + HEX[b & 0x0f];
  }
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

/** Unambiguous alphabet (no 0/O, 1/I/L) for human-readable access codes. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newOpaqueToken(length = 24, random: RandomSource = defaultRandomSource): string {
  const bytes = random(length);
  let token = '';
  for (let i = 0; i < length; i += 1) {
    token += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return token;
}
