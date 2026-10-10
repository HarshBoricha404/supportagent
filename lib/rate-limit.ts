// Tiny in-memory per-IP limiter so a public demo can't drain the API key.
// Per serverless instance only: good enough for a hackathon, not a real quota.
const hits = new Map<string, number[]>();

export function rateLimited(req: Request, max = 60, windowMs = 60_000): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > max;
}
