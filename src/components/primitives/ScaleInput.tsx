import { Pressable, StyleSheet, View } from 'react-native';

import { colors, MIN_TOUCH_TARGET, radius, spacing } from '../../theme/tokens';
import { AppText } from './AppText';

export interface ScaleInputProps {
  min: number;
  max: number;
  value: number | undefined;
  onChange: (value: number) => void;
  minLabel: string;
  maxLabel: string;
  accessibilityLabel: string;
}

/**
 * Whole-number scale (for example 0–10 pain). Rendered as wrapped 44pt targets
 * rather than a slider: a slider is hard to hit precisely one-handed and hard
 * to operate with a screen reader.
 */
export function ScaleInput({
  min,
  max,
  value,
  onChange,
  minLabel,
  maxLabel,
  accessibilityLabel,
}: ScaleInputProps) {
  const values = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  return (
    <View accessibilityLabel={accessibilityLabel}>
      <View style={styles.grid}>
        {values.map((candidate) => {
          const selected = value === candidate;
          return (
            <Pressable
              key={candidate}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={String(candidate)}
              onPress={() => onChange(candidate)}
              style={({ pressed }) => [
                styles.cell,
                selected && styles.cellSelected,
                pressed && styles.cellPressed,
              ]}
            >
              <AppText variant="body" color={selected ? colors.onBrand : colors.ink}>
                {candidate}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        <AppText variant="secondary" muted>
          {minLabel}
        </AppText>
        <AppText variant="secondary" muted>
          {maxLabel}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
  },
  cellSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  cellPressed: {
    backgroundColor: colors.canvas,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
});
