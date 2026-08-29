import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/primitives/AppText';
import { Button } from '../../components/primitives/Button';
import { ListRow } from '../../components/primitives/ListRow';
import { Screen } from '../../components/primitives/Screen';
import { getRepository } from '../../repositories';
import { spacing } from '../../theme/tokens';
import { useAsyncData } from '../../utils/useAsyncData';

/**
 * Demo sign-in: development builds list the seeded synthetic accounts for the
 * chosen role. Production builds will replace this with real authentication;
 * they must never expose role switching or synthetic credentials.
 */
export default function SignIn() {
  const { t } = useTranslation();
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const targetRole = role === 'clinician' ? 'clinician' : 'patient';

  const { data: users } = useAsyncData(async () => {
    const repository = getRepository();
    return (await repository.getUsers()).filter((user) => user.role === targetRole);
  }, [targetRole]);

  const destination = targetRole === 'clinician' ? '/(clinician)/home' : '/(patient)/today';

  return (
    <Screen showDemoBanner>
      <View style={styles.header}>
        <AppText variant="title">
          {targetRole === 'clinician' ? t('auth.signInAsClinician') : t('auth.signInAsPatient')}
        </AppText>
        <AppText variant="secondary" muted>
          {t('auth.demoAccountsHint')}
        </AppText>
      </View>
      {(users ?? []).map((user) => (
        <ListRow
          key={user.id}
          title={user.displayName}
          subtitle={
            user.preferredLanguage === 'sw'
              ? t('common.languageNameSw')
              : t('common.languageNameEn')
          }
          onPress={() => router.replace(destination)}
        />
      ))}
      <View style={styles.footer}>
        <Button label={t('common.back')} kind="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  footer: {
    marginTop: spacing.xl,
  },
});
