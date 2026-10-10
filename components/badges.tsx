import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Decision, Routing, Sentiment, Triage, Urgency } from "@/lib/types";

const urgencyCls: Record<Urgency, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-amber-200 text-amber-900",
  low: "bg-slate-200 text-slate-700",
};
const sentimentCls: Record<Sentiment, string> = {
  angry: "bg-red-100 text-red-800",
  frustrated: "bg-orange-100 text-orange-800",
  neutral: "bg-slate-100 text-slate-700",
  positive: "bg-green-100 text-green-800",
};
const decisionCls: Record<Decision, string> = {
  auto: "bg-emerald-600 text-white",
  review: "bg-blue-600 text-white",
  escalate: "bg-red-600 text-white",
};
const decisionLabel: Record<Decision, string> = {
  auto: "Auto-resolve",
  review: "Needs review",
  escalate: "Escalate",
};

export function TriageBadges({ triage }: { triage: Triage }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="outline" className="capitalize">{triage.category}</Badge>
      <Badge className={cn("capitalize", urgencyCls[triage.urgency])}>{triage.urgency}</Badge>
      <Badge className={cn("capitalize", sentimentCls[triage.sentiment])}>{triage.sentiment}</Badge>
      {triage.churn_risk && <Badge className="bg-purple-600 text-white">Churn risk</Badge>}
      {triage.upsell && <Badge className="bg-teal-600 text-white">Sales lead</Badge>}
    </div>
  );
}

export function DecisionBadge({ routing, done }: { routing?: Routing; done?: string }) {
  if (!routing) return <Badge variant="outline" className="animate-pulse">Triaging…</Badge>;
  return (
    <Badge className={decisionCls[routing.decision]}>
      {done ? `${decisionLabel[routing.decision]} · ${done}` : decisionLabel[routing.decision]}
    </Badge>
  );
}
