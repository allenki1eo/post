import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { applyQuietHours, backoffFrom, localDate, localInstant } from '../src/domain/time.js';

const TZ = 'Africa/Dar_es_Salaam'; // UTC+3, no DST

describe('local wall clock', () => {
  it('turns a local promise into the right UTC instant', () => {
    const instant = localInstant('2026-09-01', '08:00', TZ);
    expect(instant.toISOString()).toBe('2026-09-01T05:00:00.000Z');
    expect(localDate(instant, TZ)).toBe('2026-09-01');
  });

  it('keeps the local date across the UTC day boundary', () => {
    // 01:00 local on the 2nd is 22:00 UTC on the 1st — storing the UTC date
    // would file this dose under the wrong day.
    const instant = localInstant('2026-09-02', '01:00', TZ);
    expect(instant.toISOString()).toBe('2026-09-01T22:00:00.000Z');
    expect(localDate(instant, TZ)).toBe('2026-09-02');
  });
});

describe('quiet hours', () => {
  const quiet = { start: 21, end: 6 };

  it('leaves a daytime dose alone', () => {
    const at = localInstant('2026-09-01', '08:00', TZ);
    expect(applyQuietHours(at, TZ, quiet)).toEqual({ sendAt: at, deferred: false });
  });

  it('sends a late-evening dose early, not late', () => {
    const at = localInstant('2026-09-01', '22:00', TZ);
    const { sendAt, deferred } = applyQuietHours(at, TZ, quiet);
    expect(deferred).toBe(true);
    // A reminder that arrives after the dose is useless, so 22:00 sends at 21:00.
    expect(DateTime.fromJSDate(sendAt, { zone: TZ }).toFormat('yyyy-MM-dd HH:mm'))
      .toBe('2026-09-01 21:00');
    expect(sendAt.getTime()).toBeLessThan(at.getTime());
  });

  it('holds an overnight dose until morning', () => {
    const at = localInstant('2026-09-02', '02:00', TZ);
    const { sendAt, deferred } = applyQuietHours(at, TZ, quiet);
    expect(deferred).toBe(true);
    expect(DateTime.fromJSDate(sendAt, { zone: TZ }).toFormat('yyyy-MM-dd HH:mm'))
      .toBe('2026-09-02 06:00');
  });

  it('respects the patient timezone, not the server timezone', () => {
    const lagos = 'Africa/Lagos'; // UTC+1
    const at = localInstant('2026-09-01', '20:30', lagos);
    expect(applyQuietHours(at, lagos, quiet).deferred).toBe(false);
  });
});

describe('retry backoff', () => {
  it('grows 1, 5, 25 minutes', () => {
    const now = new Date('2026-09-01T08:00:00Z');
    const minutes = (d: Date) => (d.getTime() - now.getTime()) / 60_000;
    expect(minutes(backoffFrom(now, 1))).toBe(1);
    expect(minutes(backoffFrom(now, 2))).toBe(5);
    expect(minutes(backoffFrom(now, 3))).toBe(25);
  });
});
