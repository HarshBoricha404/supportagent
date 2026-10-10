import { checkGuardrails, DEFAULT_GUARDRAILS, type GuardrailCfg } from "./guardrails";
import type { ProcessResult, Routing, Ticket } from "./types";

export const REVIEW_FLOOR = 0.55;
export const DEFAULT_THRESHOLD = 0.7;

/** Deterministic routing: guardrails first, then confidence vs. the business-set threshold. */
export function decide(
  ticket: Ticket,
  result: ProcessResult,
  threshold: number,
  cfg: GuardrailCfg = DEFAULT_GUARDRAILS,
): Routing {
  const g = checkGuardrails(ticket, result.triage, cfg);
  if (g) return { decision: "escalate", ...g };
  // Leads are still answered (when confident) and also forwarded to sales.
  const route = result.triage.upsell ? "sales" : null;
  const c = result.draft.confidence;
  if (c >= threshold) return { decision: "auto", guardrail: null, route };
  if (c >= REVIEW_FLOOR) return { decision: "review", guardrail: null, route };
  return { decision: "escalate", guardrail: "Low confidence", route };
}
