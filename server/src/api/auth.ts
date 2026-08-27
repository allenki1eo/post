import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import { one } from '../db.js';

const scrypt = promisify(scryptCb) as (
  password: string, salt: string, keylen: number,
) => Promise<Buffer>;

const TOKEN_TTL_MS = 12 * 3_600_000;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const key = await scrypt(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return key.length === expected.length && timingSafeEqual(key, expected);
}

function sign(payload: string): string {
  return createHmac('sha256', config.sessionSecret).update(payload).digest('base64url');
}

export function issueToken(doctorId: string, now = Date.now()): string {
  const payload = `${doctorId}.${now + TOKEN_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string, now = Date.now()): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [doctorId, expiry, signature] = parts as [string, string, string];
  const expected = sign(`${doctorId}.${expiry}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(expiry) < now) return null;
  return doctorId;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      doctorId?: string;
    }
  }
}

/**
 * Role-based access starts here: the doctor id comes from the signed token and
 * never from the request body, so a doctor cannot address another doctor's
 * patients by guessing an id. Every patient query filters on it. (PRODUCT.md §8)
 */
export async function requireDoctor(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const doctorId = token ? verifyToken(token) : null;
  if (!doctorId) {
    res.status(401).json({ error: 'authentication required' });
    return;
  }
  const doctor = await one<{ id: string }>('select id from doctors where id = $1', [doctorId]);
  if (!doctor) {
    res.status(401).json({ error: 'authentication required' });
    return;
  }
  req.doctorId = doctorId;
  next();
}
