import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { mockProcess } from "./mock";
import type { Draft, KbDoc, ProcessResult, Ticket, Triage, WorkspaceConfig } from "./types";

// Optional Anthropic-compatible gateway (set LLM_BASE_URL); otherwise api.anthropic.com.
const BASE_URL = process.env.LLM_BASE_URL;
export const TRIAGE_MODEL = "claude-haiku-5-5";
export const REPLY_MODEL = process.env.REPLY_MODEL ?? "claude-haiku-5-5"; // set REPLY_MODEL=claude-sonnet-5-5 for higher-quality (slower) drafts

const presetDir = (name: string) => path.join(process.cwd(), "data", "presets", name);
export const PRESETS = ["scaler", "acme"];
export function loadPreset(name: string) {
  if (!PRESETS.includes(name)) throw new Error("unknown preset");
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(presetDir(name), f), "utf8"));
  return { config: read("config.json") as WorkspaceConfig, kb: read("kb.json") as KbDoc[], tickets: read("tickets.json") as Ticket[] };
}
export function loadCache(preset: string | null): Record<string, ProcessResult> {
  if (!preset || !PRESETS.includes(preset)) return {};
  try {
    return JSON.parse(fs.readFileSync(path.join(presetDir(preset), "cache.json"), "utf8"));
  } catch {
    return {};
  }
}

const bool = { type: "boolean" } as const;
const TRIAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["category", "urgency", "sentiment", "churn_risk", "upsell", "legal_threat", "security_issue", "custom_escalation", "summary"],
  properties: {
    category: { type: "string", enum: ["billing", "bug", "how-to", "refund", "feature-request", "account", "sales", "other"] },
    urgency: { type: "string", enum: ["low", "medium", "high", "critical"] },
    sentiment: { type: "string", enum: ["angry", "frustrated", "neutral", "positive"] },
    churn_risk: bool,
    upsell: bool,
    legal_threat: bool,
    security_issue: bool,
    custom_escalation: bool,
    summary: { type: "string" },
  },
};
const DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "confidence", "source_doc_ids", "reasoning"],
  properties: {
    reply: { type: "string" },
    confidence: { type: "number" },
    source_doc_ids: { type: "array", items: { type: "string" } },
    reasoning: { type: "string" },
  },
};

// Explicit so shell vars (ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN) can't hijack the client.
const client = () =>
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    authToken: null,
    baseURL: BASE_URL ?? "https://api.anthropic.com",
    timeout: 30_000,
    maxRetries: 1,
  });

async function askJson<T>(
  model: string,
  system: string,
  user: string,
  schema: Record<string, unknown>,
  effort: "low" | "medium",
): Promise<T> {
  const res = await client().messages.create({
    model,
    max_tokens: 2000,
    system: `${system}\n\nRespond with ONLY a JSON object matching this JSON schema, no prose, no code fences:\n${JSON.stringify(schema)}`,
    messages: [{ role: "user", content: user }],
    ...(BASE_URL ? {} : { output_config: { effort } }),
  });
  if (res.stop_reason === "refusal") throw new Error("refused");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("no text");
  const raw = block.text;
  return JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as T;
}

const ticketText = (t: Ticket, cfg: WorkspaceConfig) =>
  `Customer: ${t.customer}${t.company ? ` (${t.company})` : ""}, ${cfg.labels.plan}: ${t.plan}, ${cfg.labels.value}: ${cfg.currency}${t.mrr}${cfg.labels.unit}\nSubject: ${t.subject}\nMessage: ${t.message}`;

export function triageTicket(t: Ticket, cfg: WorkspaceConfig): Promise<Triage> {
  return askJson<Triage>(
    TRIAGE_MODEL,
    `You triage customer support tickets for ${cfg.company}. Classify the ticket. churn_risk = customer signals they may leave/quit or are very upset. upsell = a prospective or existing customer asking about enrolling, more seats, higher plans, or pricing for growth (a sales/admissions lead). legal_threat = mentions lawyers, lawsuits, consumer court, formal legal/GDPR complaints. security_issue = suspected breach, hacked account, data leak. custom_escalation = matches one of the company's always-escalate topics: "${cfg.escalationTopics || "none"}". summary = one short sentence.`,
    ticketText(t, cfg),
    TRIAGE_SCHEMA,
    "low",
  );
}

const kbText = (kb: KbDoc[]) => kb.map((d) => `[${d.id}] ${d.title}\n${d.content}`).join("\n\n");

export function draftReply(t: Ticket, triage: Triage | null, cfg: WorkspaceConfig, kb: KbDoc[], voice = false, history = ""): Promise<Draft> {
  const style = voice
    ? `This reply will be SPOKEN aloud on a phone call: 1-3 short natural sentences, no lists, no URLs, no markdown, no sign-off. Use the conversation so far to resolve follow-ups like "and the fee?". If the caller only greets, thanks, or makes small talk, reply briefly and warmly, invite their question, and give confidence 0.9 with no sources.`
    : `Write a short email-style reply (under 90 words, no filler) and sign off as "The ${cfg.company} Support Team".`;
  return askJson<Draft>(
    voice ? TRIAGE_MODEL : REPLY_MODEL,
    `You are a support agent for ${cfg.company}. Tone: ${cfg.tone}. Answer ONLY using the knowledge base below; never invent policies, prices, dates or promises. If the KB does not cover it, say a team member will follow up and give low confidence.
${style} Put the ids of the docs you used in source_doc_ids.
confidence is 0-1: how sure you are the reply fully and correctly resolves the ticket from the KB alone. Use <0.6 if the KB doesn't cover it, the customer is upset and needs a human touch, or action by staff is required. reasoning is one sentence.

KNOWLEDGE BASE
${kbText(kb)}`,
    `${history ? `Conversation so far:\n${history}\n\n` : ""}${ticketText(t, cfg)}${triage ? `\n\nTriage: ${JSON.stringify(triage)}` : ""}`,
    DRAFT_SCHEMA,
    "low",
  );
}

/** Live pipeline. Throws on any API failure so callers can fall back. */
export async function processLive(t: Ticket, cfg: WorkspaceConfig, kb: KbDoc[], voice = false, history = ""): Promise<ProcessResult> {
  // Triage and reply are independent, so run them in parallel to halve the latency.
  const [triage, draft] = await Promise.all([triageTicket(t, cfg), draftReply(t, null, cfg, kb, voice, history)]);
  draft.confidence = Math.max(0, Math.min(1, draft.confidence));
  return { ticketId: t.id, triage, draft, source: "live", voice };
}

/** Live if possible, else the preset's cache, else offline heuristic. */
export async function processWithFallback(t: Ticket, cfg: WorkspaceConfig, kb: KbDoc[], voice = false, history = ""): Promise<ProcessResult> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await processLive(t, cfg, kb, voice, history);
    } catch (e) {
      console.error("live failed, falling back:", (e as Error).message);
    }
  }
  const cached = loadCache(cfg.preset)[t.id];
  if (cached) return { ...cached, source: "cache" };
  return mockProcess(t);
}
