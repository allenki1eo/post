import { render } from '@testing-library/react-native';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import { Button } from '../src/components/primitives/Button';
import { StatusLabel } from '../src/components/primitives/StatusLabel';
import { en } from '../src/i18n/en';
import { sw } from '../src/i18n/sw';

const instance = i18next.createInstance();
beforeAll(async () => {
  await instance.use(initReactI18next).init({
    resources: { en: { translation: en }, sw: { translation: sw } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
});

function wrap(children: React.ReactElement) {
  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}

describe('StatusLabel', () => {
  it('pairs the status color with text and a glyph in English', async () => {
    await instance.changeLanguage('en');
    const { getByText } = await render(wrap(<StatusLabel status="urgent" />));
    expect(getByText(/Urgent/)).toBeTruthy();
    expect(getByText(/▲/)).toBeTruthy();
  });

  it('renders the Kiswahili label after a language switch', async () => {
    await instance.changeLanguage('sw');
    const { getByText } = await render(wrap(<StatusLabel status="on_track" />));
    expect(getByText(/Inaendelea vizuri/)).toBeTruthy();
  });
});

describe('Button', () => {
  it('exposes an accessibility role and label', async () => {
    const { getByRole } = await render(
      wrap(<Button label="Anza kujaza taarifa" onPress={() => {}} />),
    );
    const button = getByRole('button');
    expect(button.props.accessibilityLabel).toBe('Anza kujaza taarifa');
  });
});
