import { Pressable, StyleSheet, View } from 'react-native';

import { colors, MIN_TOUCH_TARGET, radius, spacing } from '../../theme/tokens';
import { AppText } from './AppText';

export interface ChoiceRowProps {
  label: string;
  helpText?: string;
  selected: boolean;
  onPress: () => void;
  /** 'radio' for one-of-many, 'checkbox' for independent confirmations. */
  kind?: 'radio' | 'checkbox';
  disabled?: boolean;
}

/**
 * Large single-choice / confirmation row for the patient check-in.
 *
 * Selection is conveyed by an indicator and the accessibility state, not by
 * color alone, and the label wraps freely so long Kiswahili copy never clips.
 */
export function ChoiceRow({
  label,
  helpText,
  selected,
  onPress,
  kind = 'radio',
  disabled,
}: ChoiceRowProps) {
  return (
    <Pressable
      accessibilityRole={kind}
      accessibilityState={{ checked: selected, disabled: disabled === true }}
      accessibilityLabel={label}
      accessibilityHint={helpText}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        pressed && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
    >
      <View
        style={[
          styles.indicator,
          kind === 'radio' ? styles.indicatorRadio : styles.indicatorCheckbox,
          selected && styles.indicatorSelected,
        ]}
      >
        {selected ? (
          <AppText variant="label" color={colors.onBrand} style={styles.indicatorGlyph}>
            {kind === 'radio' ? '●' : '✓'}
          </AppText>
        ) : null}
      </View>
      <View style={styles.labels}>
        <AppText variant="body">{label}</AppText>
        {helpText ? (
          <AppText variant="secondary" muted>
            {helpText}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH_TARGET + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  rowSelected: {
    borderColor: colors.brand,
    borderWidth: 2,
  },
  rowPressed: {
    backgroundColor: colors.canvas,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  indicator: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.mutedInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorRadio: {
    borderRadius: 12,
  },
  indicatorCheckbox: {
    borderRadius: radius.sm,
  },
  indicatorSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  indicatorGlyph: {
    lineHeight: 16,
  },
  labels: {
    flex: 1,
    gap: spacing.xs,
  },
});
