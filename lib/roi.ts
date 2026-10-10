import type { GuardrailCfg } from "./guardrails";
import { decide } from "./router";
import type { ProcessResult, Ticket } from "./types";

export interface RoiSettings {
  costPerTicket: number; // human cost
  aiCostPerTicket: number;
  minutesPerTicket: number; // human handle time
  dailyVolume: number;
  beforeResponseHours: number;
  afterAutoResponseSeconds: number;
  threshold: number;
}

export const DEFAULT_ROI: RoiSettings = {
  costPerTicket: 15,
  aiCostPerTicket: 0.05,
  minutesPerTicket: 12,
  dailyVolume: 400,
  beforeResponseHours: 9,
  afterAutoResponseSeconds: 20,
  threshold: 0.7,
};

export function computeRoi(
  tickets: Ticket[],
  results: Record<string, ProcessResult>,
  s: RoiSettings,
  cfg?: GuardrailCfg,
) {
  const done = tickets.filter((t) => results[t.id]);
  const routings = done.map((t) => decide(t, results[t.id], s.threshold, cfg));
  const n = done.length;
  const auto = routings.filter((r) => r.decision === "auto").length;
  const review = routings.filter((r) => r.decision === "review").length;
  const escalated = routings.filter((r) => r.decision === "escalate").length;
  const deflection = n ? auto / n : 0;
  // review drafts still save ~60% of handle time, but we only count full deflection as $ saved
  const perTicketSaving = s.costPerTicket - s.aiCostPerTicket;
  const dailyDeflected = deflection * s.dailyVolume;
  const monthlySaved = dailyDeflected * perTicketSaving * 30;
  const sampleSaved = auto * perTicketSaving;
  const hoursSavedWeek = (dailyDeflected * 7 * s.minutesPerTicket) / 60;
  const afterHours =
    n === 0
      ? s.beforeResponseHours
      : (auto * (s.afterAutoResponseSeconds / 3600) +
          (n - auto) * (s.beforeResponseHours * 0.35)) /
        n; // humans reach triaged/prioritised tickets faster
  const atRiskMrr = done.reduce(
    (sum, t) => (results[t.id].triage.churn_risk ? sum + t.mrr : sum),
    0,
  );
  const atRiskCount = done.filter((t) => results[t.id].triage.churn_risk).length;
  const leadTickets = done.filter((t) => results[t.id].triage.upsell);
  const salesLeads = leadTickets.length;
  const pipelineValue = leadTickets.reduce((sum, t) => sum + t.mrr, 0);
  return {
    n, auto, review, escalated, deflection, monthlySaved, sampleSaved,
    hoursSavedWeek, afterHours, atRiskMrr, atRiskCount, salesLeads, pipelineValue,
  };
}
