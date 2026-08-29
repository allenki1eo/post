import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/primitives/AppText';
import { Banner } from '../../components/primitives/Banner';
import { Button } from '../../components/primitives/Button';
import { Screen } from '../../components/primitives/Screen';
import { SectionHeading } from '../../components/primitives/SectionHeading';
import { SyncBadge } from '../../components/primitives/SyncBadge';
import type { SupportedLanguage } from '../../domain/models';
import { DEMO_PATIENT_ID } from '../../features/auth/demoSession';
import { loadPatientToday } from '../../features/checkIns/patientToday';
import { useScheduledReminders } from '../../features/notifications/useScheduledReminders';
import { colors, radius, spacing } from '../../theme/tokens';
import { useAsyncData } from '../../utils/useAsyncData';
import { useFocusRefreshKey } from '../../utils/useFocusRefreshKey';

/**
 * Today: one primary action, the clinician's own medication wording, and an
 * honest sync state. No risk score is ever shown to the patient.
 */
export default function Today() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const language = (i18n.language === 'sw' ? 'sw' : 'en') as SupportedLanguage;

  // Tab screens stay mounted; reload when the patient returns from a check-in.
  const refreshKey = useFocusRefreshKey();
  const { data } = useAsyncData(async () => loadPatientToday(DEMO_PATIENT_ID), [refreshKey]);

  // Reminders follow the active plan, the saved language, and the patient's
  // notification preferences.
  useScheduledReminders(data?.carePlan, data?.patient?.timezone ?? 'UTC');

  const plan = data?.carePlan;
  const schedule = data?.schedule;
  const completed = data?.todaysCheckIn !== undefined;

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">
          {t('patientToday.greeting', { name: data?.patient?.preferredName ?? '' })}
        </AppText>
        {data ? <SyncBadge status={data.syncStatus} /> : null}
      </View>

      {data?.usingCachedPlan ? (
        <Banner tone="info" title={t('patientToday.cachedPlanNotice')} />
      ) : null}

      {plan && schedule ? (
        <>
          {schedule.planDay !== undefined && schedule.planTotalDays !== undefined ? (
            <AppText variant="secondary" muted style={styles.planDay}>
              {t('patientToday.planDay', {
                day: schedule.planDay,
                total: schedule.planTotalDays,
              })}
            </AppText>
          ) : null}

          <View style={styles.primaryAction}>
            <Button
              label={completed ? t('patientToday.reviewCheckIn') : t('patientToday.startCheckIn')}
              kind={completed ? 'secondary' : 'primary'}
              onPress={() =>
                router.push(`/(patient)/check-in/${encodeURIComponent(schedule.scheduleId)}`)
              }
            />
            {completed ? (
              <AppText variant="secondary" color={colors.success} style={styles.completedNote}>
                ✓ {t('patientToday.checkInCompleted')}
              </AppText>
            ) : null}
          </View>

          <SectionHeading label={t('patientToday.medicationTasksTitle')} />
          <AppText variant="secondary" muted>
            {schedule.expectedDoseIds.length === 0
              ? t('patientToday.noDosesToday')
              : t('patientToday.dosesToday', {
                  confirmed: data?.todaysCheckIn?.confirmedDoseIds.length ?? 0,
                  expected: schedule.expectedDoseIds.length,
                })}
          </AppText>
          {plan.medicationInstructions.map((instruction) => (
            <View key={instruction.id} style={styles.medicationItem}>
              <AppText variant="body" style={styles.medicationName}>
                {instruction.displayName}
              </AppText>
              {/* Exact clinician-entered wording, never rephrased. */}
              <AppText variant="secondary" muted>
                {instruction.clinicianWording[language]}
              </AppText>
            </View>
          ))}
        </>
      ) : (
        <AppText variant="body" muted style={styles.planDay}>
          {t('patientToday.noActivePlan')}
        </AppText>
      )}

      <AppText variant="secondary" muted style={styles.disclaimer}>
        {t('safety.patientDisclaimer')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  planDay: {
    marginTop: spacing.xs,
  },
  primaryAction: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  completedNote: {
    marginTop: spacing.xs,
  },
  medicationItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  medicationName: {
    fontWeight: '600',
  },
  disclaimer: {
    marginTop: spacing.xxl,
  },
});
