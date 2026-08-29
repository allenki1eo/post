import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/primitives/AppText';
import { Screen } from '../../components/primitives/Screen';

/**
 * Read-only receiving-clinician route. Milestone 4 implements token
 * resolution against grant policy; until then this shell deliberately shows
 * nothing about any patient — an unresolved token must never disclose whether
 * a patient exists.
 */
export default function SharedPassport() {
  const { t } = useTranslation();
  // The token is opaque; it is never logged and never rendered back in full.
  useLocalSearchParams<{ opaqueToken: string }>();

  return (
    <Screen showDemoBanner>
      <AppText variant="title">{t('passport.title')}</AppText>
      <AppText variant="body" muted>
        {t('common.comingSoonMilestone')}
      </AppText>
    </Screen>
  );
}
