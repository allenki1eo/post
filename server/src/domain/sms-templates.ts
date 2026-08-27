/**
 * SMS is the interface for most POST patients, and it has harder constraints
 * than any screen (DESIGN-SYSTEM.md, "SMS as a design surface"):
 *
 *   - 160 characters per GSM-7 segment. Two segments cost double and can arrive
 *     out of order, so every template must fit one.
 *   - GSM-7 only. One emoji or curly quote flips the whole message to UCS-2 and
 *     drops the limit to 70.
 *   - Every reminder restates its reply grammar: there is no scrollback.
 *   - The sender identifies itself, so an unexpected SMS is not read as a scam.
 *   - No diagnosis, ever. SMS is unencrypted and phones get shared.
 */

const GSM7 =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM7_EXTENDED = '^{}\\[~]|€';

const gsmChars = new Set([...GSM7]);
const gsmExtended = new Set([...GSM7_EXTENDED]);

export function isGsm7(text: string): boolean {
  return [...text].every((c) => gsmChars.has(c) || gsmExtended.has(c));
}

/** Extended characters cost two septets each. */
export function gsm7Length(text: string): number {
  return [...text].reduce((n, c) => n + (gsmExtended.has(c) ? 2 : 1), 0);
}

export function nonGsm7Characters(text: string): string[] {
  return [...new Set([...text].filter((c) => !gsmChars.has(c) && !gsmExtended.has(c)))];
}

export const SINGLE_SEGMENT = 160;

export function segments(text: string): number {
  if (!isGsm7(text)) return Math.ceil([...text].length / 70); // UCS-2
  const len = gsm7Length(text);
  return len <= SINGLE_SEGMENT ? 1 : Math.ceil(len / 153); // concatenated GSM-7
}

export class SmsTooLongError extends Error {
  constructor(readonly body: string) {
    super(`SMS is ${gsm7Length(body)} septets (${segments(body)} segments): ${body}`);
    this.name = 'SmsTooLongError';
  }
}

/** Trim a free-text value (a drug name, a place) so the whole body still fits. */
function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, Math.max(1, max - 1)).trimEnd()}.`;
}

/** Strip anything that would flip the message to UCS-2 (curly quotes, dashes). */
export function toGsm7(value: string): string {
  return value
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC');
}

export type Locale = 'sw' | 'en';

export interface MedicationSms {
  doctorName: string;
  medication: string;
  dosage: string;
  /** Local wall clock of the dose, 'HH:MM'. Named explicitly because a
   *  quiet-hours-deferred reminder can arrive before the dose is due. */
  time: string;
  locale: Locale;
}

export interface VisitSms {
  doctorName: string;
  visitDate: string; // 'DD/MM'
  location: string;
  daysAhead: number;
  locale: Locale;
}

export interface WellbeingSms {
  doctorName: string;
  locale: Locale;
}

function build(body: string): string {
  const out = toGsm7(body).replace(/\s+/g, ' ').trim();
  if (segments(out) > 1) throw new SmsTooLongError(out);
  return out;
}

const doctorLabel = (name: string, locale: Locale) =>
  `${locale === 'sw' ? 'Dkt' : 'Dr'} ${clip(name, 18)}`;

export function medicationSms(p: MedicationSms): string {
  const med = clip(p.medication, 22);
  const dose = clip(p.dosage, 14);
  const who = doctorLabel(p.doctorName, p.locale);
  return p.locale === 'sw'
    ? build(
        `POST - ${who}. Kumbusho la dawa ${p.time}: ${med} ${dose}. ` +
          `Jibu 1=nimekunywa, 2=bado, 3=nahitaji msaada`,
      )
    : build(
        `POST - ${who}. Medication reminder ${p.time}: ${med} ${dose}. ` +
          `Reply 1=taken, 2=not yet, 3=need help`,
      );
}

export function visitSms(p: VisitSms): string {
  const place = clip(p.location, 24);
  const who = doctorLabel(p.doctorName, p.locale);
  if (p.locale === 'sw') {
    const when = p.daysAhead === 1 ? 'kesho' : `tarehe ${p.visitDate}`;
    return build(
      `POST - ${who}. Una miadi ${when} ${place}. Jibu 1=nitakuja, 2=siwezi, 3=nahitaji msaada`,
    );
  }
  const when = p.daysAhead === 1 ? 'tomorrow' : `on ${p.visitDate}`;
  return build(
    `POST - ${who}. You have a visit ${when} at ${place}. Reply 1=coming, 2=cannot, 3=need help`,
  );
}

export function wellbeingSms(p: WellbeingSms): string {
  const who = doctorLabel(p.doctorName, p.locale);
  return p.locale === 'sw'
    ? build(`POST - ${who}. Unaendeleaje? Jibu 1=vizuri, 2=sijisikii vizuri, 3=nahitaji msaada`)
    : build(`POST - ${who}. How are you feeling? Reply 1=well, 2=unwell, 3=need help`);
}

export function planClosedSms(p: { doctorName: string; locale: Locale }): string {
  const who = doctorLabel(p.doctorName, p.locale);
  return p.locale === 'sw'
    ? build(`POST - ${who}. Umemaliza matibabu yako. Hutapokea vikumbusho tena. Pona salama.`)
    : build(`POST - ${who}. Your treatment plan is complete. No more reminders. Get well.`);
}
