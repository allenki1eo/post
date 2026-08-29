import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography } from '../../theme/tokens';

type Variant = keyof typeof typography;

export interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  muted?: boolean;
}

/**
 * Text primitive: system font, restrained scale, honors OS font scaling.
 */
export function AppText({ variant = 'body', color, muted, style, ...rest }: AppTextProps) {
  return (
    <Text
      allowFontScaling
      {...rest}
      style={[
        styles.base,
        typography[variant] as TextProps['style'],
        { color: color ?? (muted ? colors.mutedInk : colors.ink) },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.ink,
  },
});
