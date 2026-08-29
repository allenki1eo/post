import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, MIN_TOUCH_TARGET, spacing } from '../../theme/tokens';
import { AppText } from './AppText';

export interface ListRowProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
}

/**
 * Information-dense list row for clinician surfaces: quiet divider, no card
 * wrapper, 44pt minimum height.
 */
export function ListRow({ title, subtitle, trailing, onPress, children }: ListRowProps) {
  const content = (
    <View style={styles.row}>
      <View style={styles.main}>
        <AppText variant="body" style={styles.title}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="secondary" muted>
            {subtitle}
          </AppText>
        ) : null}
        {children}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
  if (!onPress) {
    return content;
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: spacing.md,
  },
  main: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontWeight: '500',
  },
  trailing: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
});
