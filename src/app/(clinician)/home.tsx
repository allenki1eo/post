import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/primitives/AppText';
import { Screen } from '../../components/primitives/Screen';
import { SectionHeading } from '../../components/primitives/SectionHeading';
import { getRepository } from '../../repositories';
import { colors, radius, spacing } from '../../theme/tokens';
import { useAsyncData } from '../../utils/useAsyncData';

export default function ClinicianHome() {
  const { t } = useTranslation();

  const { data } = useAsyncData(async () => {
    const repository = getRepository();
    const cases = await repository.getFollowUpCases();
    const alerts = await repository.getAlerts();
    return {
      activePlans: cases.filter((c) => c.carePlan.status === 'active').length,
      review: alerts.filter((a) => a.status === 'review' && a.reviewState === 'open').length,
      urgent: alerts.filter((a) => a.status === 'urgent' && a.reviewState === 'open').length,
    };
  });

  const summary = [
    { key: 'activePlans', label: t('clinicianHome.activePlans'), value: data?.activePlans },
    {
      key: 'review',
      label: t('clinicianHome.reviewCount'),
      value: data?.review,
      color: colors.review,
    },
    {
      key: 'urgent',
      label: t('clinicianHome.urgentCount'),
      value: data?.urgent,
      color: colors.urgent,
    },
  ];

  return (
    <Screen showDemoBanner>
      <AppText variant="title">{t('clinicianHome.title')}</AppText>

      <View style={styles.summaryRow}>
        {summary.map((item) => (
          <View key={item.key} style={styles.summaryCard}>
            <AppText variant="title" color={item.color} style={styles.summaryValue}>
              {item.value ?? '–'}
            </AppText>
            <AppText variant="label" muted>
              {item.label}
            </AppText>
          </View>
        ))}
      </View>

      <SectionHeading label={t('clinicianHome.recentActivity')} />
      <AppText variant="secondary" muted>
        {t('common.comingSoonMilestone')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  summaryValue: {
    fontVariant: ['tabular-nums'],
  },
});
