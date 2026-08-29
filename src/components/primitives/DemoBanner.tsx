import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing } from '../../theme/tokens';
import { AppText } from './AppText';

/**
 * Persistent synthetic-data marker. Shown on every clinician surface and the
 * welcome screen; factual and quiet, not decorative.
 */
export function DemoBanner() {
  const { t } = useTranslation();
  return (
    <View style={styles.banner} accessibilityRole="text">
      <AppText variant="label" color={colors.onBrand} style={styles.text}>
        {t('common.demoBanner')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.review,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  text: {
    letterSpacing: 0.5,
  },
});
