import {
  calculateAdherence,
  expectedDoseIdsForRange,
  formatAdherenceFraction,
} from '../src/domain/adherence';
import type { CheckInResponse } from '../src/domain/models';

function checkIn(partial: Partial<CheckInResponse> & { id: string }): CheckInResponse {
  return {
    scheduleId: `sch-${partial.id}`,
    carePlanId: 'plan-1',
    patientId: 'patient-1',
    answers: [],
    expectedDoseIds: [],
    confirmedDoseIds: [],
    completedAt: '2026-08-19T19:30:00.000Z',
    deviceCreatedAt: '2026-08-19T19:30:00.000Z',
    syncStatus: 'synced',
    ...partial,
  };
}

describe('calculateAdherence', () => {
  it('returns the confirmed/expected fraction with numerator and denominator', () => {
    const result = calculateAdherence([
      checkIn({ id: 'a', expectedDoseIds: ['d1', 'd2'], confirmedDoseIds: ['d1'] }),
      checkIn({ id: 'b', expectedDoseIds: ['d3', 'd4'], confirmedDoseIds: ['d3', 'd4'] }),
    ]);
    expect(result).toMatchObject({ kind: 'ratio', confirmed: 3, expected: 4 });
    expect(formatAdherenceFraction(result)).toBe('3 / 4');
  });

  it('returns not_applicable when zero doses are expected, never 100%', () => {
    const result = calculateAdherence([checkIn({ id: 'a' })]);
    expect(result.kind).toBe('not_applicable');
    expect(formatAdherenceFraction(result)).toBe('not_applicable');
  });

  it('counts duplicate confirmations once', () => {
    const result = calculateAdherence([
      checkIn({ id: 'a', expectedDoseIds: ['d1', 'd2'], confirmedDoseIds: ['d1', 'd1'] }),
    ]);
    expect(result).toMatchObject({ kind: 'ratio', confirmed: 1, expected: 2 });
  });

  it('never infers an unconfirmed dose and ignores confirmations outside the expected set', () => {
    const result = calculateAdherence([
      checkIn({ id: 'a', expectedDoseIds: ['d1'], confirmedDoseIds: [] }),
      checkIn({ id: 'b', expectedDoseIds: ['d2'], confirmedDoseIds: ['d2', 'ghost-dose'] }),
    ]);
    expect(result).toMatchObject({ kind: 'ratio', confirmed: 1, expected: 2 });
  });

  it('carries evidence references for every input check-in', () => {
    const result = calculateAdherence([
      checkIn({ id: 'a', expectedDoseIds: ['d1'], confirmedDoseIds: ['d1'] }),
      checkIn({ id: 'b', expectedDoseIds: ['d2'], confirmedDoseIds: [] }),
    ]);
    expect(result.evidenceReferences).toEqual([
      { type: 'check_in', id: 'a' },
      { type: 'check_in', id: 'b' },
    ]);
  });
});

describe('expectedDoseIdsForRange', () => {
  const plan = {
    medicationInstructions: [
      {
        id: 'med-x',
        displayName: 'Medicine X',
        clinicianWording: { en: 'take it', sw: 'itumie' },
        scheduledTimes: ['08:00', '20:00'],
        startsAt: '2026-08-18T06:00:00.000Z',
        endsAt: '2026-08-20T23:59:00.000Z',
      },
    ],
  };

  it('generates stable, deterministic dose ids across the range', () => {
    const ids = expectedDoseIdsForRange(
      plan,
      '2026-08-18T00:00:00.000Z',
      '2026-08-20T00:00:00.000Z',
    );
    expect(ids).toEqual([
      'med-x@2026-08-18T08:00',
      'med-x@2026-08-18T20:00',
      'med-x@2026-08-19T08:00',
      'med-x@2026-08-19T20:00',
    ]);
    // Deterministic: same inputs, same output.
    expect(
      expectedDoseIdsForRange(plan, '2026-08-18T00:00:00.000Z', '2026-08-20T00:00:00.000Z'),
    ).toEqual(ids);
  });

  it('excludes doses before the instruction starts or after it ends', () => {
    const ids = expectedDoseIdsForRange(
      plan,
      '2026-08-17T00:00:00.000Z',
      '2026-08-22T00:00:00.000Z',
    );
    expect(ids[0]).toBe('med-x@2026-08-18T08:00');
    expect(ids[ids.length - 1]).toBe('med-x@2026-08-20T20:00');
  });

  it('respects partial-day range boundaries (timezone-safe UTC math)', () => {
    const ids = expectedDoseIdsForRange(
      plan,
      '2026-08-18T12:00:00.000Z',
      '2026-08-19T12:00:00.000Z',
    );
    expect(ids).toEqual(['med-x@2026-08-18T20:00', 'med-x@2026-08-19T08:00']);
  });
});
