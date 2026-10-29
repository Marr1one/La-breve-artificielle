import { NextResponse, type NextRequest } from "next/server";

/** Si ADMIN_SECRET est défini, exige l'en-tête x-admin-secret correspondant. */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  return !secret || req.headers.get("x-admin-secret") === secret;
}

export function intParam(req: NextRequest, name: string, fallback: number, max: number): number {
  const value = Number(req.nextUrl.searchParams.get(name));
  return Number.isInteger(value) && value > 0 ? Math.min(value, max) : fallback;
}

/** Enveloppe commune des routes /api : auth + gestion d'erreur JSON. */
export async function handle(req: NextRequest, run: () => Promise<unknown>): Promise<NextResponse> {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    return NextResponse.json(await run());
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
