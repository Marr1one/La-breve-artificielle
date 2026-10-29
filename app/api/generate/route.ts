import type { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { runGeneration } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST /api/generate — rédige et vérifie les brèves des publications sélectionnées. */
export async function POST(req: NextRequest) {
  return handle(req, () => runGeneration());
}
