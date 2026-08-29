/**
 * Agent-side entry point to the deterministic safety verifier.
 *
 * The implementation lives in the domain layer (`src/domain/safety.ts`) so it
 * is shared by the demo runtime, tests, and the future server runtime. The
 * verifier runs both before an approval request and again before approved
 * execution.
 */
export {
  findForbiddenClaims,
  verifySafeAgentOutput,
  type SafetyContext,
  type SafetyVerdict,
  type SafetyViolation,
} from '../domain/safety';
