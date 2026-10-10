import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/rate-limit";
import { processWithFallback } from "@/lib/claude";
import { decide } from "@/lib/router";
import type { KbDoc, Ticket, WorkspaceConfig } from "@/lib/types";

export const maxDuration = 30;

/** Called for each caller question during a voice call. Returns a speakable answer + escalate flag. */
export async function POST(req: Request) {
  if (rateLimited(req)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const { question, config, kb, ticketId, history } = (await req.json()) as {
    question: string; config: WorkspaceConfig; kb: KbDoc[]; ticketId?: string; history?: string;
  };
  const ticket: Ticket = {
    id: ticketId ?? `V-${Date.now()}`, customer: "Caller", company: "", plan: "Prospect", mrr: 0,
    subject: "Voice call", message: question, minutesAgo: 0,
  };
  const result = await processWithFallback(ticket, config, kb, true, String(history ?? "").slice(-2000));
  const routing = decide(ticket, result, 0.7, config);
  const escalate = routing.decision === "escalate";
  return NextResponse.json({
    answer: escalate
      ? "I want to make sure you get the right help on this, so I'm going to flag it for a senior team member who will follow up with you shortly."
      : result.draft.reply,
    escalate,
    result,
  });
}
