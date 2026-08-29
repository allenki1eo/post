/**
 * Agent-facing type surface, re-exported from the canonical domain models.
 */
export type {
  AgentActionDraft,
  AgentActionType,
  AgentApproval,
  AgentOutcome,
  AgentPermission,
  AgentRun,
  AgentRunState,
  AgentStep,
  AgentToolCall,
  AgentTrigger,
  SafeAgentOutput,
  SyntheticAgentRun,
} from '../domain/models';
export type { AgentRuntime, ReplayResult, ReplayedToolCall } from './DemoAgentRuntime';
