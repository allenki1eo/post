import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { colors, MIN_TOUCH_TARGET, radius, spacing } from '../../theme/tokens';
import { AppText } from './AppText';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  kind?: 'primary' | 'secondary';
}

/**
 * Button primitive: 44pt minimum target, immediate pressed feedback (no
 * animation), visible focus, and full-label wrapping for long Kiswahili copy.
 */
export function Button({ label, kind = 'primary', disabled, ...rest }: ButtonProps) {
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        pressed && (primary ? styles.primaryPressed : styles.secondaryPressed),
        disabled && styles.disabled,
      ]}
    >
      <AppText variant="body" style={styles.label} color={primary ? colors.onBrand : colors.brand}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.brand,
  },
  primaryPressed: {
    backgroundColor: colors.brandStrong,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  secondaryPressed: {
    backgroundColor: colors.canvas,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
