import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/rate-limit";
import { processWithFallback } from "@/lib/claude";
import type { KbDoc, Ticket, WorkspaceConfig } from "@/lib/types";

export const maxDuration = 60;
const MAX_KB_CHARS = 200_000;

export async function POST(req: Request) {
  if (rateLimited(req)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const { ticket, config, kb } = (await req.json()) as { ticket: Ticket; config: WorkspaceConfig; kb: KbDoc[] };
  if (!ticket || !config || !Array.isArray(kb)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const size = kb.reduce((n, d) => n + d.content.length, 0);
  if (size > MAX_KB_CHARS) return NextResponse.json({ error: "knowledge base too large" }, { status: 413 });
  return NextResponse.json(await processWithFallback(ticket, config, kb));
}
