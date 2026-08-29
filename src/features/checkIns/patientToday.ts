/**
 * The patient's current follow-up state, assembled from the repository (plan
 * and template) and the local store (check-ins, sync state).
 *
 * The active plan and its template are cached locally on every successful load
 * so Today, the check-in wizard, and local urgent-rule evaluation keep working
 * with no connectivity.
 */
import type { CarePlan, CarePlanTemplate, Patient, SyncStatus } from '../../domain/models';
import { getRepository } from '../../repositories';
import { getLocalStore } from '../../storage';
import type { LocalStore, StoredCheckIn } from '../../storage/types';
import { findCheckInForSchedule } from './checkInService';
import { todaysSchedule, type TodaysSchedule } from './schedule';

export interface PatientTodayState {
  patient: Patient | undefined;
  carePlan: CarePlan | undefined;
  template: CarePlanTemplate | undefined;
  schedule: TodaysSchedule | undefined;
  /** Today's check-in, when the patient has already completed it. */
  todaysCheckIn: StoredCheckIn | undefined;
  recentCheckIns: StoredCheckIn[];
  unsyncedCount: number;
  /** Worst sync state across local check-ins; drives the Today indicator. */
  syncStatus: SyncStatus;
  usingCachedPlan: boolean;
}

export async function loadPatientToday(
  patientId: string,
  nowIso: string = new Date().toISOString(),
  store?: LocalStore,
): Promise<PatientTodayState> {
  const localStore = store ?? (await getLocalStore());
  const repository = getRepository();

  const patient = await repository.getPatient(patientId);
  const timezone = patient?.timezone ?? 'UTC';

  let carePlan: CarePlan | undefined;
  let template: CarePlanTemplate | undefined;
  let usingCachedPlan = false;

  try {
    carePlan = await repository.getActiveCarePlan(patientId);
    template = carePlan
      ? (await repository.getCarePlanTemplates()).find(
          (candidate) =>
            candidate.id === carePlan!.templateId &&
            candidate.version === carePlan!.templateVersion,
        )
      : undefined;
    if (carePlan && template) {
      await localStore.cacheActiveCarePlan({
        patientId,
        carePlan,
        template,
        cachedAt: nowIso,
      });
    }
  } catch {
    // Offline or backend unavailable: fall back to the cached plan so the
    // patient can still check in and see clinic-authored urgent instructions.
    const cached = await localStore.getCachedActiveCarePlan(patientId);
    if (cached) {
      carePlan = cached.carePlan;
      template = cached.template;
      usingCachedPlan = true;
    }
  }

  const schedule = carePlan ? todaysSchedule(carePlan, timezone, nowIso) : undefined;
  const recentCheckIns = await localStore.listCheckIns(patientId);
  const todaysCheckIn = schedule
    ? await findCheckInForSchedule(localStore, patientId, schedule.scheduleId)
    : undefined;
  const unsyncedCount = await localStore.countUnsyncedCheckIns();

  return {
    patient,
    carePlan,
    template,
    schedule,
    todaysCheckIn,
    recentCheckIns,
    unsyncedCount,
    syncStatus: worstSyncStatus(recentCheckIns),
    usingCachedPlan,
  };
}

function worstSyncStatus(checkIns: readonly StoredCheckIn[]): SyncStatus {
  if (checkIns.some((checkIn) => checkIn.syncStatus === 'failed')) {
    return 'failed';
  }
  if (checkIns.some((checkIn) => checkIn.syncStatus === 'syncing')) {
    return 'syncing';
  }
  if (checkIns.some((checkIn) => checkIn.syncStatus === 'local')) {
    return 'local';
  }
  return 'synced';
}
