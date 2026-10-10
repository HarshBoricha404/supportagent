"use client";
import { useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useStore } from "@/components/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ProcessResult, Ticket } from "@/lib/types";

interface Line { role: "caller" | "agent"; text: string }
interface VoiceAnswer { answer: string; escalate: boolean; result: ProcessResult }

/** Shared call logic: ask our brain, collect the transcript, log a ticket (and webhook) at the end. */
function useCall() {
  const { ws, addVoiceTicket } = useStore();
  const [lines, setLines] = useState<Line[]>([]);
  const answers = useRef<VoiceAnswer[]>([]);
  const linesRef = useRef<Line[]>([]);
  linesRef.current = lines;

  const ask = async (question: string): Promise<string> => {
    setLines((l) => [...l, { role: "agent", text: `🔧 support_answer called with: "${question}"` }]);
    const { kb, tickets: _t, ...config } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
    const started = Date.now();
    try {
      const res = await fetch("/api/voice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question, config, kb,
          history: linesRef.current.slice(-8).map((l) => `${l.role === "caller" ? "Caller" : "Agent"}: ${l.text}`).join("\n"),
        }),
      });
      if (!res.ok) throw new Error(`/api/voice returned ${res.status}`);
      const r: VoiceAnswer = await res.json();
      answers.current.push(r);
      setLines((l) => [...l, { role: "agent", text: `✅ tool returned in ${((Date.now() - started) / 1000).toFixed(1)}s: "${r.answer.slice(0, 140)}"` }]);
      return r.answer;
    } catch (e) {
      console.error("support_answer failed", e);
      setLines((l) => [...l, { role: "agent", text: `⚠ tool error: ${(e as Error).message}` }]);
      return "Sorry, I'm having trouble right now. A team member will follow up with you.";
    }
  };

  const finish = () => {
    const a = answers.current;
    const callerText = lines.filter((l) => l.role === "caller").map((l) => l.text).join(" ");
    if (a.length === 0 || !callerText) { setLines([]); return; }
    // Worst case wins: any escalation makes the whole call an escalation.
    const pick = a.find((x) => x.escalate) ?? a[a.length - 1];
    const id = `V-${Date.now().toString().slice(-6)}`;
    const ticket: Ticket = {
      id, customer: "Voice caller", company: "Phone", plan: "Voice", mrr: 0,
      subject: `📞 ${pick.result.triage.summary || "Voice call"}`, message: callerText, minutesAgo: 0,
    };
    const result: ProcessResult = { ...pick.result, ticketId: id, voice: true, draft: { ...pick.result.draft, reply: a.map((x) => x.answer).join("\n\n") } };
    addVoiceTicket(ticket, result);
    if (ws.webhookUrl)
      fetch("/api/voice/ended", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: ws.webhookUrl, payload: { ticket, triage: result.triage, escalated: !!a.find((x) => x.escalate), transcript: lines } }),
      }).catch(() => {});
    answers.current = [];
    setLines([]);
  };
  return { lines, setLines, ask, finish };
}

function ElevenLabsCall({ agentId }: { agentId: string }) {
  const call = useCall();
  const conv = useConversation({
    clientTools: {
      support_answer: async (p: Record<string, unknown>) => call.ask(String(p.question ?? "")),
    },
    onMessage: (m: { message: string; source: string }) =>
      call.setLines((l) => [...l, { role: m.source === "user" ? "caller" : "agent", text: m.message }]),
    onDisconnect: () => call.finish(),
    onError: (m: string) => { console.error("elevenlabs error", m); call.setLines((l) => [...l, { role: "agent", text: `⚠ ${m}` }]); },
    onUnhandledClientToolCall: (t: { tool_name: string }) =>
      call.setLines((l) => [...l, { role: "agent", text: `⚠ agent called unknown client tool "${t.tool_name}" (expected support_answer)` }]),
  });
  const live = conv.status === "connected";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {live ? (
          <Button variant="destructive" onClick={() => conv.endSession()}>End call</Button>
        ) : (
          <Button onClick={() => { call.setLines([]); conv.startSession({ agentId, connectionType: "webrtc" }); }}>
            📞 Talk to the AI agent
          </Button>
        )}
        <span className="text-sm text-muted-foreground">
          {conv.status === "connecting" ? "Connecting…" : live ? (conv.isSpeaking ? "Agent speaking…" : "Listening…") : "ElevenLabs voice agent"}
        </span>
      </div>
      <Transcript lines={call.lines} />
    </div>
  );
}

/** Free fallback: type or use browser speech recognition; replies are spoken with speechSynthesis. */
function BrowserCall() {
  const call = useCall();
  const [text, setText] = useState("");
  const [active, setActive] = useState(false);
  const send = async (q: string) => {
    if (!q.trim()) return;
    setActive(true);
    call.setLines((l) => [...l, { role: "caller", text: q }]);
    setText("");
    const a = await call.ask(q);
    call.setLines((l) => [...l, { role: "agent", text: a }]);
    if ("speechSynthesis" in window) speechSynthesis.speak(new SpeechSynthesisUtterance(a));
  };
  const listen = () => {
    const SR = (window as unknown as { webkitSpeechRecognition?: new () => { start(): void; onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void } }).webkitSpeechRecognition;
    if (!SR) return alert("Speech recognition isn't supported in this browser. Type instead.");
    const r = new SR();
    r.onresult = (e) => send(e.results[0][0].transcript);
    r.start();
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="Ask as a caller… (no voice agent ID set, using browser voice)" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(text)} />
        <Button variant="outline" onClick={listen}>🎤</Button>
        <Button onClick={() => send(text)}>Ask</Button>
        {active && <Button variant="secondary" onClick={() => { call.finish(); setActive(false); }}>End & log</Button>}
      </div>
      <Transcript lines={call.lines} />
    </div>
  );
}

function Transcript({ lines }: { lines: Line[] }) {
  if (!lines.length) return null;
  return (
    <div className="max-h-48 space-y-1 overflow-y-auto rounded-md bg-muted p-3 text-sm">
      {lines.map((l, i) => (
        <div key={i}><b>{l.role === "caller" ? "Caller" : "Agent"}:</b> {l.text}</div>
      ))}
    </div>
  );
}

export function VoicePanel() {
  const { ws } = useStore();
  const agentId = ws.voiceAgentId || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "";
  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <h2 className="font-medium">Voice support</h2>
        {agentId ? (
          <ConversationProvider><ElevenLabsCall agentId={agentId} /></ConversationProvider>
        ) : (
          <BrowserCall />
        )}
      </CardContent>
    </Card>
  );
}
