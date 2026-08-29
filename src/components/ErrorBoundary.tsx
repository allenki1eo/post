import React, { Component, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme/tokens';
import { AppText } from './primitives/AppText';
import { Button } from './primitives/Button';

interface ErrorBoundaryState {
  error: Error | undefined;
}

/**
 * Top-level error boundary. Shows a plain recovery screen; never exposes
 * patient data in the error output.
 */
export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: undefined };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error);
    }
  }

  private reset = () => {
    this.setState({ error: undefined });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <View style={styles.container}>
        <AppText variant="title">Something went wrong</AppText>
        <AppText variant="body" muted style={styles.body}>
          The app hit an unexpected error. Your saved data is safe on this phone.
        </AppText>
        <Button label="Try again" onPress={this.reset} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  body: {
    marginBottom: spacing.sm,
  },
});
