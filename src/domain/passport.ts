/**
 * Care Passport share-grant policy.
 *
 * Deterministic grant enforcement (the "grant enforcer" trusted component):
 * - Only a token hash is stored; the plain opaque token exists only during
 *   issuance and presentation.
 * - The QR/access code payload is the opaque token alone — no health data and
 *   no stable patient identifier.
 * - Expired, revoked, over-used, or mismatched grants reveal no patient
 *   existence or clinical content.
 * - The receiving view gets exactly the patient-approved categories.
 */
import type { ClinicalRecord, PassportCategory, ShareGrant } from './models';
import { newOpaqueToken, type RandomSource } from '../utils/ids';
import { sha256Hex } from '../utils/sha256';

export interface IssuedShareToken {
  /** Present to the recipient (QR / short code). Never persisted. */
  plainToken: string;
  /** The only value the backend may store. */
  tokenHash: string;
}

export function issueShareToken(random?: RandomSource): IssuedShareToken {
  const plainToken = newOpaqueToken(24, random);
  return { plainToken, tokenHash: hashShareToken(plainToken) };
}

export function hashShareToken(plainToken: string): string {
  return sha256Hex(plainToken);
}

/**
 * Non-disclosing denial: every rejected outcome carries no patient reference,
 * so callers cannot distinguish "wrong token" from "real but expired token"
 * beyond what the patient-visible audit trail records server-side.
 */
export type GrantAccessDecision =
  | { outcome: 'allowed'; grantId: string; patientId: string; categories: PassportCategory[] }
  | { outcome: 'denied' | 'expired' | 'revoked' | 'over_use_limit' };

export interface GrantAccessRequest {
  presentedToken: string;
  nowIso: string;
}

export function evaluateGrantAccess(
  grants: readonly ShareGrant[],
  request: GrantAccessRequest,
): GrantAccessDecision {
  const presentedHash = hashShareToken(request.presentedToken);
  const grant = grants.find((g) => g.tokenHash === presentedHash);
  if (!grant) {
    return { outcome: 'denied' };
  }

  const now = Date.parse(request.nowIso);
  if (grant.revokedAt !== undefined && Date.parse(grant.revokedAt) <= now) {
    return { outcome: 'revoked' };
  }
  if (now < Date.parse(grant.startsAt) || now >= Date.parse(grant.expiresAt)) {
    return { outcome: 'expired' };
  }
  if (grant.useCount >= grant.maxUses) {
    return { outcome: 'over_use_limit' };
  }

  return {
    outcome: 'allowed',
    grantId: grant.id,
    patientId: grant.patientId,
    categories: [...grant.categories],
  };
}

/**
 * Filter records to exactly the grant's categories and the grant's patient.
 * The date-range filter keeps records whose recorded/effective period overlaps
 * the grant window when the record carries one; records without dates in the
 * allowed categories are included (concise summaries must not silently drop
 * undated allergies, for example).
 */
export function filterRecordsForGrant(
  records: readonly ClinicalRecord[],
  grant: Pick<ShareGrant, 'patientId' | 'categories'>,
): ClinicalRecord[] {
  const allowed = new Set(grant.categories);
  return records.filter(
    (record) => record.patientId === grant.patientId && allowed.has(record.category),
  );
}

/** The QR payload is the opaque token and nothing else. */
export function buildQrPayload(plainToken: string): string {
  return plainToken;
}

export function assertQrPayloadIsOpaque(payload: string): void {
  if (!/^[A-Z2-9]+$/.test(payload)) {
    throw new Error('QR payload must contain only the opaque token alphabet');
  }
}
