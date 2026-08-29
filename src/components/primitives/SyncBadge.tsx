import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { SyncStatus } from '../../domain/models';
import { colors, radius, spacing } from '../../theme/tokens';
import { AppText } from './AppText';

const TONE: Record<SyncStatus, { foreground: string; background: string; glyph: string }> = {
  local: { foreground: colors.mutedInk, background: colors.canvas, glyph: '↧' },
  syncing: { foreground: colors.review, background: colors.reviewSurface, glyph: '↻' },
  synced: { foreground: colors.success, background: colors.successSurface, glyph: '✓' },
  failed: { foreground: colors.review, background: colors.reviewSurface, glyph: '!' },
};

/**
 * Sync state, stated as a fact and never as the patient's fault. The state is
 * announced politely to screen readers when it changes.
 */
export function SyncBadge({ status }: { status: SyncStatus }) {
  const { t } = useTranslation();
  const palette = TONE[status];
  const label = t(`syncStatus.${status}`);
  return (
    <View
      style={[styles.badge, { backgroundColor: palette.background }]}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
    >
      <AppText variant="label" color={palette.foreground}>
        {palette.glyph} {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
