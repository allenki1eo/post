import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/primitives/AppText';
import { Screen } from '../../components/primitives/Screen';
import { SectionHeading } from '../../components/primitives/SectionHeading';
import { calculateAdherence } from '../../domain/adherence';
import { DEMO_PATIENT_ID } from '../../features/auth/demoSession';
import { getRepository } from '../../repositories';
import { useAsyncData } from '../../utils/useAsyncData';

export default function Progress() {
  const { t } = useTranslation();

  const { data } = useAsyncData(async () => {
    const repository = getRepository();
    const checkIns = await repository.getRecentCheckIns(DEMO_PATIENT_ID);
    return { checkIns, adherence: calculateAdherence(checkIns) };
  });

  const adherence = data?.adherence;

  return (
    <Screen>
      <AppText variant="title">{t('patientProgress.title')}</AppText>

      <SectionHeading label={t('patientToday.medicationTasksTitle')} />
      {/* Adherence always shows numerator and denominator, never only a percentage. */}
      <AppText variant="body">
        {adherence === undefined
          ? t('common.missingData')
          : adherence.kind === 'not_applicable'
            ? t('adherence.notApplicable')
            : t('adherence.fraction', {
                confirmed: adherence.confirmed,
                expected: adherence.expected,
              })}
      </AppText>

      <AppText variant="secondary" muted style={{ marginTop: 24 }}>
        {t('patientProgress.discussWithClinician')}
      </AppText>
    </Screen>
  );
}
