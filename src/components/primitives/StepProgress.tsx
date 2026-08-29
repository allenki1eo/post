import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../theme/tokens';
import { AppText } from './AppText';

export interface StepProgressProps {
  current: number;
  total: number;
  label: string;
}

/**
 * Check-in progress: a plain "step N of M" line plus a quiet bar. No animation
 * — the bar is a state readout, not a flourish.
 */
export function StepProgress({ current, total, label }: StepProgressProps) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: current, text: label }}
    >
      <AppText variant="label" muted>
        {label}
      </AppText>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  track: {
    height: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.brand,
  },
});
