import type { Publication } from "../types";
import type { AmfRecord } from "./client";

/**
 * Correspondance champ métier -> noms de colonnes possibles dans l'API.
 * Les champs sont cherchés par motif (et non par nom exact) pour résister
 * aux variations de nommage ; le record brut est de toute façon conservé dans `raw`.
 */
const FIELDS: Record<string, RegExp[]> = {
  id: [/^uin_idt_uin$/, /idt_uin/],
  published_at: [/^uin_dat_amf$/, /dat_(amf|emt|pub)/],
  company: [/nom_soc/, /societe.*nom|nom.*soc/],
  isin: [/cd_isi/, /isin/],
  info_type: [/^type_d_information$/, /^(?!.*sous).*typ.*inf/],
  info_subtype: [/sous.?typ/],
  title: [/tit_inf/, /titre|title|^tit/],
  language: [/^lang|_lan|_lng_|langue/],
};

const SITE = "https://www.info-financiere.gouv.fr";

/** Nettoie une valeur brute : null, chaîne vide et la chaîne littérale "NULL" deviennent null. */
function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v);
  const t = s.trim();
  return t === "" || t.toUpperCase() === "NULL" ? null : t;
}

function pick(r: AmfRecord, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    for (const key of Object.keys(r)) {
      if (!pattern.test(key.toLowerCase())) continue;
      const value = clean(r[key]);
      if (value) return value;
    }
  }
  return null;
}

/** Cherche l'URL du document : priorité aux liens .pdf, sinon premier lien trouvé. */
function findDocumentUrl(r: AmfRecord): string | null {
  const urls: string[] = [];
  for (const [key, v] of Object.entries(r)) {
    const s =
      v && typeof v === "object" && "url" in v ? String((v as { url: unknown }).url) : typeof v === "string" ? v : "";
    if (/^https?:\/\//.test(s)) urls.push(s);
    else if (s.startsWith("/") && /url|lien|fichier|doc/i.test(key)) urls.push(`${SITE}${s}`);
  }
  return urls.find((u) => /\.pdf($|\?)/i.test(u)) ?? urls[0] ?? null;
}

function toIso(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** « Français » / « Anglais » (libellés de l'API) ou codes ISO -> "fr" / "en". */
function toLanguageCode(s: string | null): string | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (v.startsWith("fr")) return "fr";
  if (v.startsWith("an") || v.startsWith("en")) return "en";
  return v.slice(0, 2);
}

/** Transforme un record brut de l'API en ligne de la table `publications`. */
export function mapRecord(r: AmfRecord): Publication | null {
  const id = pick(r, FIELDS.id);
  if (!id) return null;
  return {
    id,
    company: pick(r, FIELDS.company),
    isin: pick(r, FIELDS.isin),
    info_type: pick(r, FIELDS.info_type),
    info_subtype: pick(r, FIELDS.info_subtype),
    title: pick(r, FIELDS.title),
    published_at: toIso(pick(r, FIELDS.published_at)),
    language: toLanguageCode(pick(r, FIELDS.language)),
    document_url: findDocumentUrl(r),
    raw: r,
  };
}
