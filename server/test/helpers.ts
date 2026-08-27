import request from 'supertest';
import { DateTime } from 'luxon';
import { createApp } from '../src/api/app.js';

export const TZ = 'Africa/Dar_es_Salaam';
export const app = createApp();
export const api = () => request(app);

/** Local wall clock in the patient's timezone -> a UTC instant, for `tick(now)`. */
export function at(date: string, time: string): Date {
  return DateTime.fromISO(`${date}T${time}`, { zone: TZ }).toJSDate();
}

export function today(): string {
  return DateTime.now().setZone(TZ).toISODate()!;
}

export function plusDays(date: string, days: number): string {
  return DateTime.fromISO(date).plus({ days }).toISODate()!;
}

export interface Doctor {
  id: string;
  token: string;
  auth: (req: request.Test) => request.Test;
}

export async function registerDoctor(overrides: Partial<{ name: string; phone: string }> = {}): Promise<Doctor> {
  const phone = overrides.phone ?? `07${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
  const res = await api()
    .post('/api/auth/register')
    .send({
      name: overrides.name ?? 'Mwakalinga',
      phone,
      password: 'correct horse battery',
      specialty: 'Internal medicine',
      facility: 'Muhimbili National Hospital',
    })
    .expect(201);

  const token = res.body.token as string;
  return {
    id: res.body.doctor.id,
    token,
    auth: (req) => req.set('authorization', `Bearer ${token}`),
  };
}

export async function addPatient(
  doctor: Doctor,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; phone: string }> {
  const phone = (overrides.phone as string) ?? `07${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
  const res = await doctor
    .auth(api().post('/api/patients'))
    .send({
      name: 'Asha Mrisho',
      phone,
      diagnosis: 'Community-acquired pneumonia',
      treatment_summary: 'IV ceftriaxone 48h, discharged on oral amoxicillin',
      discharge_date: today(),
      consent_sms: true,
      phone_is_personal: true,
      language: 'sw',
      timezone: TZ,
      ...overrides,
    })
    .expect(201);
  return { id: res.body.patient.id, phone: res.body.patient.phone };
}

/** A five-day antibiotic course, twice daily, plus one follow-up visit. */
export async function addStandardPlan(doctor: Doctor, patientId: string, start = plusDays(today(), 1)) {
  const res = await doctor
    .auth(api().post(`/api/patients/${patientId}/care-plans`))
    .send({
      red_flag_symptoms: ['Kupumua kwa shida', 'Homa kali'],
      medications: [
        {
          name: 'Amoxicillin',
          dosage: 'vidonge 2',
          times: ['08:00', '20:00'],
          start_date: start,
          end_date: plusDays(start, 4),
        },
      ],
      follow_up_visits: [
        {
          visit_date: plusDays(start, 6),
          location: 'Kliniki ya Sinza',
          reminder_lead_days: [3, 1],
        },
      ],
    })
    .expect(201);
  return { start, ...res.body };
}
