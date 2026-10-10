"use client";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useStore } from "@/components/store";
import { ThresholdSlider } from "@/components/threshold-slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { computeRoi } from "@/lib/roi";

const chartConfig = {
  auto: { label: "Auto-resolved", color: "#059669" },
  review: { label: "Needs review", color: "#2563eb" },
  escalate: { label: "Escalated", color: "#dc2626" },
} satisfies ChartConfig;

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-emerald-300 bg-emerald-50" : undefined}>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-semibold tabular-nums">{value}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Num({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Input type="number" min={0} step={step} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </label>
  );
}

export default function Dashboard() {
  const { ws, results, settings, setSettings, feedback, loadAll } = useStore();
  const roi = useMemo(() => computeRoi(ws.tickets, results, settings, ws), [ws, results, settings]);
  const usd = (n: number) => `${ws.currency}${Math.round(n).toLocaleString("en-IN")}`;
  const fb = Object.keys(feedback).length;
  const data = [{ name: "Tickets", auto: roi.auto, review: roi.review, escalate: roi.escalated }];

  if (roi.n === 0)
    return (
      <Card><CardContent className="space-y-3 pt-6">
        <p className="text-sm text-muted-foreground">No triaged tickets yet. Simulate tickets in the inbox or load the sample set.</p>
        <Button onClick={loadAll}>Load sample tickets</Button>
      </CardContent></Card>
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">ROI dashboard</h1>
        <p className="text-sm text-muted-foreground">Based on {roi.n} triaged tickets, projected to {settings.dailyVolume} tickets/day.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat accent label="Saved per month" value={usd(roi.monthlySaved)} sub={`${Math.round(roi.deflection * 100)}% deflection at ${usd(settings.costPerTicket)}/ticket`} />
        <Stat label="Auto-resolved" value={`${Math.round(roi.deflection * 100)}%`} sub={`${roi.auto} of ${roi.n} tickets (${usd(roi.sampleSaved)} saved in this batch)`} />
        <Stat label="Hours saved / week" value={Math.round(roi.hoursSavedWeek).toLocaleString()} sub={`${settings.minutesPerTicket} min avg handle time`} />
        <Stat label="Avg first response" value={roi.afterHours < 0.1 ? `${Math.max(1, Math.round(roi.afterHours * 60))} min` : `${roi.afterHours.toFixed(1)} h`} sub={`before: ${settings.beforeResponseHours} h`} />
        <Stat label="At-risk revenue flagged" value={usd(roi.atRiskMrr)} sub={`${roi.atRiskCount} churn-risk customers routed to senior agents`} />
        <Stat label={`${ws.labels.lead}s detected`} value={String(roi.salesLeads)} sub={`${usd(roi.pipelineValue)} pipeline · ${fb} feedback signals logged`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Automation level</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <ThresholdSlider />
            <ChartContainer config={chartConfig} className="h-[140px] w-full">
              <BarChart data={data} layout="vertical" margin={{ left: 0, right: 0 }}>
                <CartesianGrid horizontal={false} />
                <YAxis type="category" dataKey="name" hide />
                <XAxis type="number" hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="auto" stackId="a" fill="var(--color-auto)" />
                <Bar dataKey="review" stackId="a" fill="var(--color-review)" />
                <Bar dataKey="escalate" stackId="a" fill="var(--color-escalate)" />
              </BarChart>
            </ChartContainer>
            <div className="flex gap-4 text-xs">
              <span className="text-emerald-700">● Auto {roi.auto}</span>
              <span className="text-blue-700">● Review {roi.review}</span>
              <span className="text-red-700">● Escalated {roi.escalated}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Assumptions (editable)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Num label={`Human cost per ticket (${ws.currency})`} value={settings.costPerTicket} onChange={(n) => setSettings({ costPerTicket: n })} />
            <Num label="Tickets per day" value={settings.dailyVolume} onChange={(n) => setSettings({ dailyVolume: n })} />
            <Num label="Handle time (min)" value={settings.minutesPerTicket} onChange={(n) => setSettings({ minutesPerTicket: n })} />
            <Num label="Response time before (h)" value={settings.beforeResponseHours} onChange={(n) => setSettings({ beforeResponseHours: n })} />
            <Num label={`AI cost per ticket (${ws.currency})`} step={0.01} value={settings.aiCostPerTicket} onChange={(n) => setSettings({ aiCostPerTicket: n })} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
