import { describe, expect, it } from 'vitest';
import { normalisePhone, parseReply } from '../src/domain/sms-grammar.js';

describe('parseReply', () => {
  it('reads the documented numeric codes', () => {
    expect(parseReply('1')).toEqual({ kind: 'code', code: '1' });
    expect(parseReply(' 2 ')).toEqual({ kind: 'code', code: '2' });
    expect(parseReply('3')).toEqual({ kind: 'code', code: '3' });
  });

  it('reads a leading digit even with words after it', () => {
    expect(parseReply('1 asante')).toEqual({ kind: 'code', code: '1' });
    expect(parseReply('3. naumwa sana')).toEqual({ kind: 'code', code: '3' });
  });

  it('accepts Swahili keywords', () => {
    expect(parseReply('Ndiyo')).toEqual({ kind: 'code', code: '1' });
    expect(parseReply('nimekunywa')).toEqual({ kind: 'code', code: '1' });
    expect(parseReply('bado')).toEqual({ kind: 'code', code: '2' });
    expect(parseReply('hapana')).toEqual({ kind: 'code', code: '2' });
    expect(parseReply('naomba msaada')).toEqual({ kind: 'code', code: '3' });
  });

  it('accepts English keywords', () => {
    expect(parseReply('YES')).toEqual({ kind: 'code', code: '1' });
    expect(parseReply('no')).toEqual({ kind: 'code', code: '2' });
    expect(parseReply('help me please')).toEqual({ kind: 'code', code: '3' });
  });

  it('recognises unsubscribe in both languages', () => {
    expect(parseReply('STOP')).toEqual({ kind: 'stop' });
    expect(parseReply('acha')).toEqual({ kind: 'stop' });
  });

  it('does not force free text into a code', () => {
    // A patient describing chest pain must never get "invalid reply" back.
    expect(parseReply('nina maumivu ya kifua tangu jana usiku na siwezi kulala')).toEqual({
      kind: 'unparsed',
    });
    expect(parseReply('')).toEqual({ kind: 'unparsed' });
  });
});

describe('normalisePhone', () => {
  it('normalises Tanzanian formats to E.164', () => {
    expect(normalisePhone('0754123456')).toBe('+255754123456');
    expect(normalisePhone('+255 754 123 456')).toBe('+255754123456');
    expect(normalisePhone('255754123456')).toBe('+255754123456');
    expect(normalisePhone('00255754123456')).toBe('+255754123456');
    expect(normalisePhone('754123456')).toBe('+255754123456');
  });
});
