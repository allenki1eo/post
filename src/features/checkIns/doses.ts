/**
 * Dose identifier helpers.
 *
 * A dose id is `${instructionId}@${YYYY-MM-DD}T${HH:mm}` (UTC). The patient
 * never sees the identifier — only the clinician's own wording and the local
 * clock time.
 */
import type { CarePlan } from '../../domain/models';
import { utcOffsetMinutesFor } from './schedule';

export interface DoseDescription {
  doseId: string;
  instructionId: string;
  displayName: string;
  /** Local HH:mm for the patient's timezone. */
  localTime: string;
}

export function describeDose(
  doseId: string,
  plan: Pick<CarePlan, 'medicationInstructions'>,
  timezone: string,
): DoseDescription {
  const [instructionId, timestamp] = doseId.split('@');
  const instruction = plan.medicationInstructions.find(
    (candidate) => candidate.id === instructionId,
  );
  const utcMs = Date.parse(`${timestamp}:00.000Z`);
  const localMs = utcMs + utcOffsetMinutesFor(timezone) * 60_000;
  return {
    doseId,
    instructionId,
    displayName: instruction?.displayName ?? instructionId,
    localTime: Number.isNaN(localMs)
      ? (timestamp?.split('T')[1] ?? '')
      : new Date(localMs).toISOString().slice(11, 16),
  };
}

export function describeDoses(
  doseIds: readonly string[],
  plan: Pick<CarePlan, 'medicationInstructions'>,
  timezone: string,
): DoseDescription[] {
  return doseIds.map((doseId) => describeDose(doseId, plan, timezone));
}
