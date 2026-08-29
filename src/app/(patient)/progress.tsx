import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/primitives/AppText';
import { EmptyState } from '../../components/primitives/EmptyState';
import { Screen } from '../../components/primitives/Screen';
import { SectionHeading } from '../../components/primitives/SectionHeading';
import { SyncBadge } from '../../components/primitives/SyncBadge';
import type { SupportedLanguage } from '../../domain/models';
import { DEMO_PATIENT_ID } from '../../features/auth/demoSession';
import { loadPatientToday } from '../../features/checkIns/patientToday';
import { summarizeProgress } from '../../features/checkIns/progress';
import { spacing } from '../../theme/tokens';
import { useAsyncData } from '../../utils/useAsyncData';
import { useFocusRefreshKey } from '../../utils/useFocusRefreshKey';

/**
 * Progress: completion and confirmed doses as fractions, plus neutral counts
 * of what the patient reported. No medical interpretation and no score.
 */
export default function Progress() {
  const { t, i18n } = useTranslation();
  const language = (i18n.language === 'sw' ? 'sw' : 'en') as SupportedLanguage;

  const refreshKey = useFocusRefreshKey();
  const { data } = useAsyncData(async () => {
    const today = await loadPatientToday(DEMO_PATIENT_ID);
    const nowIso = new Date().toISOString();
    return {
      today,
      summary: summarizeProgress(
        today.recentCheckIns,
        today.carePlan,
        today.template,
        today.patient?.timezone ?? 'UTC',
        nowIso,
      ),
    };
  }, [refreshKey]);

  const summary = data?.summary;
  const adherence = summary?.adherence;

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">{t('patientProgress.title')}</AppText>
        {data ? <SyncBadge status={data.today.syncStatus} /> : null}
      </View>

      {summary && summary.completedCheckIns === 0 ? (
        <EmptyState message={t('patientProgress.noCheckInsYet')} />
      ) : null}

      {summary && summary.completedCheckIns > 0 ? (
        <>
          <SectionHeading label={t('patientProgress.checkInsTitle')} />
          <AppText variant="body">
            {t('patientProgress.checkInsCompleted', {
              completed: summary.completedCheckIns,
              total: summary.scheduledCheckIns,
            })}
          </AppText>

          <SectionHeading label={t('patientProgress.medicinesTitle')} />
          {/* Always the fraction, never only a percentage. */}
          <AppText variant="body">
            {adherence === undefined || adherence.kind === 'not_applicable'
              ? t('adherence.notApplicable')
              : t('patientProgress.dosesConfirmed', {
                  confirmed: adherence.confirmed,
                  expected: adherence.expected,
                })}
          </AppText>

          <SectionHeading label={t('patientProgress.symptomsTitle')} />
          {summary.questions.map((question) => (
            <View key={question.questionId} style={styles.trendRow}>
              <AppText variant="body">
                {question.kind === 'condition'
                  ? t('patientProgress.conditionTrend', {
                      count: question.reportedCount,
                      total: question.total,
                    })
                  : t('patientProgress.symptomTrend', {
                      label: question.question.label[language],
                      count: question.reportedCount,
                      total: question.total,
                    })}
              </AppText>
              {question.missingCount > 0 ? (
                // Missing data is labeled missing, never counted as a "no".
                <AppText variant="secondary" muted>
                  {t('patientProgress.notAnswered', {
                    count: question.missingCount,
                    total: question.total,
                  })}
                </AppText>
              ) : null}
            </View>
          ))}
        </>
      ) : null}

      <AppText variant="secondary" muted style={styles.footer}>
        {t('patientProgress.discussWithClinician')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  trendRow: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  footer: {
    marginTop: spacing.xxl,
  },
});
