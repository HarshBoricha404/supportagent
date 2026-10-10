import { NextResponse } from "next/server";
import { loadPreset } from "@/lib/claude";

export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name") ?? "scaler";
  try {
    return NextResponse.json(loadPreset(name));
  } catch {
    return NextResponse.json({ error: "unknown preset" }, { status: 404 });
  }
}
