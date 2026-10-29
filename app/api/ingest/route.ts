import type { NextRequest } from "next/server";
import { handle, intParam } from "@/lib/api";
import { runIngest } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST /api/ingest?days=4 — récupère et stocke les publications récentes. */
export async function POST(req: NextRequest) {
  return handle(req, () => runIngest(intParam(req, "days", 4, 14)));
}
