import { differenceInCalendarDays } from 'date-fns';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/primitives/AppText';
import { Button } from '../../components/primitives/Button';
import { Screen } from '../../components/primitives/Screen';
import { SectionHeading } from '../../components/primitives/SectionHeading';
import type { SupportedLanguage } from '../../domain/models';
import { DEMO_PATIENT_ID } from '../../features/auth/demoSession';
import { getRepository } from '../../repositories';
import { colors, radius, spacing } from '../../theme/tokens';
import { useAsyncData } from '../../utils/useAsyncData';

export default function Today() {
  const { t, i18n } = useTranslation();
  const language = (i18n.language === 'sw' ? 'sw' : 'en') as SupportedLanguage;

  const { data } = useAsyncData(async () => {
    const repository = getRepository();
    const patient = await repository.getPatient(DEMO_PATIENT_ID);
    const plan = await repository.getActiveCarePlan(DEMO_PATIENT_ID);
    return { patient, plan };
  });

  const plan = data?.plan;
  const planTotalDays =
    plan?.endsAt !== undefined
      ? differenceInCalendarDays(new Date(plan.endsAt), new Date(plan.startsAt))
      : undefined;
  const planDay =
    plan !== undefined && planTotalDays !== undefined
      ? {
          // Clamp to the plan window so a demo plan that started in the past
          // never shows "Day 12 of 7".
          day: Math.min(
            planTotalDays,
            Math.max(1, differenceInCalendarDays(new Date(), new Date(plan.startsAt)) + 1),
          ),
          total: planTotalDays,
        }
      : undefined;

  return (
    <Screen>
      <AppText variant="title">
        {t('patientToday.greeting', { name: data?.patient?.preferredName ?? '' })}
      </AppText>

      {plan ? (
        <>
          {planDay ? (
            <AppText variant="secondary" muted style={styles.planDay}>
              {t('patientToday.planDay', planDay)}
            </AppText>
          ) : null}

          <View style={styles.primaryAction}>
            <Button label={t('patientToday.startCheckIn')} onPress={() => {}} />
          </View>

          <SectionHeading label={t('patientToday.medicationTasksTitle')} />
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
  planDay: {
    marginTop: spacing.xs,
  },
  primaryAction: {
    marginTop: spacing.xl,
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
