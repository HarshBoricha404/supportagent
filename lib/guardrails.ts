import type { Routing, Ticket, Triage, WorkspaceConfig } from "./types";

export type GuardrailCfg = Pick<WorkspaceConfig, "refundCap" | "highValue" | "currency">;
export const DEFAULT_GUARDRAILS: GuardrailCfg = { refundCap: 200, highValue: 1000, currency: "$" };

/** Hard rules the confidence slider can never override. */
export function checkGuardrails(
  ticket: Ticket,
  triage: Triage,
  cfg: GuardrailCfg = DEFAULT_GUARDRAILS,
): Pick<Routing, "guardrail" | "route"> | null {
  const c = cfg.currency;
  const n = (x: number) => `${c}${x.toLocaleString("en-IN")}`;
  if (triage.legal_threat)
    return { guardrail: "Legal threat: never auto-handled", route: "legal" };
  if (triage.security_issue)
    return { guardrail: "Security issue: routed to security team", route: "security" };
  if (triage.custom_escalation)
    return { guardrail: "Matches company always-escalate topic", route: "topic" };
  if ((ticket.refundAmount ?? 0) > cfg.refundCap)
    return {
      guardrail: `Refund ${n(ticket.refundAmount ?? 0)} exceeds ${n(cfg.refundCap)} limit`,
      route: "manager",
    };
  if (triage.churn_risk && ticket.mrr >= cfg.highValue)
    return {
      guardrail: `Churn risk on ${n(ticket.mrr)} account: senior agent + account mgmt`,
      route: "senior",
    };
  return null;
}
