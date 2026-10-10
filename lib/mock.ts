import type { Category, ProcessResult, Sentiment, Ticket, Urgency } from "./types";

/** Last-resort offline heuristic so the demo never dies with no key and no cache. */
export function mockProcess(t: Ticket): ProcessResult {
  const m = (t.subject + " " + t.message).toLowerCase();
  const has = (...w: string[]) => w.some((x) => m.includes(x));
  const legal = has("attorney", "legal", "gdpr article", "complaint under");
  const security = has("hacked", "leaked", "accessed my account");
  const angry = has("unacceptable", "ridiculous", "now or", "i've had it", "!!");
  let category: Category = "how-to";
  let docs = ["KB-15"];
  let conf = 0.6;
  const pick = (c: Category, d: string, cf: number) => ((category = c), (docs = [d]), (conf = cf));
  if (has("refund")) pick("refund", "KB-03", 0.9);
  else if (has("order", "tracking", "package")) pick("how-to", "KB-01", 0.93);
  else if (has("password")) pick("account", "KB-02", 0.96);
  else if (has("2fa", "authenticator")) pick("account", "KB-10", 0.8);
  else if (has("export")) pick("how-to", "KB-08", 0.95);
  else if (has("slack", "zapier")) pick("how-to", "KB-09", 0.92);
  else if (has("cancel", "pause")) pick("billing", "KB-04", 0.94);
  else if (has("invoice", "billing email")) pick("billing", "KB-05", 0.93);
  else if (has("csv")) pick("bug", "KB-11", 0.9);
  else if (has("crash")) pick("bug", "KB-14", 0.88);
  else if (has("down", "outage", "errors", "sla")) pick("bug", "KB-12", 0.6);
  else if (has("seat", "add more users", "team members", "enterprise")) pick("sales", "KB-06", 0.8);
  else if (has("plans", "prices", "upgrade")) pick("billing", "KB-07", 0.9);
  else if (has("dark mode", "audit log")) pick("feature-request", "KB-15", 0.9);
  else if (has("charged twice", "wrong charge")) pick("billing", "KB-05", 0.5);
  const sentiment: Sentiment = angry ? "angry" : has("frustrated", "switching") ? "frustrated" : "neutral";
  const urgency: Urgency = legal || security ? "critical" : angry ? "high" : "low";
  const churn = angry || has("switching", "not renewing", "competitor", "leaving");
  return {
    ticketId: t.id,
    source: "mock",
    triage: {
      category, urgency, sentiment, churn_risk: churn,
      upsell: has("add more users", "enterprise", "seat"),
      legal_threat: legal, security_issue: security, custom_escalation: false, summary: t.subject,
    },
    draft: {
      reply: `Hi ${t.customer.split(" ")[0]},\n\nThanks for reaching out about "${t.subject}". Based on our docs (${docs[0]}), here is what to do next. Let us know if anything is unclear.\n\nBest,\nThe Support Team`,
      confidence: conf, source_doc_ids: docs, reasoning: "Offline heuristic fallback.",
    },
  };
}
