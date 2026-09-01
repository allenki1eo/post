import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/primitives/AppText';
import { Banner } from '../../components/primitives/Banner';
import { Button } from '../../components/primitives/Button';
import { ChoiceRow } from '../../components/primitives/ChoiceRow';
import { Screen } from '../../components/primitives/Screen';
import { SectionHeading } from '../../components/primitives/SectionHeading';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from '../../features/notifications/plan';
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
} from '../../features/notifications/scheduler';
import { setAppLanguage } from '../../i18n';
import { getLocalStore } from '../../storage';
import { colors, radius, spacing } from '../../theme/tokens';
import { useAsyncData } from '../../utils/useAsyncData';

export default function PatientProfile() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [signOutConfirmed, setSignOutConfirmed] = useState(false);

  useEffect(() => {
    loadNotificationPreferences()
      .then(setPreferences)
      .catch(() => {});
  }, []);

  const { data: unsyncedCount } = useAsyncData(async () => {
    const store = await getLocalStore();
    return store.countUnsyncedCheckIns();
  }, [signOutConfirmed]);

  const updatePreferences = (next: NotificationPreferences) => {
    setPreferences(next);
    saveNotificationPreferences(next).catch(() => {});
  };

  const hasUnsynced = (unsyncedCount ?? 0) > 0;

  return (
    <Screen>
      <AppText variant="title">{t('profile.title')}</AppText>

      <SectionHeading label={t('common.languageLabel')} />
      <View style={styles.languageRow}>
        {(['en', 'sw'] as const).map((language) => {
          const selected = i18n.language === language;
          return (
            <Pressable
              key={language}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setAppLanguage(language)}
              style={[styles.languageChip, selected && styles.languageChipSelected]}
            >
              <AppText variant="body" color={selected ? colors.onBrand : colors.ink}>
                {language === 'en' ? t('common.languageNameEn') : t('common.languageNameSw')}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <SectionHeading label={t('profile.notifications')} />
      <ChoiceRow
        kind="checkbox"
        label={t('profile.remindersEnabled')}
        helpText={t('profile.reminderTimesLabel')}
        selected={preferences.enabled}
        onPress={() => updatePreferences({ ...preferences, enabled: !preferences.enabled })}
      />
      <ChoiceRow
        kind="checkbox"
        label={t('profile.hidePreviews')}
        helpText={t('profile.hidePreviewsHelp')}
        selected={!preferences.showPreviews}
        onPress={() =>
          updatePreferences({ ...preferences, showPreviews: !preferences.showPreviews })
        }
      />
      <ChoiceRow
        kind="checkbox"
        label={t('profile.smsReminders')}
        helpText={t('profile.smsRemindersHelp')}
        selected={preferences.smsEnabled === true}
        onPress={() => updatePreferences({ ...preferences, smsEnabled: !preferences.smsEnabled })}
      />

      <SectionHeading label={t('profile.consent')} />
      <AppText variant="secondary" muted>
        {t('common.comingSoonMilestone')}
      </AppText>

      {__DEV__ ? (
        <>
          <SectionHeading label={t('profile.demoControls')} />
          <Button
            label={t('profile.switchRole')}
            kind="secondary"
            onPress={() => router.replace('/(clinician)/home')}
          />
        </>
      ) : null}

      <View style={styles.signOut}>
        {/* Unsynced answers are never lost silently: signing out with pending
            data requires an explicit second confirmation. */}
        {hasUnsynced && !signOutConfirmed ? (
          <Banner
            tone="review"
            title={t('profile.unsyncedWarningTitle')}
            body={t('profile.unsyncedWarningBody', { count: unsyncedCount ?? 0 })}
          >
            <Button
              label={t('profile.signOutAnyway')}
              kind="secondary"
              onPress={() => setSignOutConfirmed(true)}
            />
          </Banner>
        ) : (
          <Button
            label={t('common.signOut')}
            kind="secondary"
            onPress={() => router.replace('/(auth)/welcome')}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  languageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  languageChip: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  languageChipSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  signOut: {
    marginTop: spacing.xxl,
  },
});
