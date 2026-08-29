import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/primitives/AppText';
import { Button } from '../../components/primitives/Button';
import { DemoBanner } from '../../components/primitives/DemoBanner';
import { Screen } from '../../components/primitives/Screen';
import { setAppLanguage } from '../../i18n';
import { colors, radius, spacing } from '../../theme/tokens';

export default function Welcome() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  return (
    <Screen scroll={false} padded={false}>
      <DemoBanner />
      <View style={styles.content}>
        <View style={styles.intro}>
          <AppText variant="title">{t('auth.welcomeTitle')}</AppText>
          <AppText variant="body" muted>
            {t('auth.welcomeBody')}
          </AppText>
        </View>

        <View style={styles.languageBlock}>
          <AppText variant="label" muted>
            {t('auth.chooseLanguage')}
          </AppText>
          <View style={styles.languageRow}>
            {(['en', 'sw'] as const).map((language) => {
              const selected = i18n.language === language;
              return (
                <Pressable
                  key={language}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setAppLanguage(language)}
                  style={[styles.languageChip, selected && styles.languageChipSelected]}
                >
                  <AppText variant="body" color={selected ? colors.onBrand : colors.ink}>
                    {language === 'en' ? t('common.languageNameEn') : t('common.languageNameSw')}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label={t('auth.signInAsPatient')}
            onPress={() => router.push('/(auth)/sign-in?role=patient')}
          />
          <Button
            label={t('auth.signInAsClinician')}
            kind="secondary"
            onPress={() => router.push('/(auth)/sign-in?role=clinician')}
          />
          {__DEV__ ? (
            <AppText variant="secondary" muted>
              {t('auth.demoAccountsHint')}
            </AppText>
          ) : null}
        </View>

        <AppText variant="secondary" muted style={styles.disclaimer}>
          {t('safety.patientDisclaimer')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.xl,
  },
  intro: {
    gap: spacing.sm,
  },
  languageBlock: {
    gap: spacing.sm,
  },
  languageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  languageChip: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  languageChipSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  actions: {
    gap: spacing.md,
    marginTop: 'auto',
  },
  disclaimer: {
    marginBottom: spacing.xl,
  },
});
