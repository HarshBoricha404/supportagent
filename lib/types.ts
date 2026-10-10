export type Plan = string;

export interface Ticket {
  id: string;
  customer: string;
  company: string;
  plan: Plan;
  mrr: number;
  subject: string;
  message: string;
  minutesAgo: number;
  refundAmount?: number;
}

export type Category =
  | "billing"
  | "bug"
  | "how-to"
  | "refund"
  | "feature-request"
  | "account"
  | "sales"
  | "other";
export type Urgency = "low" | "medium" | "high" | "critical";
export type Sentiment = "angry" | "frustrated" | "neutral" | "positive";

export interface Triage {
  category: Category;
  urgency: Urgency;
  sentiment: Sentiment;
  churn_risk: boolean;
  upsell: boolean;
  legal_threat: boolean;
  security_issue: boolean;
  custom_escalation?: boolean; // matches the company's always-escalate topics
  summary: string;
}

export interface Draft {
  reply: string;
  confidence: number; // 0..1
  source_doc_ids: string[];
  reasoning: string;
}

export interface ProcessResult {
  ticketId: string;
  triage: Triage;
  draft: Draft;
  source: "live" | "cache" | "mock";
  voice?: boolean;
}

export type Decision = "auto" | "review" | "escalate";

export interface Routing {
  decision: Decision;
  guardrail: string | null; // why a guardrail forced escalation
  route: "senior" | "sales" | "security" | "legal" | "manager" | "topic" | null;
}

export interface KbDoc {
  id: string;
  title: string;
  content: string;
}

export interface WorkspaceConfig {
  company: string;
  tone: string;
  currency: string;
  refundCap: number; // refunds above this always go to a human
  highValue: number; // churn-risk accounts at/above this value are escalated to senior
  escalationTopics: string; // free text, always escalate matches
  preset: string | null; // demo preset name (used for the cached fallback)
  voiceAgentId: string;
  webhookUrl: string;
  labels: { plan: string; value: string; unit: string; lead: string };
}

export interface Workspace extends WorkspaceConfig {
  kb: KbDoc[];
  tickets: Ticket[];
}
