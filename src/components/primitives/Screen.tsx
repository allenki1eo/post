import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../../theme/tokens';
import { DemoBanner } from './DemoBanner';

export interface ScreenProps extends PropsWithChildren {
  /** Clinician surfaces always show the synthetic-data banner. */
  showDemoBanner?: boolean;
  scroll?: boolean;
  padded?: boolean;
}

/**
 * Screen scaffold: canvas background, safe-area aware, optional scroll.
 */
export function Screen({ children, showDemoBanner, scroll = true, padded = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const content = <View style={[styles.content, padded && styles.padded]}>{children}</View>;
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {showDemoBanner ? <DemoBanner /> : null}
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});
