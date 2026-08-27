import { describe, expect, it } from 'vitest';
import {
  gsm7Length, isGsm7, medicationSms, planClosedSms, segments, visitSms, wellbeingSms,
} from '../src/domain/sms-templates.js';

/**
 * Every template must fit one GSM-7 segment. Two segments cost double and can
 * arrive out of order, which for a medication reminder means a patient reading
 * "Reply 1=taken" with no idea what it refers to.
 */
const single = (body: string) => {
  expect(isGsm7(body), `not GSM-7: ${body}`).toBe(true);
  expect(segments(body), `${gsm7Length(body)} septets: ${body}`).toBe(1);
};

describe('SMS templates', () => {
  it('fits a Swahili medication reminder in one segment', () => {
    const body = medicationSms({
      doctorName: 'Mwakalinga',
      medication: 'Amoxicillin',
      dosage: 'vidonge 2',
      time: '08:00',
      locale: 'sw',
    });
    single(body);
    expect(body).toContain('Jibu 1=nimekunywa');
    expect(body).toContain('08:00');
    expect(body).toContain('POST');
  });

  it('fits worst-case long names in one segment', () => {
    single(
      medicationSms({
        doctorName: 'Mwakatumbula-Kilimanjaro',
        medication: 'Sulfamethoxazole/Trimethoprim 800/160',
        dosage: 'vidonge 2 baada ya chakula',
        time: '20:00',
        locale: 'sw',
      }),
    );
    single(
      visitSms({
        doctorName: 'Mwakatumbula-Kilimanjaro',
        visitDate: '14/09',
        location: 'Muhimbili National Hospital, Upanga West, Dar es Salaam',
        daysAhead: 3,
        locale: 'sw',
      }),
    );
  });

  it('covers both locales for every template', () => {
    for (const locale of ['sw', 'en'] as const) {
      single(medicationSms({ doctorName: 'Juma', medication: 'Ibuprofen', dosage: '400mg', time: '13:00', locale }));
      single(visitSms({ doctorName: 'Juma', visitDate: '02/10', location: 'Kliniki ya Sinza', daysAhead: 1, locale }));
      single(wellbeingSms({ doctorName: 'Juma', locale }));
      single(planClosedSms({ doctorName: 'Juma', locale }));
    }
  });

  it('names tomorrow instead of a date for a one-day lead', () => {
    const sw = visitSms({ doctorName: 'Juma', visitDate: '02/10', location: 'Sinza', daysAhead: 1, locale: 'sw' });
    expect(sw).toContain('kesho');
    const en = visitSms({ doctorName: 'Juma', visitDate: '02/10', location: 'Sinza', daysAhead: 1, locale: 'en' });
    expect(en).toContain('tomorrow');
  });

  it('strips characters that would flip the message to UCS-2', () => {
    // One curly quote costs 90 characters of headroom.
    const body = medicationSms({
      doctorName: 'O’Brien',
      medication: 'Paracetamol — 500mg',
      dosage: '1 “tablet”',
      time: '08:00',
      locale: 'en',
    });
    single(body);
    expect(body).toContain("O'Brien");
    expect(body).not.toMatch(/[’“”—]/);
  });

  it('never puts a diagnosis in a message', () => {
    // Nothing in the template surface accepts one — this test exists so that
    // adding a `diagnosis` field to a template fails review loudly.
    const body = medicationSms({
      doctorName: 'Juma', medication: 'Amoxicillin', dosage: '500mg', time: '08:00', locale: 'sw',
    });
    expect(body.toLowerCase()).not.toContain('diagnosis');
  });
});
