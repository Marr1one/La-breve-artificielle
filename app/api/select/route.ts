import type { NextRequest } from "next/server";
import { handle, intParam } from "@/lib/api";
import { runSelection } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

/** POST /api/select?days=4&n=5 — choisit les publications qui méritent une brève. */
export async function POST(req: NextRequest) {
  return handle(req, () => runSelection(intParam(req, "days", 4, 14), intParam(req, "n", 5, 5)));
}
