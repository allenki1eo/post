import { DateTime } from 'luxon';
import { config } from '../config.js';

/**
 * Wall-clock promises are local ("08:00 in Dar es Salaam"), instants are UTC.
 * Everything in here converts between the two. (DECISIONS.md D5)
 */

export function localInstant(date: string, time: string, timezone: string): Date {
  const parts = time.split(':');
  const dt = DateTime.fromISO(date, { zone: timezone }).set({
    hour: Number(parts[0] ?? 0),
    minute: Number(parts[1] ?? 0),
    second: 0,
    millisecond: 0,
  });
  if (!dt.isValid) throw new Error(`invalid local time ${date} ${time} ${timezone}`);
  return dt.toJSDate();
}

export function localDate(instant: Date, timezone: string): string {
  return DateTime.fromJSDate(instant, { zone: timezone }).toISODate()!;
}

export function localTimeLabel(instant: Date, timezone: string): string {
  return DateTime.fromJSDate(instant, { zone: timezone }).toFormat('HH:mm');
}

export function addDays(date: string, days: number): string {
  return DateTime.fromISO(date).plus({ days }).toISODate()!;
}

export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = DateTime.fromISO(from);
  const end = DateTime.fromISO(to);
  while (cursor <= end) {
    out.push(cursor.toISODate()!);
    cursor = cursor.plus({ days: 1 });
  }
  return out;
}

export interface QuietHoursResult {
  sendAt: Date;
  deferred: boolean;
}

/**
 * Clamp a send instant out of the patient's quiet hours.
 *
 * A dose at 22:00 sends at 21:00 — earlier, not later, because a reminder that
 * arrives after the dose is useless. The body always names the real dose time,
 * so an early send is still actionable. A 02:00 dose sends at 06:00 the same
 * local morning. Waking a recovering patient loses the relationship. (D7)
 */
export function applyQuietHours(
  instant: Date,
  timezone: string,
  quiet = config.quietHours,
): QuietHoursResult {
  const dt = DateTime.fromJSDate(instant, { zone: timezone });
  const hour = dt.hour;
  const inEvening = hour >= quiet.start;
  const inNight = hour < quiet.end;
  if (!inEvening && !inNight) return { sendAt: instant, deferred: false };

  const target = inEvening
    ? dt.set({ hour: quiet.start, minute: 0, second: 0, millisecond: 0 })
    : dt.set({ hour: quiet.end, minute: 0, second: 0, millisecond: 0 });

  return { sendAt: target.toJSDate(), deferred: true };
}

/** Exponential backoff for a failed send: 1min, 5min, 25min. */
export function backoffFrom(now: Date, attempts: number): Date {
  const minutes = 1 * Math.pow(5, Math.max(0, attempts - 1));
  return new Date(now.getTime() + minutes * 60_000);
}
