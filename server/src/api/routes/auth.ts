import { Router } from 'express';
import { z } from 'zod';
import { one } from '../../db.js';
import { normalisePhone } from '../../domain/sms-grammar.js';
import { hashPassword, issueToken, requireDoctor, verifyPassword } from '../auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  password: z.string().min(8),
  specialty: z.string().optional(),
  facility: z.string().optional(), // optional: solo practitioners are in scope (D4)
});

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid body', details: parsed.error.flatten() });
    return;
  }
  const { name, phone, password, specialty, facility } = parsed.data;
  const existing = await one('select id from doctors where phone = $1', [normalisePhone(phone)]);
  if (existing) {
    res.status(409).json({ error: 'a doctor with that phone already exists' });
    return;
  }
  const doctor = await one<{ id: string; name: string }>(
    `insert into doctors (name, phone, password_hash, specialty, facility)
     values ($1, $2, $3, $4, $5) returning id, name`,
    [name, normalisePhone(phone), await hashPassword(password), specialty ?? null, facility ?? null],
  );
  res.status(201).json({ doctor, token: issueToken(doctor!.id) });
});

authRouter.post('/login', async (req, res) => {
  const parsed = z.object({ phone: z.string(), password: z.string() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid body' });
    return;
  }
  const doctor = await one<{ id: string; name: string; password_hash: string }>(
    'select id, name, password_hash from doctors where phone = $1',
    [normalisePhone(parsed.data.phone)],
  );
  // Same response whether the phone is unknown or the password is wrong.
  if (!doctor || !(await verifyPassword(parsed.data.password, doctor.password_hash))) {
    res.status(401).json({ error: 'invalid phone or password' });
    return;
  }
  res.json({
    doctor: { id: doctor.id, name: doctor.name },
    token: issueToken(doctor.id),
  });
});

authRouter.get('/me', requireDoctor, async (req, res) => {
  const doctor = await one(
    'select id, name, specialty, phone, facility from doctors where id = $1',
    [req.doctorId],
  );
  res.json({ doctor });
});
