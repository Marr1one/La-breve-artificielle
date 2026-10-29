import { db } from "../supabase";
import type { Publication, ScoredPublication } from "../types";

const CHUNK = 500;
const PAGE = 1000; // limite par requête côté Supabase

export type PublicationFilters = { company?: string; type?: string; from?: string; to?: string };

export async function upsertPublications(rows: Publication[]): Promise<number> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db().from("publications").upsert(rows.slice(i, i + CHUNK), { onConflict: "id" });
    if (error) throw new Error(`Supabase (upsert publications) : ${error.message}`);
  }
  return rows.length;
}

/** Liste filtrable affichée sur la page Publications. */
export async function listPublications(f: PublicationFilters, limit = 300): Promise<Publication[]> {
  let q = db().from("publications").select("*").order("published_at", { ascending: false }).limit(limit);
  if (f.company) q = q.ilike("company", `%${f.company}%`);
  if (f.type) q = q.eq("info_type", f.type);
  if (f.from) q = q.gte("published_at", `${f.from}T00:00:00Z`);
  if (f.to) q = q.lte("published_at", `${f.to}T23:59:59Z`);
  const { data, error } = await q;
  if (error) throw new Error(`Supabase (liste publications) : ${error.message}`);
  return (data ?? []) as Publication[];
}

/** Toutes les publications depuis une date (paginé), pour la sélection. */
export async function listAllSince(since: string): Promise<Publication[]> {
  const all: Publication[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db()
      .from("publications")
      .select("*")
      .gte("published_at", `${since}T00:00:00Z`)
      .order("published_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Supabase (lecture publications) : ${error.message}`);
    all.push(...((data ?? []) as Publication[]));
    if (!data || data.length < PAGE) return all;
  }
}

export async function listInfoTypes(): Promise<string[]> {
  const { data, error } = await db().from("publications").select("info_type").not("info_type", "is", null).limit(5000);
  if (error) throw new Error(`Supabase (types) : ${error.message}`);
  return [...new Set((data ?? []).map((d) => d.info_type as string))].sort();
}

/** Remplace la sélection courante par les publications retenues. */
export async function saveSelection(selected: ScoredPublication[]): Promise<void> {
  const reset = await db().from("publications").update({ selected: false }).eq("selected", true);
  if (reset.error) throw new Error(`Supabase (reset sélection) : ${reset.error.message}`);
  for (const p of selected) {
    const { error } = await db()
      .from("publications")
      .update({ selected: true, score: p.score, selection_reason: p.selection_reason })
      .eq("id", p.id);
    if (error) throw new Error(`Supabase (sélection ${p.id}) : ${error.message}`);
  }
}

export async function getSelected(): Promise<Publication[]> {
  const { data, error } = await db().from("publications").select("*").eq("selected", true).order("score", { ascending: false });
  if (error) throw new Error(`Supabase (sélection) : ${error.message}`);
  return (data ?? []) as Publication[];
}
