import { db } from "../supabase";
import type { Article, Brief, Verification } from "../types";

export type NewArticle = Brief & {
  publication_id: string;
  status: Verification["status"];
  verification: Verification;
  model: string;
  source_chars: number;
};

const WITH_PUBLICATION = "*, publications(*)";

export async function insertArticle(a: NewArticle): Promise<void> {
  const { error } = await db().from("articles").upsert(a, { onConflict: "publication_id" });
  if (error) throw new Error(`Supabase (insert article) : ${error.message}`);
}

export async function listArticles(limit = 20): Promise<Article[]> {
  const { data, error } = await db()
    .from("articles")
    .select(WITH_PUBLICATION)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Supabase (articles) : ${error.message}`);
  return (data ?? []) as Article[];
}

export async function getArticle(id: string): Promise<Article | null> {
  const { data, error } = await db().from("articles").select(WITH_PUBLICATION).eq("id", id).maybeSingle();
  if (error) throw new Error(`Supabase (article) : ${error.message}`);
  return data as Article | null;
}

/** Identifiants des publications qui ont déjà une brève (pour ne pas régénérer). */
export async function articlePublicationIds(): Promise<Set<string>> {
  const { data, error } = await db().from("articles").select("publication_id");
  if (error) throw new Error(`Supabase (ids articles) : ${error.message}`);
  return new Set((data ?? []).map((d) => d.publication_id as string));
}
