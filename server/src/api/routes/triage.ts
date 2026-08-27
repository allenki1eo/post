import { Router } from 'express';
import { query, one } from '../../db.js';
import { requireDoctor } from '../auth.js';

export const triageRouter = Router();
triageRouter.use(requireDoctor);

/**
 * The dashboard is triaged by urgency, not a flat patient list (PRODUCT.md §3).
 * Sorting does more work than colour: the patient who needs attention most is
 * first, and every row carries a label and an icon name so urgency never
 * depends on hue alone. (DESIGN-SYSTEM.md)
 */

const ALERT_LABELS: Record<string, { sw: string; en: string; icon: string }> = {
  red_flag_symptom: { sw: 'Dalili ya hatari', en: 'Red flag symptom', icon: 'alert-triangle' },
  missed_meds:      { sw: 'Dawa haikunywewa', en: 'Missed meds',      icon: 'clock-alert' },
  missed_visit:     { sw: 'Hakuja kliniki',   en: 'Missed visit',     icon: 'clock-alert' },
  unreachable:      { sw: 'Hapatikani',       en: 'Unreachable',      icon: 'signal-off' },
  unparsed_reply:   { sw: 'Ujumbe mpya',      en: 'New message',      icon: 'message' },
  opted_out:        { sw: 'Amejitoa',         en: 'Opted out',        icon: 'signal-off' },
};

const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 } as const;

triageRouter.get('/', async (req, res) => {
  const rows = await query<{
    patient_id: string; name: string; phone: string; diagnosis: string;
    discharge_date: string; language: string;
    alert_id: string; type: string; severity: 'critical' | 'warning' | 'info';
    context: Record<string, unknown>; created_at: Date;
  }>(
    `select p.id as patient_id, p.name, p.phone, p.diagnosis, p.discharge_date, p.language,
            a.id as alert_id, a.type, a.severity, a.context, a.created_at
       from alerts a
       join patients p on p.id = a.patient_id
      where a.doctor_id = $1 and a.resolved = false
      order by case a.severity when 'critical' then 0 when 'warning' then 1 else 2 end,
               a.created_at asc`,
    [req.doctorId],
  );

  const byPatient = new Map<string, any>();
  for (const row of rows) {
    const label = ALERT_LABELS[row.type] ?? { sw: row.type, en: row.type, icon: 'alert-triangle' };
    const entry = byPatient.get(row.patient_id) ?? {
      patient: {
        id: row.patient_id, name: row.name, phone: row.phone,
        diagnosis: row.diagnosis, discharge_date: row.discharge_date, language: row.language,
      },
      severity: row.severity,
      waiting_since: row.created_at,
      reasons: [],
    };
    entry.reasons.push({
      alert_id: row.alert_id,
      type: row.type,
      severity: row.severity,
      label_sw: label.sw,
      label_en: label.en,
      icon: label.icon,
      context: row.context,
      created_at: row.created_at,
    });
    if (SEVERITY_RANK[row.severity] < SEVERITY_RANK[entry.severity as 'critical']) {
      entry.severity = row.severity;
      entry.waiting_since = row.created_at;
    }
    byPatient.set(row.patient_id, entry);
  }

  const needsAttention = [...byPatient.values()].sort((a, b) => {
    const bySeverity = SEVERITY_RANK[a.severity as 'critical'] - SEVERITY_RANK[b.severity as 'critical'];
    if (bySeverity !== 0) return bySeverity;
    return new Date(a.waiting_since).getTime() - new Date(b.waiting_since).getTime();
  });

  const [upcomingVisits, stable] = await Promise.all([
    query(
      `select v.id, v.visit_date, v.location, p.id as patient_id, p.name
         from follow_up_visits v
         join care_plans cp on cp.id = v.care_plan_id
         join patients p on p.id = cp.patient_id
        where p.doctor_id = $1 and p.status = 'active'
          and v.attended is null
          and v.visit_date >= current_date
          and v.visit_date <= current_date + 7
        order by v.visit_date limit 20`,
      [req.doctorId],
    ),
    one<{ count: number }>(
      `select count(*) as count from patients p
        where p.doctor_id = $1 and p.status = 'active'
          and not exists (select 1 from alerts a where a.patient_id = p.id and a.resolved = false)`,
      [req.doctorId],
    ),
  ]);

  res.json({
    needs_attention: needsAttention,
    upcoming_visits: upcomingVisits,
    counts: {
      critical: needsAttention.filter((e) => e.severity === 'critical').length,
      warning: needsAttention.filter((e) => e.severity === 'warning').length,
      info: needsAttention.filter((e) => e.severity === 'info').length,
      stable: stable?.count ?? 0,
    },
  });
});

triageRouter.post('/alerts/:id/resolve', async (req, res) => {
  const updated = await one<{ id: string }>(
    `update alerts set resolved = true, resolved_at = now()
      where id = $1 and doctor_id = $2 and resolved = false returning id`,
    [req.params.id, req.doctorId],
  );
  if (!updated) {
    res.status(404).json({ error: 'alert not found' });
    return;
  }
  res.json({ resolved: updated.id });
});
