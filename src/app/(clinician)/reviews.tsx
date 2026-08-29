import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/primitives/AppText';
import { EmptyState } from '../../components/primitives/EmptyState';
import { ListRow } from '../../components/primitives/ListRow';
import { Screen } from '../../components/primitives/Screen';
import { StatusLabel } from '../../components/primitives/StatusLabel';
import type { SupportedLanguage } from '../../domain/models';
import { getRepository } from '../../repositories';
import { spacing } from '../../theme/tokens';
import { useAsyncData } from '../../utils/useAsyncData';

export default function Reviews() {
  const { t, i18n } = useTranslation();
  const language = (i18n.language === 'sw' ? 'sw' : 'en') as SupportedLanguage;

  const { data: alerts } = useAsyncData(async () => {
    const repository = getRepository();
    // The repository already sorts urgent before review, oldest first.
    return (await repository.getAlerts()).filter((alert) => alert.reviewState === 'open');
  });

  return (
    <Screen showDemoBanner>
      <AppText variant="title">{t('reviews.title')}</AppText>
      {(alerts ?? []).length === 0 ? (
        <EmptyState message={t('reviews.emptyState')} />
      ) : (
        (alerts ?? []).map((alert) => (
          <ListRow
            key={alert.id}
            title={alert.patientId}
            trailing={<StatusLabel status={alert.status} />}
          >
            {/* The exact rule that queued this patient, plus its evidence refs. */}
            <AppText variant="secondary" muted>
              {t('reviews.reasonLabel')}: {alert.reasonText[language]}
            </AppText>
            <View style={styles.evidence}>
              <AppText variant="label" muted>
                {t('reviews.evidenceLabel')}:{' '}
                {alert.evidenceReferences.map((ref) => `${ref.type}:${ref.id}`).join(' · ')}
              </AppText>
            </View>
          </ListRow>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  evidence: {
    marginTop: spacing.xs,
  },
});
