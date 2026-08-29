/**
 * Bilingual glossary of terms that must stay consistent across the product.
 *
 * PROVISIONAL: every entry needs review by a fluent Tanzanian Kiswahili
 * speaker and, where clinical, the qualified doctor. Review status is
 * tracked in docs/CLINICAL_REVIEW.md.
 *
 * Rule: medication brand/generic names are never translated. The surrounding
 * instruction is translated; the medicine name is preserved exactly as the
 * clinician entered it.
 */
export interface GlossaryEntry {
  term: string;
  en: string;
  sw: string;
  context: string;
  clinical: boolean;
  reviewStatus: 'provisional' | 'reviewed';
}

export const glossary: GlossaryEntry[] = [
  {
    term: 'check-in',
    en: 'check-in',
    sw: 'kujaza taarifa',
    context: 'The short daily follow-up questionnaire.',
    clinical: false,
    reviewStatus: 'provisional',
  },
  {
    term: 'care plan',
    en: 'care plan',
    sw: 'mpango wa huduma',
    context: 'Clinician-assigned follow-up plan.',
    clinical: true,
    reviewStatus: 'provisional',
  },
  {
    term: 'care passport',
    en: 'Care Passport',
    sw: 'Pasipoti ya Huduma',
    context: 'Patient-controlled portable summary.',
    clinical: false,
    reviewStatus: 'provisional',
  },
  {
    term: 'dose',
    en: 'dose',
    sw: 'dozi',
    context: 'One scheduled intake of a medicine.',
    clinical: true,
    reviewStatus: 'provisional',
  },
  {
    term: 'adherence',
    en: 'medicine record',
    sw: 'kumbukumbu ya dawa',
    context: 'Patient-facing wording avoids the technical term "adherence".',
    clinical: true,
    reviewStatus: 'provisional',
  },
  {
    term: 'urgent',
    en: 'urgent',
    sw: 'dharura',
    context: 'Workflow priority; never a diagnosis.',
    clinical: true,
    reviewStatus: 'provisional',
  },
  {
    term: 'review',
    en: 'review',
    sw: 'mapitio',
    context: 'Workflow priority for clinician review.',
    clinical: true,
    reviewStatus: 'provisional',
  },
  {
    term: 'allergy',
    en: 'allergy',
    sw: 'aleji',
    context: 'Recorded allergy or intolerance.',
    clinical: true,
    reviewStatus: 'provisional',
  },
  {
    term: 'consent',
    en: 'consent',
    sw: 'ridhaa',
    context: 'Patient permission for storage/sharing.',
    clinical: true,
    reviewStatus: 'provisional',
  },
  {
    term: 'revoke',
    en: 'revoke sharing',
    sw: 'sitisha ushirikiaji',
    context: 'Ending an active share grant.',
    clinical: false,
    reviewStatus: 'provisional',
  },
  {
    term: 'clinician',
    en: 'clinician',
    sw: 'tabibu',
    context:
      'Qualified health worker; generic term chosen over daktari to include non-physician clinicians.',
    clinical: true,
    reviewStatus: 'provisional',
  },
  {
    term: 'sync',
    en: 'sync',
    sw: 'kutuma/kupokea mtandaoni',
    context:
      'Data synchronization; patient-facing text prefers full phrases like "Itatumwa mtandao ukipatikana".',
    clinical: false,
    reviewStatus: 'provisional',
  },
];
