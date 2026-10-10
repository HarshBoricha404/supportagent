import fs from "node:fs";
import path from "node:path";
import { loadPreset, processLive } from "../lib/claude";
import { mockProcess } from "../lib/mock";
import type { ProcessResult } from "../lib/types";

// Usage: npm run pregenerate         (live Claude, needs ANTHROPIC_API_KEY)
//        npm run pregenerate -- --mock (offline heuristic cache)
async function main() {
  const mock = process.argv.includes("--mock");
  const presetName = process.argv.find((a) => !a.startsWith("-") && ["scaler", "acme"].includes(a)) ?? "scaler";
  const { config, kb, tickets } = loadPreset(presetName);
  const out: Record<string, ProcessResult> = {};
  let failed = 0;
  for (let i = 0; i < tickets.length; i += 5) {
    await Promise.all(
      tickets.slice(i, i + 5).map(async (t) => {
        try {
          out[t.id] = mock ? mockProcess(t) : await processLive(t, config, kb);
        } catch (e) {
          console.error(t.id, "failed:", (e as Error).message);
          failed++;
          return;
        }
        console.log(t.id, out[t.id].source, out[t.id].draft.confidence);
      }),
    );
  }
  if (failed) {
    console.error(`${failed} tickets failed; cache.json NOT overwritten.`);
    process.exit(1);
  }
  fs.writeFileSync(path.join(process.cwd(), "data", "presets", presetName, "cache.json"), JSON.stringify(out, null, 1));
  console.log(`wrote ${Object.keys(out).length} results`);

}
main();
