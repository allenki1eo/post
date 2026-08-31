import { Linking, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/primitives/AppText';
import { Button } from '../../components/primitives/Button';
import { Screen } from '../../components/primitives/Screen';
import { SectionHeading } from '../../components/primitives/SectionHeading';
import type { SupportedLanguage } from '../../domain/models';
import { DEMO_PATIENT_ID } from '../../features/auth/demoSession';
import { getRepository } from '../../repositories';
import { spacing } from '../../theme/tokens';
import { useAsyncData } from '../../utils/useAsyncData';

export default function Help() {
  const { t, i18n } = useTranslation();
  const language = (i18n.language === 'sw' ? 'sw' : 'en') as SupportedLanguage;
  const agentFreeAiUrl = process.env.EXPO_PUBLIC_AGENT_FREE_AI_URL;

  const { data } = useAsyncData(async () => {
    const repository = getRepository();
    const patient = await repository.getPatient(DEMO_PATIENT_ID);
    const clinic = patient?.homeClinicId
      ? await repository.getClinic(patient.homeClinicId)
      : undefined;
    const plan = await repository.getActiveCarePlan(DEMO_PATIENT_ID);
    return { clinic, plan };
  });

  return (
    <Screen>
      <AppText variant="title">{t('help.title')}</AppText>

      <SectionHeading label={t('help.urgentInstructionsTitle')} />
      {/* Clinician-authored urgent text only; shown without waiting for any model. */}
      <AppText variant="body">
        {data?.plan?.urgentInstructions[language] ??
          data?.clinic?.urgentContactInstructions?.[language] ??
          t('common.notAvailable')}
      </AppText>

      <SectionHeading label={t('help.clinicContact')} />
      <AppText variant="body">{data?.clinic?.name ?? t('common.notAvailable')}</AppText>
      {data?.clinic?.contactPhone ? (
        <AppText variant="body" muted>
          {data.clinic.contactPhone}
        </AppText>
      ) : null}

      <SectionHeading label={t('help.privacyTitle')} />
      <AppText variant="body" muted>
        {t('help.privacyBody')}
      </AppText>

      {agentFreeAiUrl ? (
        <>
          <SectionHeading label={t('help.aiAssistantTitle')} />
          <AppText variant="secondary" muted style={styles.aiDescription}>
            {t('help.aiAssistantBody')}
          </AppText>
          <Button
            kind="secondary"
            label={t('help.openAiAssistant')}
            onPress={() => Linking.openURL(agentFreeAiUrl)}
          />
        </>
      ) : null}

      <AppText variant="secondary" muted style={styles.disclaimer}>
        {t('safety.patientDisclaimer')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  disclaimer: {
    marginTop: spacing.xxl,
  },
  aiDescription: { marginBottom: spacing.md },
});
