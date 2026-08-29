import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type {
  Answer,
  CarePlan,
  CarePlanTemplate,
  CheckInQuestion,
  LocalizedText,
  SupportedLanguage,
} from '../../domain/models';
import type { CheckInDraft, UrgentInstruction } from '../../features/checkIns/checkInService';
import { describeDoses } from '../../features/checkIns/doses';
import { colors, spacing } from '../../theme/tokens';
import { AppText } from '../primitives/AppText';
import { Banner } from '../primitives/Banner';
import { Button } from '../primitives/Button';
import { ChoiceRow } from '../primitives/ChoiceRow';
import { ScaleInput } from '../primitives/ScaleInput';
import { StepProgress } from '../primitives/StepProgress';
import { TextField } from '../primitives/TextField';

export interface CheckInSubmitOutcome {
  savedOffline: boolean;
  urgentInstructions: UrgentInstruction[];
  planUrgentInstructions: LocalizedText;
}

export interface CheckInWizardProps {
  carePlan: CarePlan;
  template: CarePlanTemplate;
  timezone: string;
  expectedDoseIds: string[];
  /** Answers already saved for today, when the patient is revising them. */
  initialDraft?: CheckInDraft;
  alreadyCompleted?: boolean;
  onSubmit: (draft: CheckInDraft) => Promise<CheckInSubmitOutcome>;
  onDone: () => void;
}

type Step =
  | { kind: 'doses'; question: CheckInQuestion }
  | { kind: 'question'; question: CheckInQuestion }
  | { kind: 'note' }
  | { kind: 'review' };

/**
 * The daily check-in.
 *
 * One question per view, large targets, a visible step count, and back
 * navigation that preserves answers because all answers live in this
 * component's state rather than per-step.
 *
 * Submitting is local-first: `onSubmit` saves and confirms without waiting for
 * connectivity, and a clinic-authored urgent instruction is shown immediately
 * when the clinic's own rules match — never a generated message, never gated
 * on a model.
 */
export function CheckInWizard({
  carePlan,
  template,
  timezone,
  expectedDoseIds,
  initialDraft,
  alreadyCompleted,
  onSubmit,
  onDone,
}: CheckInWizardProps) {
  const { t, i18n } = useTranslation();
  const language = (i18n.language === 'sw' ? 'sw' : 'en') as SupportedLanguage;

  const steps = useMemo<Step[]>(() => buildSteps(template), [template]);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer['value']>>(() =>
    Object.fromEntries((initialDraft?.answers ?? []).map((a) => [a.questionId, a.value])),
  );
  const [confirmedDoseIds, setConfirmedDoseIds] = useState<string[]>(
    () => initialDraft?.confirmedDoseIds ?? [],
  );
  const [note, setNote] = useState(initialDraft?.patientNote ?? '');
  const [validationError, setValidationError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<CheckInSubmitOutcome | undefined>();

  const doses = useMemo(
    () => describeDoses(expectedDoseIds, carePlan, timezone),
    [expectedDoseIds, carePlan, timezone],
  );

  if (outcome) {
    return (
      <View style={styles.container}>
        {outcome.urgentInstructions.length > 0 ? (
          <Banner
            tone="urgent"
            title={t('checkIn.urgentTitle')}
            body={outcome.planUrgentInstructions[language]}
          >
            <AppText variant="secondary">{t('checkIn.urgentSubtitle')}</AppText>
            {outcome.urgentInstructions.map((instruction) => (
              <AppText key={instruction.ruleId} variant="body">
                {instruction.message[language]}
              </AppText>
            ))}
          </Banner>
        ) : null}
        <Banner
          tone={outcome.savedOffline ? 'info' : 'success'}
          title={outcome.savedOffline ? t('checkIn.savedOfflineTitle') : t('checkIn.savedTitle')}
          body={outcome.savedOffline ? t('syncStatus.savedOffline') : t('checkIn.savedBody')}
        />
        <Button label={t('checkIn.done')} onPress={onDone} />
      </View>
    );
  }

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const setAnswer = (questionId: string, value: Answer['value']) => {
    setAnswers((previous) => ({ ...previous, [questionId]: value }));
    setValidationError(false);
  };

  const canAdvance = (): boolean => {
    if (step.kind === 'question' && step.question.required) {
      return answers[step.question.id] !== undefined;
    }
    return true;
  };

  const goNext = async () => {
    if (!canAdvance()) {
      setValidationError(true);
      return;
    }
    if (!isLast) {
      setStepIndex(stepIndex + 1);
      return;
    }
    setSubmitting(true);
    try {
      const result = await onSubmit({
        answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
        confirmedDoseIds,
        ...(note.trim() ? { patientNote: note.trim() } : {}),
      });
      setOutcome(result);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StepProgress
        current={stepIndex + 1}
        total={steps.length}
        label={t('checkIn.stepLabel', { current: stepIndex + 1, total: steps.length })}
      />

      {alreadyCompleted && stepIndex === 0 ? (
        <Banner tone="info" title={t('checkIn.alreadyCompleted')} />
      ) : null}

      {step.kind === 'doses' ? (
        <View style={styles.stepBody}>
          <AppText variant="title">{t('checkIn.medicationStepTitle')}</AppText>
          <AppText variant="secondary" muted>
            {t('checkIn.medicationStepHelp')}
          </AppText>
          {doses.length === 0 ? (
            <AppText variant="body" muted>
              {t('checkIn.noDosesToday')}
            </AppText>
          ) : (
            doses.map((dose) => (
              <ChoiceRow
                key={dose.doseId}
                kind="checkbox"
                label={t('checkIn.doseAt', { name: dose.displayName, time: dose.localTime })}
                // The clinician's own wording, shown verbatim.
                helpText={
                  carePlan.medicationInstructions.find((m) => m.id === dose.instructionId)
                    ?.clinicianWording[language]
                }
                selected={confirmedDoseIds.includes(dose.doseId)}
                onPress={() =>
                  setConfirmedDoseIds((previous) =>
                    previous.includes(dose.doseId)
                      ? previous.filter((id) => id !== dose.doseId)
                      : [...previous, dose.doseId],
                  )
                }
              />
            ))
          )}
        </View>
      ) : null}

      {step.kind === 'question' ? (
        <View style={styles.stepBody}>
          <AppText variant="title">{step.question.label[language]}</AppText>
          {step.question.helpText ? (
            <AppText variant="secondary" muted>
              {step.question.helpText[language]}
            </AppText>
          ) : null}
          {renderQuestionInput(step.question, answers[step.question.id], setAnswer, language, t)}
          {validationError ? (
            <AppText variant="secondary" color={colors.urgent} accessibilityRole="alert">
              {t('checkIn.requiredAnswer')}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {step.kind === 'note' ? (
        <View style={styles.stepBody}>
          <AppText variant="title">{t('checkIn.noteTitle')}</AppText>
          <TextField
            label={t('checkIn.noteLabel')}
            helpText={t('checkIn.noteHelp')}
            value={note}
            onChangeText={setNote}
          />
        </View>
      ) : null}

      {step.kind === 'review' ? (
        <View style={styles.stepBody}>
          <AppText variant="title">{t('checkIn.reviewTitle')}</AppText>
          <AppText variant="body">
            {t('checkIn.reviewDoses', {
              confirmed: confirmedDoseIds.length,
              expected: expectedDoseIds.length,
            })}
          </AppText>
          {template.checkInQuestions
            .filter((question) => question.type !== 'medication_confirmation')
            .map((question) => (
              <View key={question.id} style={styles.reviewRow}>
                <AppText variant="secondary" muted>
                  {question.label[language]}
                </AppText>
                <AppText variant="body">
                  {formatAnswer(question, answers[question.id], language) ?? t('checkIn.noAnswer')}
                </AppText>
              </View>
            ))}
          {note.trim() ? (
            <View style={styles.reviewRow}>
              <AppText variant="secondary" muted>
                {t('checkIn.reviewNote')}
              </AppText>
              <AppText variant="body">{note.trim()}</AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={
            submitting ? t('checkIn.submitting') : isLast ? t('checkIn.submit') : t('checkIn.next')
          }
          onPress={goNext}
          disabled={submitting}
        />
        {stepIndex > 0 ? (
          <Button
            label={t('common.back')}
            kind="secondary"
            onPress={() => {
              setValidationError(false);
              setStepIndex(stepIndex - 1);
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

function buildSteps(template: CarePlanTemplate): Step[] {
  const steps: Step[] = [];
  const medicationQuestion = template.checkInQuestions.find(
    (question) => question.type === 'medication_confirmation',
  );
  if (medicationQuestion) {
    steps.push({ kind: 'doses', question: medicationQuestion });
  }
  for (const question of template.checkInQuestions) {
    if (question.type !== 'medication_confirmation') {
      steps.push({ kind: 'question', question });
    }
  }
  steps.push({ kind: 'note' });
  steps.push({ kind: 'review' });
  return steps;
}

function renderQuestionInput(
  question: CheckInQuestion,
  value: Answer['value'] | undefined,
  setAnswer: (questionId: string, value: Answer['value']) => void,
  language: SupportedLanguage,
  t: (key: string) => string,
) {
  if (question.type === 'yes_no') {
    return (
      <View>
        {[
          { value: true, label: t('checkIn.yes') },
          { value: false, label: t('checkIn.no') },
        ].map((option) => (
          <ChoiceRow
            key={String(option.value)}
            label={option.label}
            selected={value === option.value}
            onPress={() => setAnswer(question.id, option.value)}
          />
        ))}
      </View>
    );
  }

  if (question.type === 'number') {
    return (
      <ScaleInput
        min={question.minValue ?? 0}
        max={question.maxValue ?? 10}
        value={typeof value === 'number' ? value : undefined}
        onChange={(next) => setAnswer(question.id, next)}
        minLabel={String(question.minValue ?? 0)}
        maxLabel={String(question.maxValue ?? 10)}
        accessibilityLabel={question.label[language]}
      />
    );
  }

  if (question.options) {
    return (
      <View>
        {question.options.map((option) => (
          <ChoiceRow
            key={option.value}
            label={option.label[language]}
            selected={value === option.value}
            onPress={() => setAnswer(question.id, option.value)}
          />
        ))}
      </View>
    );
  }

  return null;
}

function formatAnswer(
  question: CheckInQuestion,
  value: Answer['value'] | undefined,
  language: SupportedLanguage,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value ? '✓' : '—';
  }
  const option = question.options?.find((candidate) => candidate.value === value);
  return option ? option.label[language] : String(value);
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  stepBody: {
    gap: spacing.md,
  },
  reviewRow: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
