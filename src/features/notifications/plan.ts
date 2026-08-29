/**
 * Notification planning (pure).
 *
 * Reminders come from the active care plan only. Two rules shape the copy:
 *
 * - medication reminders use the clinician's exact wording, never a rewrite;
 * - by default nothing identifying — medicine name, symptom, diagnosis, or
 *   workflow status — appears in lock-screen text. The patient can opt in to
 *   previews, and only then is the clinician wording shown on the lock screen.
 */
import type { CarePlan, LocalizedText, SupportedLanguage } from '../../domain/models';
import { localDayRange, scheduleIdFor, utcOffsetMinutesFor } from '../checkIns/schedule';

export interface NotificationPreferences {
  enabled: boolean;
  /** False (the default) keeps medicine names off the lock screen. */
  showPreviews: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  showPreviews: false,
};

export interface PlannedNotification {
  /** Stable id so rescheduling replaces rather than duplicates. */
  id: string;
  kind: 'medication_reminder' | 'check_in_due';
  triggerAtIso: string;
  title: string;
  body: string;
  /** Deep link target for the notification tap. */
  route: string;
}

export interface PlanNotificationsInput {
  carePlan: CarePlan;
  timezone: string;
  language: SupportedLanguage;
  preferences: NotificationPreferences;
  /** Neutral, localized fallback copy (from the i18n bundle). */
  strings: {
    medicationTitle: string;
    checkInTitle: string;
    checkInBody: string;
    /** Neutral body used when previews are off. */
    neutralBody: string;
  };
  nowIso: string;
  /** How many days ahead to schedule locally. */
  days?: number;
}

export function planNotifications(input: PlanNotificationsInput): PlannedNotification[] {
  if (!input.preferences.enabled) {
    return [];
  }

  const planned: PlannedNotification[] = [];
  const offsetMs = utcOffsetMinutesFor(input.timezone) * 60_000;
  const nowMs = Date.parse(input.nowIso);
  const horizonDays = input.days ?? 7;
  const planEndMs = input.carePlan.endsAt ? Date.parse(input.carePlan.endsAt) : Infinity;

  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const dayInstant = new Date(nowMs + dayOffset * 86_400_000).toISOString();
    const { localDate } = localDayRange(dayInstant, input.timezone);

    for (const instruction of input.carePlan.medicationInstructions) {
      for (const time of instruction.scheduledTimes) {
        const triggerMs = localInstantMs(localDate, time, offsetMs);
        if (triggerMs <= nowMs || triggerMs > planEndMs) {
          continue;
        }
        if (triggerMs < Date.parse(instruction.startsAt)) {
          continue;
        }
        planned.push({
          id: `medication:${instruction.id}:${localDate}T${time}`,
          kind: 'medication_reminder',
          triggerAtIso: new Date(triggerMs).toISOString(),
          title: input.strings.medicationTitle,
          body: input.preferences.showPreviews
            ? localized(instruction.clinicianWording, input.language)
            : input.strings.neutralBody,
          route: '/(patient)/today',
        });
      }
    }

    for (const time of input.carePlan.checkInSchedule.timesOfDay) {
      const triggerMs = localInstantMs(localDate, time, offsetMs);
      if (triggerMs <= nowMs || triggerMs > planEndMs) {
        continue;
      }
      planned.push({
        id: `check_in:${input.carePlan.id}:${localDate}T${time}`,
        kind: 'check_in_due',
        triggerAtIso: new Date(triggerMs).toISOString(),
        title: input.strings.checkInTitle,
        // Neutral either way: a check-in reminder never names a symptom.
        body: input.strings.checkInBody,
        route: `/(patient)/check-in/${encodeURIComponent(scheduleIdFor(input.carePlan.id, localDate))}`,
      });
    }
  }

  return planned.sort((a, b) => a.triggerAtIso.localeCompare(b.triggerAtIso));
}

function localInstantMs(localDate: string, localTime: string, offsetMs: number): number {
  return Date.parse(`${localDate}T${localTime}:00.000Z`) - offsetMs;
}

function localized(text: LocalizedText, language: SupportedLanguage): string {
  return text[language];
}
