import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/primitives/AppText';
import { ListRow } from '../../components/primitives/ListRow';
import { Screen } from '../../components/primitives/Screen';
import type { SupportedLanguage } from '../../domain/models';
import { getRepository } from '../../repositories';
import { colors, radius, spacing } from '../../theme/tokens';
import { useAsyncData } from '../../utils/useAsyncData';

export default function Templates() {
  const { t, i18n } = useTranslation();
  const language = (i18n.language === 'sw' ? 'sw' : 'en') as SupportedLanguage;

  const { data: templates } = useAsyncData(async () => getRepository().getCarePlanTemplates());

  return (
    <Screen showDemoBanner>
      <AppText variant="title">{t('templates.title')}</AppText>
      {(templates ?? []).map((template) => (
        <ListRow
          key={template.id}
          title={template.name[language]}
          subtitle={`${t('templates.versionLabel', { version: template.version })} · ${t('templates.questionsCount', { count: template.checkInQuestions.length })} · ${t('templates.rulesCount', { count: template.workflowRules.length })}`}
        >
          {/* Demonstration rules must always carry the review-required label. */}
          <View style={styles.reviewLabel}>
            <AppText variant="label" color={colors.review}>
              {t('safety.pendingClinicalReview')}
            </AppText>
          </View>
        </ListRow>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  reviewLabel: {
    backgroundColor: colors.reviewSurface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
});
