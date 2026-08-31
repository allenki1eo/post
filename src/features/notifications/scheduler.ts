/**
 * Local notification scheduling (Expo adapter).
 *
 * Only local notifications: the MVP schedules from the active care plan on the
 * device. Push, SMS, and WhatsApp are future server-side adapters with consent,
 * delivery logs, approved templates, and no provider secrets in the app.
 *
 * Delivery intent is recorded; the app never claims a notification was read.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
  type PlannedNotification,
} from './plan';

const PREFERENCES_KEY = 'post.notificationPreferences';

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (!raw) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      enabled: parsed.enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.enabled,
      showPreviews: parsed.showPreviews ?? DEFAULT_NOTIFICATION_PREFERENCES.showPreviews,
      smsEnabled: parsed.smsEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.smsEnabled,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function saveNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Best-effort; the in-session choice still applies.
  }
}

export interface ScheduleOutcome {
  scheduled: number;
  permissionGranted: boolean;
}

/**
 * Replace all scheduled reminders with the given plan. Rescheduling is a full
 * replace so a care-plan change can never leave stale reminders behind.
 */
export async function rescheduleNotifications(
  planned: readonly PlannedNotification[],
): Promise<ScheduleOutcome> {
  if (Platform.OS === 'web') {
    // The web demo has no local notification scheduler.
    return { scheduled: 0, permissionGranted: false };
  }

  const Notifications = await import('expo-notifications');

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted && existing.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) {
    return { scheduled: 0, permissionGranted: false };
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  let scheduled = 0;
  for (const notification of planned) {
    const triggerMs = Date.parse(notification.triggerAtIso);
    if (triggerMs <= Date.now()) {
      continue;
    }
    await Notifications.scheduleNotificationAsync({
      identifier: notification.id,
      content: {
        title: notification.title,
        body: notification.body,
        // Deep-links the tap to the right task.
        data: { route: notification.route },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(triggerMs),
      },
    });
    scheduled += 1;
  }

  return { scheduled, permissionGranted: true };
}
