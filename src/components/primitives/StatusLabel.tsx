import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { WorkflowStatus } from '../../domain/models';
import { radius, spacing, statusColors } from '../../theme/tokens';
import { AppText } from './AppText';

const STATUS_GLYPH: Record<WorkflowStatus, string> = {
  on_track: '●',
  review: '◐',
  urgent: '▲',
};

/**
 * Workflow-status label. Color is always paired with text and a glyph so the
 * status never depends on color alone. Statuses are workflow priorities,
 * never diagnoses.
 */
export function StatusLabel({ status }: { status: WorkflowStatus }) {
  const { t } = useTranslation();
  const palette = statusColors[status];
  return (
    <View
      style={[styles.container, { backgroundColor: palette.background }]}
      accessibilityRole="text"
      accessibilityLabel={t(`workflowStatus.${status}`)}
    >
      <AppText variant="label" color={palette.foreground}>
        {STATUS_GLYPH[status]} {t(`workflowStatus.${status}`)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
