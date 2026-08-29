/**
 * Deterministic medication-adherence calculation.
 *
 * Invariants (POST specification §10):
 * - Adherence is `confirmed / expected` shown as a fraction, never only a percentage.
 * - If expected is zero the result is `not_applicable`, not 100%.
 * - An unconfirmed dose is never inferred as taken.
 * - `confirmedDoseIds` outside `expectedDoseIds` are ignored (and rejected at
 *   schema level); duplicates count once.
 *
 * A model must never perform this calculation.
 */
import type { CarePlan, CheckInResponse, EvidenceReference } from './models';

export type AdherenceResult =
  | {
      kind: 'ratio';
      confirmed: number;
      expected: number;
      /** Convenience value derived from the fraction; UI must still show the fraction. */
      fraction: number;
      evidenceReferences: EvidenceReference[];
    }
  | { kind: 'not_applicable'; evidenceReferences: EvidenceReference[] };

export function calculateAdherence(checkIns: readonly CheckInResponse[]): AdherenceResult {
  const expected = new Set<string>();
  const confirmed = new Set<string>();
  const evidenceReferences: EvidenceReference[] = checkIns.map((checkIn) => ({
    type: 'check_in',
    id: checkIn.id,
  }));

  for (const checkIn of checkIns) {
    for (const doseId of checkIn.expectedDoseIds) {
      expected.add(doseId);
    }
    for (const doseId of checkIn.confirmedDoseIds) {
      // Only count confirmations for doses that were actually expected.
      if (checkIn.expectedDoseIds.includes(doseId)) {
        confirmed.add(doseId);
      }
    }
  }

  if (expected.size === 0) {
    return { kind: 'not_applicable', evidenceReferences };
  }

  return {
    kind: 'ratio',
    confirmed: confirmed.size,
    expected: expected.size,
    fraction: confirmed.size / expected.size,
    evidenceReferences,
  };
}

/**
 * Deterministically derive the expected dose identifiers for a care plan over
 * a UTC date range (inclusive start, exclusive end). Dose IDs are stable:
 * `${instructionId}@${YYYY-MM-DD}T${HH:mm}` so retries and devices agree.
 */
export function expectedDoseIdsForRange(
  plan: Pick<CarePlan, 'medicationInstructions'>,
  rangeStartIso: string,
  rangeEndIso: string,
): string[] {
  const rangeStart = Date.parse(rangeStartIso);
  const rangeEnd = Date.parse(rangeEndIso);
  const doseIds: string[] = [];

  for (const instruction of plan.medicationInstructions) {
    const instructionStart = Date.parse(instruction.startsAt);
    const instructionEnd = instruction.endsAt ? Date.parse(instruction.endsAt) : Infinity;
    for (let dayMs = startOfUtcDay(rangeStart); dayMs < rangeEnd; dayMs += DAY_MS) {
      for (const time of instruction.scheduledTimes) {
        const [hours, minutes] = time.split(':').map(Number);
        const doseAt = dayMs + hours * 3600_000 + minutes * 60_000;
        if (
          doseAt >= rangeStart &&
          doseAt < rangeEnd &&
          doseAt >= instructionStart &&
          doseAt <= instructionEnd
        ) {
          doseIds.push(`${instruction.id}@${new Date(doseAt).toISOString().slice(0, 16)}`);
        }
      }
    }
  }

  return doseIds.sort();
}

const DAY_MS = 24 * 3600_000;

function startOfUtcDay(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

export function formatAdherenceFraction(result: AdherenceResult): string {
  if (result.kind === 'not_applicable') {
    return 'not_applicable';
  }
  return `${result.confirmed} / ${result.expected}`;
}
