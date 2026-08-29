/**
 * i18n foundation: English and Kiswahili as equal first-class languages.
 *
 * - The user's explicit choice is persisted (AsyncStorage) and wins over the
 *   device locale; the device locale is only the initial suggestion.
 * - Missing keys fall back to English; in development a visible warning is
 *   logged and the parity test fails the build.
 * - Switching is local and immediate; it works offline.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { SupportedLanguage } from '../domain/models';
import { en } from './en';
import { sw } from './sw';

const LANGUAGE_STORAGE_KEY = 'post.preferredLanguage';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'sw'];

export function deviceSuggestedLanguage(): SupportedLanguage {
  const deviceLanguage = getLocales()[0]?.languageCode;
  return deviceLanguage === 'sw' ? 'sw' : 'en';
}

export async function loadStoredLanguage(): Promise<SupportedLanguage | undefined> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === 'en' || stored === 'sw' ? stored : undefined;
  } catch {
    return undefined;
  }
}

export async function setAppLanguage(language: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(language);
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Persistence is best-effort; the in-memory switch already happened.
  }
}

export function initI18n(initialLanguage?: SupportedLanguage): typeof i18n {
  if (i18n.isInitialized) {
    return i18n;
  }
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      sw: { translation: sw },
    },
    lng: initialLanguage ?? deviceSuggestedLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    saveMissing: __DEV__,
    missingKeyHandler: (_lngs, _ns, key) => {
      if (__DEV__) {
        console.warn(`[i18n] Missing translation key: ${key}`);
      }
    },
  });
  return i18n;
}

export { en, sw };
export default i18n;
