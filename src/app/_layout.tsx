import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '../components/ErrorBoundary';
import i18n, { initI18n, loadStoredLanguage } from '../i18n';

initI18n();

export default function RootLayout() {
  useEffect(() => {
    // The device locale is only the initial suggestion; the user's explicit,
    // persisted choice wins once loaded.
    loadStoredLanguage().then((stored) => {
      if (stored && stored !== i18n.language) {
        i18n.changeLanguage(stored);
      }
    });
  }, []);

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <ErrorBoundary>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="dark" />
        </ErrorBoundary>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
