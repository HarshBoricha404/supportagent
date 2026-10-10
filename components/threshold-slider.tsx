"use client";
import { Slider } from "@/components/ui/slider";
import { useStore } from "@/components/store";

export function ThresholdSlider() {
  const { settings, setSettings } = useStore();
  const pct = Math.round(settings.threshold * 100);
  const mode = pct >= 90 ? "Safe" : pct >= 75 ? "Balanced" : "Aggressive";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Auto-resolve confidence threshold</span>
        <span className="tabular-nums text-muted-foreground">{pct}% · {mode}</span>
      </div>
      <Slider min={50} max={99} step={1} value={[pct]} onValueChange={(v) => setSettings({ threshold: (Array.isArray(v) ? v[0] : v) / 100 })} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Aggressive (more automation)</span><span>Safe (more human review)</span>
      </div>
    </div>
  );
}
