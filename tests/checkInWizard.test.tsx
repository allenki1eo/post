import { fireEvent, render } from '@testing-library/react-native';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import { CheckInWizard, type CheckInSubmitOutcome } from '../src/components/patient/CheckInWizard';
import type { CheckInDraft } from '../src/features/checkIns/checkInService';
import { todaysSchedule } from '../src/features/checkIns/schedule';
import { en } from '../src/i18n/en';
import { sw } from '../src/i18n/sw';
import { loadSeedData } from '../src/repositories/seedLoader';

const seed = loadSeedData();
const followUp = seed.cases.find((c) => c.id === 'case-mp-urgent')!;
const template = seed.templates.find((t) => t.id === followUp.templateId)!;
const plan = followUp.carePlan;
const TZ = 'Africa/Dar_es_Salaam';
const NOW = '2026-08-19T09:00:00.000Z';
const schedule = todaysSchedule(plan, TZ, NOW);

/** 08:00 and 20:00 UTC render as 11:00 and 23:00 in Dar es Salaam. */
const FIRST_DOSE_LABEL = 'Paracetamol 500 mg at 11:00';

const instance = i18next.createInstance();

beforeAll(async () => {
  await instance.use(initReactI18next).init({
    resources: { en: { translation: en }, sw: { translation: sw } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
});

beforeEach(async () => {
  await instance.changeLanguage('en');
});

type WizardProps = React.ComponentProps<typeof CheckInWizard>;

async function renderWizard(overrides: Partial<WizardProps> = {}) {
  const onSubmit = jest.fn(async (): Promise<CheckInSubmitOutcome> => ({
    savedOffline: true,
    urgentInstructions: [],
    planUrgentInstructions: plan.urgentInstructions,
  }));
  const props: WizardProps = {
    carePlan: plan,
    template,
    timezone: TZ,
    expectedDoseIds: schedule.expectedDoseIds,
    onSubmit,
    onDone: jest.fn(),
    ...overrides,
  };
  const utils = await render(
    <I18nextProvider i18n={instance}>
      <CheckInWizard {...props} />
    </I18nextProvider>,
  );
  return { ...utils, onSubmit: props.onSubmit as jest.Mock };
}

describe('CheckInWizard', () => {
  it('starts on the medication step showing the clinician wording verbatim', async () => {
    const { getByText, getAllByText } = await renderWizard();
    expect(getByText('Which doses have you taken today?')).toBeTruthy();
    // One row per scheduled dose, each carrying the clinician's own wording.
    expect(getAllByText(plan.medicationInstructions[0].clinicianWording.en)).toHaveLength(2);
    expect(getByText('Step 1 of 7')).toBeTruthy();
  });

  it('preserves answers when navigating backward', async () => {
    const { getByText, getByLabelText } = await renderWizard();

    await fireEvent.press(getByLabelText(FIRST_DOSE_LABEL));
    expect(getByLabelText(FIRST_DOSE_LABEL).props.accessibilityState.checked).toBe(true);

    await fireEvent.press(getByText('Next'));
    await fireEvent.press(getByLabelText('Better'));
    await fireEvent.press(getByText('Next'));

    await fireEvent.press(getByText('Back'));
    expect(getByLabelText('Better').props.accessibilityState.checked).toBe(true);

    await fireEvent.press(getByText('Back'));
    // The dose confirmation survived the round trip.
    expect(getByLabelText(FIRST_DOSE_LABEL).props.accessibilityState.checked).toBe(true);
  });

  it('blocks advancing past a required question with no answer', async () => {
    const { getByText, queryByText } = await renderWizard();
    await fireEvent.press(getByText('Next')); // to the required overall-condition question
    await fireEvent.press(getByText('Next'));
    expect(getByText('Please choose an answer to continue.')).toBeTruthy();
    // Still on the same question.
    expect(queryByText('Compared to yesterday, how do you feel overall?')).toBeTruthy();
  });

  it('submits offline and confirms without waiting for connectivity', async () => {
    const { getByText, getByLabelText, onSubmit, findByText } = await renderWizard();

    await fireEvent.press(getByLabelText(FIRST_DOSE_LABEL));
    await fireEvent.press(getByText('Next'));
    await fireEvent.press(getByLabelText('Better'));
    await fireEvent.press(getByText('Next'));
    await fireEvent.press(getByLabelText('2')); // pain scale
    await fireEvent.press(getByText('Next'));
    await fireEvent.press(getByLabelText('No')); // bleeding
    await fireEvent.press(getByText('Next'));
    await fireEvent.press(getByLabelText('No')); // fever
    await fireEvent.press(getByText('Next')); // note
    await fireEvent.press(getByText('Next')); // review

    expect(getByText('Check your answers')).toBeTruthy();
    await fireEvent.press(getByText('Submit check-in'));

    expect(await findByText('Saved on this phone. It will sync when you are online.')).toBeTruthy();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const draft = onSubmit.mock.calls[0][0] as CheckInDraft;
    expect(draft.confirmedDoseIds).toHaveLength(1);
    expect(draft.answers).toEqual(
      expect.arrayContaining([
        { questionId: 'q-mp-overall', value: 'better' },
        { questionId: 'q-mp-bleeding', value: false },
      ]),
    );
  });

  it('shows the clinic-authored urgent instruction immediately on an urgent match', async () => {
    const urgentSubmit = jest.fn(async (): Promise<CheckInSubmitOutcome> => ({
      savedOffline: true,
      urgentInstructions: [
        {
          ruleId: 'rule-mp-bleeding',
          message: template.workflowRules.find((r) => r.id === 'rule-mp-bleeding')!.messageOnMatch,
        },
      ],
      planUrgentInstructions: plan.urgentInstructions,
    }));
    const { getByText, getByLabelText, findByText } = await renderWizard({
      onSubmit: urgentSubmit,
    });

    await fireEvent.press(getByText('Next'));
    await fireEvent.press(getByLabelText('Worse'));
    await fireEvent.press(getByText('Next'));
    await fireEvent.press(getByLabelText('9'));
    await fireEvent.press(getByText('Next'));
    await fireEvent.press(getByLabelText('Yes')); // bleeding
    await fireEvent.press(getByText('Next'));
    await fireEvent.press(getByLabelText('No')); // fever
    await fireEvent.press(getByText('Next')); // note
    await fireEvent.press(getByText('Next')); // review
    await fireEvent.press(getByText('Submit check-in'));

    expect(await findByText(/Follow your clinic’s urgent instructions now/)).toBeTruthy();
    // The clinic's own wording is shown, not a generated message.
    expect(getByText(plan.urgentInstructions.en)).toBeTruthy();
    expect(
      getByText(template.workflowRules.find((r) => r.id === 'rule-mp-bleeding')!.messageOnMatch.en),
    ).toBeTruthy();
  });

  it('renders in Kiswahili after a language switch', async () => {
    await instance.changeLanguage('sw');
    const { getByText, getAllByText } = await renderWizard();
    expect(getByText('Ni dozi zipi ulizotumia leo?')).toBeTruthy();
    expect(getByText('Hatua ya 1 kati ya 7')).toBeTruthy();
    expect(getAllByText(plan.medicationInstructions[0].clinicianWording.sw)).toHaveLength(2);
  });

  it('never shows a risk score or workflow status to the patient', async () => {
    const { queryByText, getByText } = await renderWizard();
    for (const forbidden of ['Urgent', 'Review', 'On track', 'risk', 'score']) {
      expect(queryByText(new RegExp(forbidden, 'i'))).toBeNull();
    }
    expect(getByText('Step 1 of 7')).toBeTruthy();
  });

  it('tells a returning patient they may change today’s answers', async () => {
    const { getByText } = await renderWizard({
      alreadyCompleted: true,
      initialDraft: {
        answers: [{ questionId: 'q-mp-overall', value: 'same' }],
        confirmedDoseIds: [],
      },
    });
    expect(getByText(/You already completed today’s check-in/)).toBeTruthy();
  });
});
