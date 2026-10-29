import { fetchRecentRecords, sinceDate } from "./amf/client";
import { mapRecord } from "./amf/mapper";
import { articlePublicationIds, insertArticle } from "./db/articles";
import { getSelected, listAllSince, saveSelection, upsertPublications } from "./db/publications";
import { MODEL, generateBrief } from "./llm/brief";
import { fetchDocumentText } from "./pdf/extract";
import { selectTop } from "./selection/score";
import type { Publication } from "./types";
import { verifyFigures } from "./verify/figures";

/** Étape 1 : API info-financière -> table publications. */
export async function runIngest(days: number) {
  const records = await fetchRecentRecords(days);
  const rows = records.map(mapRecord).filter((p): p is Publication => p !== null);
  await upsertPublications(rows);
  return {
    since: sinceDate(days),
    fetched: records.length,
    stored: rows.length,
    sampleKeys: Object.keys(records[0] ?? {}), // utile pour vérifier le mapping des champs
  };
}

/** Étape 2 : score éditorial et sélection des n publications à traiter. */
export async function runSelection(days: number, n: number) {
  const pubs = await listAllSince(sinceDate(days));
  const top = selectTop(pubs, n);
  await saveSelection(top);
  return {
    candidates: pubs.length,
    selected: top.map((p) => ({ company: p.company, title: p.title, score: p.score, reason: p.selection_reason })),
  };
}

async function generateOne(p: Publication) {
  const docText = p.document_url ? await fetchDocumentText(p.document_url).catch(() => "") : "";
  const brief = await generateBrief(p, docText);
  const verification = verifyFigures(brief, docText);
  await insertArticle({
    ...brief,
    publication_id: p.id,
    status: verification.status,
    verification,
    model: MODEL,
    source_chars: docText.length,
  });
  return { company: p.company, headline: brief.headline, status: verification.status, note: verification.note };
}

/** Étape 3 : brève LLM + contrôle des chiffres pour chaque publication sélectionnée. */
export async function runGeneration() {
  const [selected, done] = await Promise.all([getSelected(), articlePublicationIds()]);
  const todo = selected.filter((p) => !done.has(p.id));
  const results = await Promise.allSettled(todo.map(generateOne));
  return results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { company: todo[i].company, error: String((r.reason as Error)?.message ?? r.reason) },
  );
}
