import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import type { CarePlan, SupportedLanguage } from '../../domain/models';
import { planNotifications } from './plan';
import { loadNotificationPreferences, rescheduleNotifications } from './scheduler';

/**
 * Keeps local reminders in step with the active care plan, the patient's saved
 * language, and their notification preferences. Rescheduling is a full replace,
 * so a plan or language change never leaves stale reminders behind.
 */
export function useScheduledReminders(carePlan: CarePlan | undefined, timezone: string): void {
  const { t, i18n } = useTranslation();
  const language = (i18n.language === 'sw' ? 'sw' : 'en') as SupportedLanguage;

  useEffect(() => {
    if (!carePlan) {
      return;
    }
    let cancelled = false;

    (async () => {
      const preferences = await loadNotificationPreferences();
      if (cancelled) {
        return;
      }
      const planned = planNotifications({
        carePlan,
        timezone,
        language,
        preferences,
        strings: {
          medicationTitle: t('notifications.medicationTitle'),
          checkInTitle: t('notifications.checkInDueTitle'),
          checkInBody: t('notifications.checkInDueBody'),
          neutralBody: t('notifications.checkInDueBody'),
        },
        nowIso: new Date().toISOString(),
      });
      if (!cancelled) {
        await rescheduleNotifications(planned);
      }
    })().catch(() => {
      // Reminders are best-effort; failing to schedule never blocks care.
    });

    return () => {
      cancelled = true;
    };
  }, [carePlan, timezone, language, t]);
}
