import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme/tokens';
import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label: string;
  helpText?: string;
  errorText?: string;
}

/**
 * Multi-line-friendly text field. The label is a real label (not a
 * placeholder), so it survives typing and screen-reader focus.
 */
export function TextField({ label, helpText, errorText, style, ...rest }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <AppText variant="label" muted>
        {label}
      </AppText>
      {helpText ? (
        <AppText variant="secondary" muted>
          {helpText}
        </AppText>
      ) : null}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={helpText}
        placeholderTextColor={colors.mutedInk}
        multiline
        {...rest}
        style={[styles.input, errorText ? styles.inputError : null, style]}
      />
      {errorText ? (
        <AppText variant="secondary" color={colors.urgent} accessibilityRole="alert">
          {errorText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    color: colors.ink,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.urgent,
    borderWidth: 2,
  },
});
