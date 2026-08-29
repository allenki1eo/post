import { StyleSheet } from 'react-native';

import { spacing } from '../../theme/tokens';
import { AppText } from './AppText';

/** Section heading: hierarchy from typography and spacing, not containers. */
export function SectionHeading({ label }: { label: string }) {
  return (
    <AppText variant="heading" style={styles.heading} accessibilityRole="header">
      {label}
    </AppText>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
});
