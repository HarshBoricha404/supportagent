"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DecisionBadge, TriageBadges } from "@/components/badges";
import { useStore } from "@/components/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { decide } from "@/lib/router";

const routeLabel = {
  senior: "Senior agent + account management",
  sales: "Sales team",
  security: "Security team",
  legal: "Legal / compliance",
  manager: "Manager approval",
  topic: "Specialist team (company escalation topic)",
} as const;

export function TicketView({ id }: { id: string }) {
  const { ws, results, actions, edits, feedback, settings, act, edit, rate } = useStore();
  const { kb, tickets } = ws;
  const t = tickets.find((x) => x.id === id);
  const r = results[id];
  const [draft, setDraft] = useState("");
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  useEffect(() => { if (r) setDraft(edits[id] ?? r.draft.reply); }, [r, id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!t) return <p className="text-sm text-muted-foreground">Ticket not found. <Link href="/" className="underline">Back to inbox</Link></p>;
  const routing = r ? decide(t, r, settings.threshold, ws) : undefined;
  const act1 = actions[id];
  const docs = r ? r.draft.source_doc_ids.map((d) => kb.find((k) => k.id === d)).filter(Boolean) : [];

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Inbox</Link>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.subject}</CardTitle>
            <p className="text-sm text-muted-foreground">{t.customer} · {t.company}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm">{t.message}</p>
            <div className="grid grid-cols-3 gap-2 rounded-md bg-muted p-3 text-sm">
              <div><div className="text-xs text-muted-foreground">{ws.labels.plan}</div>{t.plan}</div>
              <div><div className="text-xs text-muted-foreground">{ws.labels.value}</div>{ws.currency}{t.mrr.toLocaleString("en-IN")}{ws.labels.unit}</div>
              <div><div className="text-xs text-muted-foreground">Received</div>{t.minutesAgo}m ago</div>
            </div>
            {r && <TriageBadges triage={r.triage} />}
            {r && <p className="text-sm text-muted-foreground">AI summary: {r.triage.summary}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>AI decision</CardTitle>
            <DecisionBadge routing={routing} done={act1 === "approved" ? "sent" : act1 === "escalated" ? "escalated" : undefined} />
          </CardHeader>
          <CardContent className="space-y-4">
            {!r && <p className="text-sm text-muted-foreground">This ticket hasn't been triaged yet. Run the simulation from the inbox.</p>}
            {r && routing && (
              <>
                {!routing.guardrail && routing.route === "sales" && (
                  <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
                    <b>{ws.labels.lead}:</b> answered by AI and forwarded to the sales team.
                  </div>
                )}
                {routing.guardrail && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                    <b>Guardrail:</b> {routing.guardrail}
                    {routing.route && <div className="mt-1">Routed to: <b>{routeLabel[routing.route]}</b></div>}
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  Confidence <b className="text-foreground">{Math.round(r.draft.confidence * 100)}%</b> · {r.draft.reasoning}
                </div>
                <Textarea rows={9} value={draft} onChange={(e) => { setDraft(e.target.value); edit(id, e.target.value); }} />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Sources:</span>
                  {docs.length === 0 && <span className="text-muted-foreground">none</span>}
                  {docs.map((d) => d && (
                    <Badge key={d.id} variant="outline" className="cursor-pointer" onClick={() => setOpenDoc(openDoc === d.id ? null : d.id)}>
                      {d.id} · {d.title}
                    </Badge>
                  ))}
                </div>
                {openDoc && <div className="rounded-md bg-muted p-3 text-sm">{kb.find((k) => k.id === openDoc)?.content}</div>}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => { act(id, "approved"); toast.success("Reply sent to " + t.customer); }} disabled={!!act1}>
                    {routing.decision === "auto" ? "Send" : "Approve & send"}
                  </Button>
                  <Button variant="destructive" onClick={() => { act(id, "escalated"); toast("Escalated to a human agent"); }} disabled={!!act1}>Escalate</Button>
                </div>
                <div className="flex items-center gap-2 border-t pt-3 text-sm text-muted-foreground">
                  Was this draft helpful?
                  <Button size="sm" variant={feedback[id] === "up" ? "default" : "outline"} onClick={() => { rate(id, "up"); toast.success("Logged: AI would improve with this"); }}>👍</Button>
                  <Button size="sm" variant={feedback[id] === "down" ? "default" : "outline"} onClick={() => { rate(id, "down"); toast.success("Logged: AI would improve with this"); }}>👎</Button>
                  <span className="ml-auto text-xs">via {r.source}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
