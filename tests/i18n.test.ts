import i18next from 'i18next';

import { en } from '../src/i18n/en';
import { glossary } from '../src/i18n/glossary';
import { sw } from '../src/i18n/sw';

type MessageTree = { [key: string]: string | MessageTree };

function collectKeys(tree: MessageTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : collectKeys(value as MessageTree, path);
  });
}

describe('translation key parity', () => {
  const enKeys = collectKeys(en as unknown as MessageTree).sort();
  const swKeys = collectKeys(sw as unknown as MessageTree).sort();

  it('has every English key in Kiswahili and vice versa', () => {
    expect(swKeys).toEqual(enKeys);
  });

  it('has no empty translations in either language', () => {
    const emptyEn = enKeys.filter(
      (key) =>
        key.split('.').reduce<unknown>((node, part) => (node as MessageTree)[part], en) === '',
    );
    const emptySw = swKeys.filter(
      (key) =>
        key.split('.').reduce<unknown>((node, part) => (node as MessageTree)[part], sw) === '',
    );
    expect(emptyEn).toEqual([]);
    expect(emptySw).toEqual([]);
  });

  it('keeps interpolation variables identical between languages', () => {
    const varsOf = (value: string) => (value.match(/\{\{\w+\}\}/g) ?? []).sort();
    for (const key of enKeys) {
      const read = (tree: MessageTree) =>
        key.split('.').reduce<unknown>((node, part) => (node as MessageTree)[part], tree) as string;
      expect({ key, vars: varsOf(read(sw as unknown as MessageTree)) }).toEqual({
        key,
        vars: varsOf(read(en as unknown as MessageTree)),
      });
    }
  });
});

describe('runtime language behavior', () => {
  const instance = i18next.createInstance();
  beforeAll(async () => {
    await instance.init({
      resources: { en: { translation: en }, sw: { translation: sw } },
      lng: 'en',
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });
  });

  it('switches languages at runtime and translates immediately', async () => {
    expect(instance.t('patientTabs.today')).toBe('Today');
    await instance.changeLanguage('sw');
    expect(instance.t('patientTabs.today')).toBe('Leo');
  });

  it('interpolates full messages with named variables (no fragment concatenation)', async () => {
    await instance.changeLanguage('sw');
    expect(instance.t('patientToday.planDay', { day: 3, total: 7 })).toBe('Siku ya 3 kati ya 7');
    expect(instance.t('adherence.fraction', { confirmed: 8, expected: 10 })).toBe(
      '8 zimethibitishwa / 10 zilizotarajiwa',
    );
  });

  it('pluralizes per locale', async () => {
    await instance.changeLanguage('en');
    expect(instance.t('clinicianPatients.openAlerts', { count: 1 })).toBe('1 open alert');
    expect(instance.t('clinicianPatients.openAlerts', { count: 3 })).toBe('3 open alerts');
  });

  it('falls back to English for an unknown key instead of crashing', async () => {
    await instance.changeLanguage('sw');
    expect(instance.t('workflowStatus.on_track')).toBe('Inaendelea vizuri');
  });
});

describe('glossary', () => {
  it('provides both languages and context for every entry', () => {
    for (const entry of glossary) {
      expect(entry.en.length).toBeGreaterThan(0);
      expect(entry.sw.length).toBeGreaterThan(0);
      expect(entry.context.length).toBeGreaterThan(0);
    }
  });

  it('is still provisional pending qualified review', () => {
    expect(glossary.every((entry) => entry.reviewStatus === 'provisional')).toBe(true);
  });
});
