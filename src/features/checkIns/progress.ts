/**
 * Patient-facing progress summary.
 *
 * Neutral counts only — no interpretation, no scores, no trend adjectives.
 * Missing answers are counted as missing, never as a negative answer.
 */
import { calculateAdherence, type AdherenceResult } from '../../domain/adherence';
import type { CarePlan, CarePlanTemplate, CheckInQuestion } from '../../domain/models';
import type { StoredCheckIn } from '../../storage/types';
import { localDayRange, scheduleIdFor } from './schedule';

export interface QuestionSummary {
  questionId: string;
  question: CheckInQuestion;
  /** Times the patient reported the notable value (yes, or "better"). */
  reportedCount: number;
  /** Check-ins where this question has no answer at all. */
  missingCount: number;
  total: number;
  kind: 'condition' | 'symptom';
}

export interface ProgressSummary {
  completedCheckIns: number;
  /** Scheduled days that have come due so far, bounded by the plan window. */
  scheduledCheckIns: number;
  adherence: AdherenceResult;
  questions: QuestionSummary[];
}

export function summarizeProgress(
  checkIns: readonly StoredCheckIn[],
  plan: CarePlan | undefined,
  template: CarePlanTemplate | undefined,
  timezone: string,
  nowIso: string,
): ProgressSummary {
  const adherence = calculateAdherence(checkIns);
  const scheduledCheckIns = plan ? countScheduledDays(plan, timezone, nowIso) : checkIns.length;

  const questions: QuestionSummary[] = (template?.checkInQuestions ?? [])
    .filter((question) => question.type !== 'medication_confirmation')
    .map((question) => {
      let reportedCount = 0;
      let missingCount = 0;
      for (const checkIn of checkIns) {
        const answer = checkIn.answers.find((candidate) => candidate.questionId === question.id);
        if (answer === undefined) {
          missingCount += 1;
          continue;
        }
        if (
          question.type === 'overall_condition' ? answer.value === 'better' : answer.value === true
        ) {
          reportedCount += 1;
        }
      }
      const summary: QuestionSummary = {
        questionId: question.id,
        question,
        reportedCount,
        missingCount,
        total: checkIns.length,
        kind: question.type === 'overall_condition' ? 'condition' : 'symptom',
      };
      return summary;
    })
    // A 0–10 scale has no single "notable" value, so it is not summarized as a
    // count; showing one would imply an interpretation POST must not make.
    .filter((summary) => summary.question.type !== 'number');

  return {
    completedCheckIns: checkIns.length,
    scheduledCheckIns,
    adherence,
    questions,
  };
}

function countScheduledDays(plan: CarePlan, timezone: string, nowIso: string): number {
  const planEnd = plan.endsAt ? Date.parse(plan.endsAt) : Date.parse(nowIso);
  const lastMs = Math.min(Date.parse(nowIso), planEnd);
  const ids = new Set<string>();
  for (let dayMs = Date.parse(plan.startsAt); dayMs <= lastMs; dayMs += 86_400_000) {
    const { localDate } = localDayRange(new Date(dayMs).toISOString(), timezone);
    ids.add(scheduleIdFor(plan.id, localDate));
  }
  return ids.size;
}
