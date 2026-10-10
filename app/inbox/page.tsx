"use client";
import Link from "next/link";
import { useMemo } from "react";
import { DecisionBadge, TriageBadges } from "@/components/badges";
import { useStore } from "@/components/store";
import { NewTicket } from "@/components/new-ticket";
import { ThresholdSlider } from "@/components/threshold-slider";
import { VoicePanel } from "@/components/voice-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { decide } from "@/lib/router";
import type { Urgency } from "@/lib/types";

const urgencyRank: Record<Urgency, number> = { critical: 3, high: 2, medium: 1, low: 0 };

export default function Inbox() {
  const { ws, arrived, results, actions, settings, simulate, loadAll, reset, simulating } = useStore();
  const tickets = ws.tickets;
  const byId = useMemo(() => Object.fromEntries(tickets.map((t) => [t.id, t])), [tickets]);

  // Keep arrival order while triaging; once triaged, angry/high-value tickets float up.
  const rows = useMemo(() => {
    const score = (id: string) => {
      const r = results[id];
      const t = byId[id];
      if (!r || !t) return -1;
      const d = decide(t, r, settings.threshold, ws);
      return (d.decision === "escalate" ? 100 : 0) + urgencyRank[r.triage.urgency] * 10 + (r.triage.churn_risk ? 5 : 0) + Math.min(t.mrr / ws.highValue, 4);
    };
    return [...arrived].sort((a, b) => score(b) - score(a));
  }, [arrived, results, byId, settings.threshold, ws]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-[1fr_320px] md:items-center">
          <div>
            <h1 className="text-xl font-semibold">{ws.company || "Inbox"} inbox</h1>
            <p className="text-sm text-muted-foreground">
              {arrived.length === 0 ? (tickets.length === 0 ? <>No workspace yet. <Link href="/setup" className="underline">Set one up</Link>.</> : "No tickets yet. Simulate incoming customer tickets.") : `${Object.keys(results).length} of ${arrived.length} triaged`}
            </p>
            <div className="mt-3 flex gap-2">
              <Button onClick={simulate} disabled={simulating || tickets.length === 0}>
                {simulating ? "Tickets arriving…" : "Simulate incoming tickets"}
              </Button>
              <Button variant="outline" onClick={loadAll} disabled={simulating}>Load all instantly</Button>
              {arrived.length > 0 && <Button variant="ghost" onClick={reset}>Reset</Button>}
            </div>
          </div>
          <ThresholdSlider />
        </CardContent>
      </Card>

      <VoicePanel />
      <NewTicket />

      <div className="space-y-2">
        {rows.map((id) => {
          const t = byId[id];
          if (!t) return null;
          const r = results[id];
          const routing = r ? decide(t, r, settings.threshold, ws) : undefined;
          const act = actions[id];
          return (
            <Link key={id} href={`/tickets/${id}`} className="block">
              <Card className="transition hover:border-foreground/30">
                <CardContent className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium">{t.subject}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {t.customer}{t.company ? ` · ${t.company}` : ""} · {t.plan} · {ws.currency}{t.mrr.toLocaleString("en-IN")}{ws.labels.unit}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{t.message}</p>
                    {r && <TriageBadges triage={r.triage} />}
                  </div>
                  <div className="shrink-0">
                    <DecisionBadge routing={routing} done={act === "approved" ? "sent" : act === "escalated" ? "escalated" : undefined} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
