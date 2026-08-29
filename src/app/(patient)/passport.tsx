import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/primitives/AppText';
import { ListRow } from '../../components/primitives/ListRow';
import { Screen } from '../../components/primitives/Screen';
import { SectionHeading } from '../../components/primitives/SectionHeading';
import type { ClinicalRecord, PassportCategory, SupportedLanguage } from '../../domain/models';
import { DEMO_PASSPORT_PATIENT_ID } from '../../features/auth/demoSession';
import { getRepository } from '../../repositories';
import { colors, radius, spacing } from '../../theme/tokens';
import { useAsyncData } from '../../utils/useAsyncData';

const SECTION_ORDER: PassportCategory[] = [
  'important_alerts',
  'medications',
  'allergies',
  'encounters',
  'care_plans',
  'clinician_advice',
  'observations',
  'documents',
];

function recordTitle(record: ClinicalRecord, language: SupportedLanguage): string {
  switch (record.category) {
    case 'medications':
      return record.medicationName;
    case 'allergies':
      return record.substance;
    case 'clinician_advice':
      return record.advice[language];
    case 'conditions':
      return record.conditionName[language];
    case 'encounters':
      return record.encounterType[language];
    case 'procedures':
      return record.procedureName[language];
    case 'observations':
      return record.observationName[language];
    case 'documents':
      return record.title[language];
    case 'important_alerts':
      return record.title[language];
    case 'care_plans':
      return record.planName[language];
  }
}

export default function Passport() {
  const { t, i18n } = useTranslation();
  const language = (i18n.language === 'sw' ? 'sw' : 'en') as SupportedLanguage;

  const { data } = useAsyncData(async () => {
    const repository = getRepository();
    const snapshot = await repository.getPassportSnapshot(DEMO_PASSPORT_PATIENT_ID);
    const records = await repository.getClinicalRecords(DEMO_PASSPORT_PATIENT_ID);
    return { snapshot, records };
  });

  const records = data?.records ?? [];

  return (
    <Screen>
      <AppText variant="title">{t('passport.title')}</AppText>
      {data?.snapshot ? (
        <AppText variant="secondary" muted>
          {t('passport.lastUpdated', {
            date: new Date(data.snapshot.generatedAt).toLocaleDateString(i18n.language),
          })}
        </AppText>
      ) : null}
      <AppText variant="secondary" muted style={styles.note}>
        {t('passport.notCompleteNote')}
      </AppText>

      {SECTION_ORDER.map((category) => {
        const sectionRecords = records.filter((record) => record.category === category);
        if (sectionRecords.length === 0) {
          return null;
        }
        return (
          <View key={category}>
            <SectionHeading label={t(`passport.sections.${category}`)} />
            {sectionRecords.map((record) => (
              <ListRow
                key={record.id}
                title={recordTitle(record, language)}
                subtitle={`${t(`sourceLabels.${record.sourceType}`)} · ${t(`verificationLabels.${record.verificationStatus}`)}`}
              >
                {record.sourceType === 'ai_organized' ? (
                  <View style={styles.aiLabel}>
                    <AppText variant="label" color={colors.mutedInk}>
                      {t('safety.aiOrganizedLabel')}
                    </AppText>
                  </View>
                ) : null}
              </ListRow>
            ))}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    marginTop: spacing.xs,
  },
  aiLabel: {
    backgroundColor: colors.canvas,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
});
