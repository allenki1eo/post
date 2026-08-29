import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../theme/tokens';
import { AppText } from './AppText';

export type BannerTone = 'urgent' | 'review' | 'info' | 'success';

const TONES: Record<BannerTone, { background: string; foreground: string; glyph: string }> = {
  urgent: { background: colors.urgentSurface, foreground: colors.urgent, glyph: '▲' },
  review: { background: colors.reviewSurface, foreground: colors.review, glyph: '◐' },
  info: { background: colors.surface, foreground: colors.mutedInk, glyph: 'ℹ' },
  success: { background: colors.successSurface, foreground: colors.success, glyph: '✓' },
};

export interface BannerProps {
  tone: BannerTone;
  title: string;
  body?: string;
  children?: ReactNode;
}

/**
 * Standing message block. Used for the clinic-authored urgent instruction,
 * which must be readable at a glance: tone is carried by text and a glyph as
 * well as color, and the block is announced as an alert to screen readers.
 */
export function Banner({ tone, title, body, children }: BannerProps) {
  const palette = TONES[tone];
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.background, borderColor: palette.foreground },
      ]}
      accessibilityRole={tone === 'urgent' ? 'alert' : 'summary'}
      accessibilityLabel={body ? `${title}. ${body}` : title}
    >
      <AppText variant="heading" color={palette.foreground}>
        {palette.glyph} {title}
      </AppText>
      {body ? <AppText variant="body">{body}</AppText> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    borderLeftWidth: 4,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
});
