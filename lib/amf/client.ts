/**
 * Client de l'API open data info-financière (Opendatasoft Explore v2.1).
 * Dataset : flux-amf-new-prod — une ligne = une publication réglementée (métadonnées + lien document).
 */
const BASE_URL =
  "https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/records";
const PAGE_SIZE = 100; // plafond imposé par l'API (au-delà : erreur 400)
const MAX_PAGES = 50; // garde-fou : 5 000 publications max par ingestion

export type AmfRecord = Record<string, unknown>;
type AmfPage = { total_count: number; results: AmfRecord[] };

/** Date (YYYY-MM-DD, UTC) d'il y a `days` jours. */
export function sinceDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function buildUrl(since: string, offset: number): string {
  const params = new URLSearchParams({
    where: `uin_dat_amf >= date'${since}'`,
    order_by: "uin_dat_amf desc",
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });
  return `${BASE_URL}?${params}`;
}

async function fetchPage(url: string): Promise<AmfPage> {
  const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`API info-financière ${res.status} : ${await res.text()}`);
  return (await res.json()) as AmfPage;
}

/** Récupère toutes les publications des `days` derniers jours (pagination par 100). */
export async function fetchRecentRecords(days: number): Promise<AmfRecord[]> {
  const since = sinceDate(days);
  const all: AmfRecord[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await fetchPage(buildUrl(since, page * PAGE_SIZE));
    all.push(...data.results);
    if (data.results.length < PAGE_SIZE || all.length >= data.total_count) break;
  }
  return all;
}
