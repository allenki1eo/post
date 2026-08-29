import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/primitives/AppText';
import { Button } from '../../components/primitives/Button';
import { Screen } from '../../components/primitives/Screen';
import { SectionHeading } from '../../components/primitives/SectionHeading';
import { setAppLanguage } from '../../i18n';
import { colors, radius, spacing } from '../../theme/tokens';

export default function PatientProfile() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  return (
    <Screen>
      <AppText variant="title">{t('profile.title')}</AppText>

      <SectionHeading label={t('common.languageLabel')} />
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

      <SectionHeading label={t('profile.notifications')} />
      <AppText variant="secondary" muted>
        {t('common.comingSoonMilestone')}
      </AppText>

      <SectionHeading label={t('profile.consent')} />
      <AppText variant="secondary" muted>
        {t('common.comingSoonMilestone')}
      </AppText>

      {__DEV__ ? (
        <>
          <SectionHeading label={t('profile.demoControls')} />
          <Button
            label={t('profile.switchRole')}
            kind="secondary"
            onPress={() => router.replace('/(clinician)/home')}
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
  signOut: {
    marginTop: spacing.xxl,
  },
});
