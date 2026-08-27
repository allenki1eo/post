/**
 * SMS reply parsing. (DECISIONS.md D2)
 *
 * Numeric codes are the documented grammar because they survive a feature phone
 * keypad and a patient who does not read well. Keywords are accepted silently in
 * Swahili and English so a natural reply is never rejected.
 *
 * Nothing is ever dropped: an unparsed reply is stored raw and surfaced to the
 * doctor as an unread message. A patient texting "nina maumivu ya kifua"
 * (chest pain) must never receive "invalid reply".
 */

export type ReplyCode = '1' | '2' | '3';
export type ParsedReply =
  | { kind: 'code'; code: ReplyCode }
  | { kind: 'stop' }
  | { kind: 'unparsed' };

const KEYWORDS: Record<string, ReplyCode | 'stop'> = {
  // 1 — done / yes
  ndiyo: '1', ndio: '1', nimekunywa: '1', nimekunywu: '1', imekamilika: '1',
  nitakuja: '1', naja: '1', sawa: '1',
  yes: '1', y: '1', taken: '1', done: '1', ok: '1', okay: '1',
  // 2 — not yet / no
  bado: '2', hapana: '2', sijakunywa: '2', sitakuja: '2',
  no: '2', n: '2', not: '2', later: '2',
  // 3 — need help
  msaada: '3', nahitaji: '3', saidia: '3', nisaidie: '3', mgonjwa: '3',
  help: '3', sick: '3', pain: '3',
  // unsubscribe
  stop: 'stop', acha: 'stop', sitisha: 'stop', ondoa: 'stop', end: 'stop',
};

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalise(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseReply(raw: string): ParsedReply {
  const text = normalise(raw);
  if (!text) return { kind: 'unparsed' };

  const first = text.split(' ')[0]!;

  // "1", and "1 asante" — a leading digit is the answer whatever follows it
  const digit = first.match(/^([123])/);
  if (digit) return { kind: 'code', code: digit[1] as ReplyCode };

  const byKeyword = KEYWORDS[first];
  if (byKeyword === 'stop') return { kind: 'stop' };
  if (byKeyword) return { kind: 'code', code: byKeyword };

  // A keyword anywhere in a short message still counts ("naomba msaada").
  if (text.length <= 40) {
    for (const word of text.split(' ')) {
      const hit = KEYWORDS[word];
      if (hit === 'stop') return { kind: 'stop' };
      if (hit) return { kind: 'code', code: hit };
    }
  }

  return { kind: 'unparsed' };
}

/** E.164 normalisation. Tanzania default; a leading + is respected as-is. (D10) */
export function normalisePhone(input: string, defaultCountry = '255'): string {
  const digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0')) return `+${defaultCountry}${digits.slice(1)}`;
  if (digits.startsWith(defaultCountry)) return `+${digits}`;
  return `+${defaultCountry}${digits}`;
}
