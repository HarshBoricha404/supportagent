"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { DEFAULT_ROI, type RoiSettings } from "@/lib/roi";
import type { KbDoc, ProcessResult, Ticket, Workspace, WorkspaceConfig } from "@/lib/types";

type Action = "approved" | "escalated";
interface Feedback { [id: string]: "up" | "down" }

const EMPTY: Workspace = {
  company: "", tone: "warm, concise, professional", currency: "$", refundCap: 200, highValue: 1000,
  escalationTopics: "legal threats, security incidents, data deletion requests", preset: null,
  voiceAgentId: "", webhookUrl: "", labels: { plan: "Plan", value: "Value", unit: "", lead: "Sales lead" },
  kb: [], tickets: [],
};

interface Store {
  ready: boolean;
  ws: Workspace;
  arrived: string[]; // ids in arrival order (newest first)
  results: Record<string, ProcessResult>;
  actions: Record<string, Action>;
  edits: Record<string, string>;
  feedback: Feedback;
  settings: RoiSettings;
  simulating: boolean;
  setSettings: (p: Partial<RoiSettings>) => void;
  updateConfig: (p: Partial<WorkspaceConfig>) => void;
  loadPreset: (name: string) => Promise<void>;
  newWorkspace: (company: string) => void;
  addDoc: (title: string, content: string) => void;
  removeDoc: (id: string) => void;
  updateDoc: (id: string, patch: Partial<Pick<KbDoc, "title" | "content">>) => void;
  addTicket: (t: Omit<Ticket, "id" | "minutesAgo"> & { minutesAgo?: number }) => string;
  addVoiceTicket: (t: Ticket, r: ProcessResult) => void;
  simulate: () => void;
  loadAll: () => void;
  reset: () => void;
  act: (id: string, a: Action) => void;
  edit: (id: string, text: string) => void;
  rate: (id: string, v: "up" | "down") => void;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("no store");
  return s;
};

const roiDefaultsFor = (currency: string): Partial<RoiSettings> =>
  currency === "₹" ? { costPerTicket: 250, aiCostPerTicket: 4, dailyVolume: 400 } : { costPerTicket: 15, aiCostPerTicket: 0.05, dailyVolume: 400 };

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [ws, setWs] = useState<Workspace>(EMPTY);
  const [arrived, setArrived] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, ProcessResult>>({});
  const [actions, setActions] = useState<Record<string, Action>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback>({});
  const [settings, setSettingsState] = useState<RoiSettings>(DEFAULT_ROI);
  const [simulating, setSimulating] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const wsRef = useRef<Workspace>(EMPTY);
  wsRef.current = ws;

  useEffect(() => {
    try {
      const w = localStorage.getItem("workspace");
      if (w) setWs({ ...EMPTY, ...JSON.parse(w) });
      const s = localStorage.getItem("settings");
      if (s) setSettingsState({ ...DEFAULT_ROI, ...JSON.parse(s) });
      const f = localStorage.getItem("feedback");
      if (f) setFeedback(JSON.parse(f));
    } catch {}
    setReady(true);
  }, []);

  const saveWs = useCallback((next: Workspace) => {
    wsRef.current = next;
    setWs(next);
    try { localStorage.setItem("workspace", JSON.stringify(next)); } catch {}
  }, []);

  const setSettings = useCallback((p: Partial<RoiSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...p };
      localStorage.setItem("settings", JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setArrived([]); setResults({}); setActions({}); setEdits({}); setSimulating(false);
  }, []);

  const updateConfig = (p: Partial<WorkspaceConfig>) => saveWs({ ...wsRef.current, ...p });

  const loadPreset = useCallback(async (name: string) => {
    const d = await fetch(`/api/preset?name=${name}`).then((r) => r.json());
    reset();
    saveWs({ ...EMPTY, ...d.config, kb: d.kb, tickets: d.tickets });
    setSettings({ ...DEFAULT_ROI, ...roiDefaultsFor(d.config.currency) });
  }, [reset, saveWs, setSettings]);

  const newWorkspace = (company: string) => {
    reset();
    saveWs({ ...EMPTY, company });
    setSettings({ ...DEFAULT_ROI, ...roiDefaultsFor("$") });
  };

  const addDoc = (title: string, content: string) => {
    const w = wsRef.current;
    const id = `KB-${String(w.kb.length + 1).padStart(2, "0")}-${Math.random().toString(36).slice(2, 5)}`;
    saveWs({ ...w, kb: [...w.kb, { id, title, content }] });
  };
  const updateDoc: Store["updateDoc"] = (id, patch) =>
    saveWs({ ...wsRef.current, kb: wsRef.current.kb.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
  const removeDoc = (id: string) => saveWs({ ...wsRef.current, kb: wsRef.current.kb.filter((d) => d.id !== id) });

  const processOne = useCallback((t: Ticket) => {
    const { kb, tickets: _t, ...config } = wsRef.current; // eslint-disable-line @typescript-eslint/no-unused-vars
    fetch("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket: t, config, kb }),
    })
      .then((r) => r.json())
      .then((res: ProcessResult) => { if (res.draft) setResults((p) => ({ ...p, [t.id]: res })); })
      .catch(() => {});
  }, []);

  const addTicket: Store["addTicket"] = (t) => {
    const w = wsRef.current;
    const ticket: Ticket = { ...t, id: `T-${Date.now().toString().slice(-6)}`, minutesAgo: t.minutesAgo ?? 0 };
    saveWs({ ...w, tickets: [...w.tickets, ticket] });
    setArrived((p) => [ticket.id, ...p]);
    processOne(ticket);
    return ticket.id;
  };

  const addVoiceTicket = (t: Ticket, r: ProcessResult) => {
    const w = wsRef.current;
    saveWs({ ...w, tickets: [...w.tickets, t] });
    setArrived((p) => [t.id, ...p]);
    setResults((p) => ({ ...p, [t.id]: r }));
  };

  const simulate = useCallback(() => {
    reset();
    setSimulating(true);
    const list = wsRef.current.tickets;
    list.forEach((t, i) => {
      timers.current.push(
        setTimeout(() => {
          setArrived((p) => [t.id, ...p]);
          processOne(t);
          if (i === list.length - 1) setSimulating(false);
        }, i * 700),
      );
    });
  }, [reset, processOne]);

  const loadAll = useCallback(() => {
    reset();
    const list = wsRef.current.tickets;
    setArrived([...list].reverse().map((t) => t.id));
    list.forEach(processOne);
  }, [reset, processOne]);

  const act = (id: string, a: Action) => setActions((p) => ({ ...p, [id]: a }));
  const edit = (id: string, text: string) => setEdits((p) => ({ ...p, [id]: text }));
  const rate = (id: string, v: "up" | "down") =>
    setFeedback((p) => {
      const next = { ...p, [id]: v };
      localStorage.setItem("feedback", JSON.stringify(next));
      return next;
    });

  return (
    <Ctx.Provider value={{ ready, ws, arrived, results, actions, edits, feedback, settings, simulating, setSettings, updateConfig, loadPreset, newWorkspace, addDoc, removeDoc, updateDoc, addTicket, addVoiceTicket, simulate, loadAll, reset, act, edit, rate }}>
      {children}
    </Ctx.Provider>
  );
}
