"use client";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/store";

const stats = [
  ["10 min", "from docs to a working agent"],
  ["Every answer", "cites its source document"],
  ["Chat + voice", "one brain, one inbox"],
  ["You decide", "what AI may do alone"],
];

const steps = [
  ["1", "Upload your docs", "Paste or upload your help articles, policies and FAQs. Set your tone and your rules."],
  ["2", "Tickets get triaged", "Each ticket is read, tagged for urgency and mood, and checked for churn risk and sales intent."],
  ["3", "AI answers, humans decide", "Routine questions are answered with sources. Risky ones go straight to your team."],
];

const features = [
  ["🎯", "Smart triage", "Category, urgency and sentiment on every ticket, so angry customers are seen first.", "from-rose-500/20"],
  ["📚", "Answers with receipts", "Replies come only from your documents and link to the exact source.", "from-sky-500/20"],
  ["🛡️", "Guardrails you control", "Legal, security, big refunds and your own topics always go to a human.", "from-amber-500/20"],
  ["💸", "Revenue radar", "Flags at-risk high-value customers and turns admissions questions into leads.", "from-emerald-500/20"],
  ["📞", "Voice agent", "Callers talk to the same agent. Escalations land in your inbox with a transcript.", "from-violet-500/20"],
  ["📈", "ROI you can show", "Tickets deflected, hours saved and money saved, using your own cost per ticket.", "from-cyan-500/20"],
];

function Tag({ c, children }: { c: string; children: React.ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c}`}>{children}</span>;
}

function MockCard({ title, tags, badge, badgeCls, rot, delay, cls }: {
  title: string; tags: React.ReactNode; badge: string; badgeCls: string; rot: string; delay: string; cls: string;
}) {
  return (
    <div className={`float-card absolute w-72 rounded-xl border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur ${cls}`} style={{ ["--r" as string]: rot, animationDelay: delay }}>
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="mt-2 flex flex-wrap gap-1">{tags}</div>
      <div className={`mt-3 inline-block rounded-md px-2 py-1 text-xs font-semibold text-white ${badgeCls}`}>{badge}</div>
    </div>
  );
}

export default function Landing() {
  const router = useRouter();
  const { loadPreset } = useStore();
  const demo = async (name: string) => { await loadPreset(name); router.push("/inbox"); };

  return (
    <div className="space-y-16 pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-6 py-16 md:px-12 md:py-20">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="relative grid items-center gap-12 md:grid-cols-2">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-indigo-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> AI support agent for any company
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl">
              Answer in seconds.<br />
              <span className="gradient-text">Never miss a hot lead.</span>
            </h1>
            <p className="max-w-lg text-lg text-slate-300">
              Upload your docs and SupportPilot answers customers by chat and phone, escalates the risky tickets, and spots the revenue hiding in your inbox.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => router.push("/setup")} className="rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 shadow-lg transition hover:scale-105 hover:bg-indigo-50">
                Create your workspace →
              </button>
              <button onClick={() => demo("scaler")} className="rounded-xl border border-white/25 bg-white/5 px-6 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/15">
                ▶ Try the live demo
              </button>
            </div>
            <button onClick={() => demo("acme")} className="text-sm text-indigo-300 underline-offset-4 hover:underline">
              or explore the SaaS demo
            </button>
            <p className="text-xs text-slate-400">Demo workspaces use fictional company data.</p>
          </div>

          <div className="relative hidden h-[420px] md:block">
            <MockCard title="This is a COMPLETE waste of money" rot="-3deg" delay="0s" cls="left-0 top-0"
              tags={<><Tag c="bg-red-100 text-red-800">angry</Tag><Tag c="bg-purple-600 text-white">churn risk</Tag></>}
              badge="Escalate → senior agent" badgeCls="bg-red-600" />
            <MockCard title="How long do I get session recordings?" rot="2deg" delay="1.2s" cls="right-0 top-24"
              tags={<><Tag c="bg-slate-100 text-slate-700">how-to</Tag><Tag c="bg-sky-100 text-sky-800">source: KB-07</Tag></>}
              badge="✓ Auto-resolved in 3s" badgeCls="bg-emerald-600" />
            <MockCard title="Data Science fees and EMI?" rot="-2deg" delay="2.4s" cls="left-6 top-52"
              tags={<><Tag c="bg-slate-100 text-slate-700">sales</Tag><Tag c="bg-teal-600 text-white">admissions lead</Tag></>}
              badge="Answered + sent to sales" badgeCls="bg-teal-600" />
            <MockCard title="📞 “I'll take you to consumer court…”" rot="3deg" delay="3.6s" cls="right-4 top-80"
              tags={<><Tag c="bg-red-600 text-white">legal threat</Tag><Tag c="bg-orange-100 text-orange-800">voice</Tag></>}
              badge="Guardrail → human" badgeCls="bg-red-600" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(([a, b]) => (
          <div key={a} className="rounded-2xl border bg-background p-5 text-center shadow-sm">
            <div className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-2xl font-bold text-transparent">{a}</div>
            <div className="mt-1 text-sm text-muted-foreground">{b}</div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Live in three steps</h2>
          <p className="mt-2 text-muted-foreground">No code, no integration project to start.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map(([n, t, d]) => (
            <div key={n} className="relative rounded-2xl border bg-background p-6 shadow-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 font-bold text-white">{n}</div>
              <div className="font-semibold">{t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Built so you can trust it</h2>
          <p className="mt-2 text-muted-foreground">Automation where it's safe. People where it matters.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map(([icon, t, d, g]) => (
            <div key={t} className={`group rounded-2xl border bg-gradient-to-br ${g} to-transparent p-6 transition hover:-translate-y-1 hover:shadow-lg`}>
              <div className="mb-3 text-3xl">{icon}</div>
              <div className="font-semibold">{t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-10 text-center text-white">
        <h2 className="text-3xl font-bold tracking-tight">See it on your own tickets</h2>
        <p className="mx-auto mt-2 max-w-xl text-indigo-100">Upload a few docs, add a ticket, and watch it triage and answer in seconds.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={() => router.push("/setup")} className="rounded-xl bg-white px-6 py-3 font-semibold text-indigo-700 shadow-lg transition hover:scale-105">Create your workspace</button>
          <button onClick={() => demo("scaler")} className="rounded-xl border border-white/40 px-6 py-3 font-semibold transition hover:bg-white/15">Try the live demo</button>
        </div>
      </section>
    </div>
  );
}
