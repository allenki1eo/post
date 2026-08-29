/**
 * Deterministic check-in and dose scheduling.
 *
 * Dose identifiers are UTC-based and stable, but a patient's "day" is local.
 * The initial setting (Tanzania, UTC+03:00, no daylight saving) is modeled as
 * a fixed offset; a timezone database is introduced with the backend, when
 * schedules become server-authoritative.
 */
import { expectedDoseIdsForRange } from '../../domain/adherence';
import type { CarePlan } from '../../domain/models';

/** Fixed offsets, in minutes, for the timezones the demo supports. */
const FIXED_OFFSETS_MINUTES: Record<string, number> = {
  'Africa/Dar_es_Salaam': 180,
  'Africa/Nairobi': 180,
  UTC: 0,
};

export function utcOffsetMinutesFor(timezone: string): number {
  return FIXED_OFFSETS_MINUTES[timezone] ?? 0;
}

export interface LocalDayRange {
  /** Local calendar date, YYYY-MM-DD. */
  localDate: string;
  startIso: string;
  endIso: string;
}

/** The UTC instant range covering the local calendar day containing `instantIso`. */
export function localDayRange(instantIso: string, timezone: string): LocalDayRange {
  const offsetMs = utcOffsetMinutesFor(timezone) * 60_000;
  const localMs = Date.parse(instantIso) + offsetMs;
  const localDayStartMs = Math.floor(localMs / 86_400_000) * 86_400_000;
  return {
    localDate: new Date(localDayStartMs).toISOString().slice(0, 10),
    startIso: new Date(localDayStartMs - offsetMs).toISOString(),
    endIso: new Date(localDayStartMs + 86_400_000 - offsetMs).toISOString(),
  };
}

/** Stable schedule id: one scheduled check-in per care plan per local day. */
export function scheduleIdFor(carePlanId: string, localDate: string): string {
  return `${carePlanId}:${localDate}`;
}

export interface TodaysSchedule {
  scheduleId: string;
  localDate: string;
  expectedDoseIds: string[];
  /** Day N of the plan, clamped to the plan's length. */
  planDay?: number;
  planTotalDays?: number;
}

export function todaysSchedule(plan: CarePlan, timezone: string, nowIso: string): TodaysSchedule {
  const day = localDayRange(nowIso, timezone);
  const expectedDoseIds = expectedDoseIdsForRange(plan, day.startIso, day.endIso);

  const planTotalDays =
    plan.endsAt === undefined
      ? undefined
      : Math.max(1, Math.round((Date.parse(plan.endsAt) - Date.parse(plan.startsAt)) / 86_400_000));
  const elapsedDays = Math.floor((Date.parse(nowIso) - Date.parse(plan.startsAt)) / 86_400_000) + 1;
  const planDay =
    planTotalDays === undefined ? undefined : Math.min(planTotalDays, Math.max(1, elapsedDays));

  return {
    scheduleId: scheduleIdFor(plan.id, day.localDate),
    localDate: day.localDate,
    expectedDoseIds,
    ...(planDay !== undefined ? { planDay } : {}),
    ...(planTotalDays !== undefined ? { planTotalDays } : {}),
  };
}

/**
 * Schedule ids for days that have passed without a stored check-in, bounded to
 * the plan window. Used to count missed check-ins for the local rule evaluator.
 */
export function missedScheduleIds(
  plan: CarePlan,
  timezone: string,
  nowIso: string,
  completedScheduleIds: readonly string[],
): string[] {
  const completed = new Set(completedScheduleIds);
  const missed: string[] = [];
  const today = localDayRange(nowIso, timezone).localDate;
  const planEnd = plan.endsAt ? Date.parse(plan.endsAt) : Date.parse(nowIso);
  const lastDayMs = Math.min(Date.parse(nowIso), planEnd);

  for (let dayMs = Date.parse(plan.startsAt); dayMs <= lastDayMs; dayMs += 86_400_000) {
    const { localDate } = localDayRange(new Date(dayMs).toISOString(), timezone);
    // Today is not missed until it ends.
    if (localDate >= today) {
      continue;
    }
    const scheduleId = scheduleIdFor(plan.id, localDate);
    if (!completed.has(scheduleId)) {
      missed.push(scheduleId);
    }
  }
  return missed;
}
