import { StyleSheet, View } from 'react-native';

import { spacing } from '../../theme/tokens';
import { AppText } from './AppText';

/** Intentional empty state: states the fact plainly, no illustration filler. */
export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.container}>
      <AppText variant="secondary" muted style={styles.message}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xxl,
    alignItems: 'flex-start',
  },
  message: {
    textAlign: 'left',
  },
});
