"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/components/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export default function Setup() {
  const router = useRouter();
  const { ws, updateConfig, newWorkspace, addDoc, removeDoc, updateDoc, loadAll, ready } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const chars = ws.kb.reduce((n, d) => n + d.content.length, 0);

  const onFiles = async (input: HTMLInputElement) => {
    const files = input.files;
    if (!files) return;
    for (const f of Array.from(files)) addDoc(f.name.replace(/\.[^.]+$/, ""), await f.text());
    toast.success(`Added ${files.length} doc${files.length > 1 ? "s" : ""} to the knowledge base`);
    input.value = ""; // allow re-selecting the same file
  };
  if (!ready) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Set up your workspace</h1>
        <p className="text-sm text-muted-foreground">Three steps, about ten minutes. Everything is saved in your browser.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>1. Your company</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={() => newWorkspace("My company")}>
            {ws.kb.length ? "Clear everything and start a blank workspace" : "Start a blank workspace"}
          </Button>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Company name"><Input value={ws.company} onChange={(e) => updateConfig({ company: e.target.value })} /></Field>
            <Field label="Currency symbol"><Input value={ws.currency} onChange={(e) => updateConfig({ currency: e.target.value })} /></Field>
          </div>
          <Field label="Brand voice" hint="How replies should sound."><Input value={ws.tone} onChange={(e) => updateConfig({ tone: e.target.value })} /></Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={`Refund limit (${ws.currency})`} hint="Refunds above this always go to a human."><Input type="number" value={ws.refundCap} onChange={(e) => updateConfig({ refundCap: Number(e.target.value) || 0 })} /></Field>
            <Field label={`High-value customer (${ws.currency})`} hint="Unhappy customers above this go to a senior agent."><Input type="number" value={ws.highValue} onChange={(e) => updateConfig({ highValue: Number(e.target.value) || 0 })} /></Field>
          </div>
          <Field label="Always escalate these topics" hint="Free text, e.g. legal threats, data deletion, placement disputes."><Input value={ws.escalationTopics} onChange={(e) => updateConfig({ escalationTopics: e.target.value })} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2. Your knowledge ({ws.kb.length} docs, {Math.round(chars / 1000)}k characters)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">The AI answers only from these docs and cites them. Up to about 200k characters (~100 pages).</p>
          <div className="space-y-1">
            {ws.kb.map((d) => (
              <div key={d.id} className="rounded border text-sm">
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span><b>{d.id.slice(0, 5)}</b> · {d.title} <span className="text-muted-foreground">({d.content.length} chars)</span></span>
                  <span className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setOpenId(openId === d.id ? null : d.id)}>{openId === d.id ? "Hide" : "Preview / edit"}</Button>
                    <Button size="sm" variant="ghost" onClick={() => removeDoc(d.id)}>Remove</Button>
                  </span>
                </div>
                {openId === d.id && (
                  <div className="space-y-2 border-t p-3">
                    <Input value={d.title} onChange={(e) => updateDoc(d.id, { title: e.target.value })} />
                    <Textarea rows={10} className="max-h-96 font-mono text-xs" value={d.content} onChange={(e) => updateDoc(d.id, { content: e.target.value })} />
                    <p className="text-xs text-muted-foreground">Edits save automatically and apply to the next ticket or call.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Input type="file" multiple accept=".txt,.md,.csv,.json" onChange={(e) => onFiles(e.target)} />
          <Input placeholder="Or paste a doc: title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea rows={5} placeholder="Paste a help article, policy or FAQ…" value={content} onChange={(e) => setContent(e.target.value)} />
          <Button variant="outline" disabled={!content.trim()} onClick={() => { addDoc(title || "Untitled doc", content); setTitle(""); setContent(""); }}>Add doc</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>3. Voice and integrations (optional)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="ElevenLabs agent ID" hint="Leave empty to use free browser voice. The agent needs a client tool named support_answer(question)."><Input placeholder="agent_…" value={ws.voiceAgentId} onChange={(e) => updateConfig({ voiceAgentId: e.target.value.trim() })} /></Field>
          <Field label="n8n webhook URL" hint="Called when a call ends: transcript, triage and escalation flag."><Input placeholder="https://…/webhook/…" value={ws.webhookUrl} onChange={(e) => updateConfig({ webhookUrl: e.target.value.trim() })} /></Field>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button disabled={!ws.company || ws.kb.length === 0} onClick={() => { loadAll(); router.push("/inbox"); }}>
          {ws.tickets.length ? "Finish and triage sample tickets" : "Finish"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/inbox")}>Go to inbox</Button>
      </div>
    </div>
  );
}
