import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/primitives/AppText';
import { EmptyState } from '../../components/primitives/EmptyState';
import { ListRow } from '../../components/primitives/ListRow';
import { Screen } from '../../components/primitives/Screen';
import { StatusLabel } from '../../components/primitives/StatusLabel';
import { getRepository } from '../../repositories';
import { useAsyncData } from '../../utils/useAsyncData';

export default function ClinicianPatients() {
  const { t, i18n } = useTranslation();

  const { data } = useAsyncData(async () => {
    const repository = getRepository();
    const cases = await repository.getFollowUpCases();
    const alerts = await repository.getAlerts();
    return cases.map((followUpCase) => {
      const lastCheckIn = followUpCase.checkIns[followUpCase.checkIns.length - 1];
      const openAlerts = alerts.filter(
        (a) => a.patientId === followUpCase.patientId && a.reviewState === 'open',
      );
      const status = openAlerts.some((a) => a.status === 'urgent')
        ? ('urgent' as const)
        : openAlerts.length > 0
          ? ('review' as const)
          : ('on_track' as const);
      return { followUpCase, lastCheckIn, openAlerts, status };
    });
  });

  const rows = data ?? [];

  return (
    <Screen showDemoBanner>
      <AppText variant="title">{t('clinicianPatients.title')}</AppText>
      {rows.length === 0 ? (
        <EmptyState message={t('reviews.emptyState')} />
      ) : (
        rows.map(({ followUpCase, lastCheckIn, openAlerts, status }) => (
          <ListRow
            key={followUpCase.patientId}
            title={followUpCase.patientId}
            subtitle={
              lastCheckIn
                ? t('clinicianPatients.lastCheckIn', {
                    date: new Date(lastCheckIn.completedAt).toLocaleDateString(i18n.language),
                  })
                : t('clinicianPatients.noCheckInsYet')
            }
            trailing={<StatusLabel status={status} />}
          >
            {openAlerts.length > 0 ? (
              <AppText variant="label" muted>
                {t('clinicianPatients.openAlerts', { count: openAlerts.length })}
              </AppText>
            ) : null}
          </ListRow>
        ))
      )}
    </Screen>
  );
}
