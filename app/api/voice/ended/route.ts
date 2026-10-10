import { NextResponse } from "next/server";

/** Forwards the call-ended payload to the company's n8n (or any) webhook; server-side to avoid CORS. */
export async function POST(req: Request) {
  const { webhookUrl, payload } = await req.json();
  if (typeof webhookUrl !== "string" || !/^https?:\/\//.test(webhookUrl))
    return NextResponse.json({ error: "bad webhook url" }, { status: 400 });
  try {
    const r = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
    return NextResponse.json({ ok: r.ok });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
