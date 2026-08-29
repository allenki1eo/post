import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/primitives/AppText';
import { Button } from '../../components/primitives/Button';
import { Screen } from '../../components/primitives/Screen';
import { SectionHeading } from '../../components/primitives/SectionHeading';
import { getRepository } from '../../repositories';
import { spacing } from '../../theme/tokens';
import { useAsyncData } from '../../utils/useAsyncData';

export default function ClinicianProfile() {
  const { t } = useTranslation();
  const router = useRouter();

  const { data: clinic } = useAsyncData(async () => getRepository().getClinic('clinic-demo-1'));

  return (
    <Screen showDemoBanner>
      <AppText variant="title">{t('profile.title')}</AppText>
      <AppText variant="body" muted>
        {clinic?.name ?? t('common.notAvailable')}
      </AppText>

      {__DEV__ ? (
        <>
          <SectionHeading label={t('profile.demoControls')} />
          <Button
            label={t('profile.switchRole')}
            kind="secondary"
            onPress={() => router.replace('/(patient)/today')}
          />
        </>
      ) : null}

      <View style={styles.signOut}>
        <Button
          label={t('common.signOut')}
          kind="secondary"
          onPress={() => router.replace('/(auth)/welcome')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  signOut: {
    marginTop: spacing.xxl,
  },
});
