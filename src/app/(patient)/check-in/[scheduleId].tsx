import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../../components/primitives/AppText';
import { Screen } from '../../../components/primitives/Screen';
import {
  CheckInWizard,
  type CheckInSubmitOutcome,
} from '../../../components/patient/CheckInWizard';
import type { CheckInDraft } from '../../../features/checkIns/checkInService';
import { submitCheckIn } from '../../../features/checkIns/checkInService';
import { loadPatientToday } from '../../../features/checkIns/patientToday';
import { DEMO_PATIENT_ID } from '../../../features/auth/demoSession';
import { getLocalStore, getSyncTransport, syncOnce } from '../../../storage';
import { useAsyncData } from '../../../utils/useAsyncData';

/**
 * Daily check-in route.
 *
 * Saving is local-first: the check-in and its outbox operation are committed
 * together and confirmed immediately. Synchronization is attempted afterwards
 * and is allowed to fail — the outbox retries later, and the patient is never
 * blocked or blamed.
 */
export default function CheckInScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const { data, loading } = useAsyncData(async () => loadPatientToday(DEMO_PATIENT_ID));

  // Read these once, defensively: the React Compiler evaluates the submit
  // handler's dependencies during render, before the guards below run.
  const carePlan = data?.carePlan;
  const template = data?.template;
  const schedule = data?.schedule;
  const timezone = data?.patient?.timezone ?? 'UTC';
  const todaysCheckIn = data?.todaysCheckIn;

  const handleSubmit = async (draft: CheckInDraft): Promise<CheckInSubmitOutcome> => {
    if (!carePlan || !template) {
      throw new Error('Cannot submit a check-in without an active care plan');
    }
    const store = await getLocalStore();
    const result = await submitCheckIn({
      store,
      patientId: DEMO_PATIENT_ID,
      timezone,
      carePlan,
      template,
      draft,
    });

    // Best-effort send. A failure here is normal offline and is already
    // captured durably in the outbox.
    let savedOffline = true;
    try {
      const sync = await syncOnce(store, getSyncTransport());
      savedOffline = sync.succeeded === 0;
    } catch {
      savedOffline = true;
    }

    return {
      savedOffline,
      urgentInstructions: result.urgentInstructions,
      planUrgentInstructions: result.planUrgentInstructions,
    };
  };

  if (loading) {
    return (
      <Screen>
        <AppText variant="title">{t('checkIn.title')}</AppText>
      </Screen>
    );
  }

  if (!carePlan || !template || !schedule) {
    return (
      <Screen>
        <AppText variant="title">{t('checkIn.title')}</AppText>
        <AppText variant="body" muted>
          {t('patientToday.noActivePlan')}
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="title">{t('checkIn.title')}</AppText>
      <CheckInWizard
        carePlan={carePlan}
        template={template}
        timezone={timezone}
        expectedDoseIds={schedule.expectedDoseIds}
        alreadyCompleted={todaysCheckIn !== undefined}
        initialDraft={
          todaysCheckIn
            ? {
                answers: todaysCheckIn.answers,
                confirmedDoseIds: todaysCheckIn.confirmedDoseIds,
                ...(todaysCheckIn.patientNote ? { patientNote: todaysCheckIn.patientNote } : {}),
              }
            : undefined
        }
        onSubmit={handleSubmit}
        onDone={() => router.replace('/(patient)/today')}
      />
    </Screen>
  );
}
