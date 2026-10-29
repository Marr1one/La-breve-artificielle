import type { Publication, ScoredPublication } from "../types";

/**
 * Critère de sélection : un score éditorial simple et explicable.
 * - grandes capitalisations (CAC 40) => priorité absolue ;
 * - signaux forts (M&A, offre publique, résultats, gouvernance...) => points positifs ;
 * - publications réglementaires de routine (rachats d'actions, droits de vote...) => exclues ;
 * - bonus si un document source est disponible (sinon on ne peut ni rédiger ni vérifier) ;
 * - léger bonus pour les publications en français.
 */
type Rule = { pattern: RegExp; weight: number; label: string };

export const RULES: Rule[] = [
  { pattern: /fusion|acquisition|cession|prise de controle|rapprochement/, weight: 100, label: "opération de M&A" },
  { pattern: /offre publique|\bopa\b|\bope\b|retrait obligatoire/, weight: 90, label: "offre publique" },
  { pattern: /resultat|chiffre d.affaires|information financiere|rapport financier/, weight: 80, label: "résultats financiers" },
  { pattern: /nomination|directeur general|gouvernance/, weight: 45, label: "changement de dirigeants" },
  { pattern: /avertissement|objectif|perspective|guidance|previsions/, weight: 40, label: "révision des objectifs" },
  { pattern: /augmentation de capital|emission obligataire|refinancement/, weight: 35, label: "opération de financement" },
  { pattern: /information privilegiee|information permanente/, weight: 15, label: "information privilégiée" },
  { pattern: /franchissement de seuil/, weight: 10, label: "franchissement de seuil" },
];

/** Bonus taille : supérieur à tout signal, une news non routinière du CAC 40 passe devant le reste. */
const LARGE_CAP_WEIGHT = 150;

/**
 * ISIN des valeurs du CAC 40 (composition à mettre à jour lors des révisions trimestrielles d'Euronext).
 * L'API info-financière ne couvre que les émetteurs suivis par l'AMF : pas d'Apple ni d'autres valeurs US.
 */
const CAC40 = new Set([
  "FR0000120404", // Accor
  "FR0000120073", // Air Liquide
  "NL0000235190", // Airbus
  "LU1598757687", // ArcelorMittal
  "FR0000120628", // AXA
  "FR0000131104", // BNP Paribas
  "FR0000120503", // Bouygues
  "FR0006174348", // Bureau Veritas
  "FR0000125338", // Capgemini
  "FR0000120172", // Carrefour
  "FR0000045072", // Crédit Agricole SA
  "FR0000120644", // Danone
  "FR0014003TT8", // Dassault Systèmes
  "FR0010908533", // Edenred
  "FR0010208488", // Engie
  "FR0000121667", // EssilorLuxottica
  "FR0014000MR3", // Eurofins Scientific
  "FR0000052292", // Hermès
  "FR0000121485", // Kering
  "FR0000120321", // L'Oréal
  "FR0010307819", // Legrand
  "FR0000121014", // LVMH
  "FR001400AJ45", // Michelin
  "FR0000133308", // Orange
  "FR0000120693", // Pernod Ricard
  "FR0000130577", // Publicis
  "FR0000131906", // Renault
  "FR0000073272", // Safran
  "FR0000125007", // Saint-Gobain
  "FR0000120578", // Sanofi
  "FR0000121972", // Schneider Electric
  "FR0000130809", // Société Générale
  "NL00150001Q9", // Stellantis
  "NL0000226223", // STMicroelectronics
  "FR0000051807", // Teleperformance
  "FR0000121329", // Thales
  "FR0000120271", // TotalEnergies
  "FR0013326246", // Unibail-Rodamco-Westfield
  "FR0000124141", // Veolia
  "FR0000125486", // Vinci
]);

const ROUTINE =
  /rachat d.actions|actions propres|contrat de liquidite|droits de vote|nombre total d.actions|honoraires|mise a disposition|descriptif du programme|own shares|share buyback|voting rights|share capital/;

/**
 * Libellés de sous-types AMF trompeurs, neutralisés avant le calcul du score :
 * « Acquisition ou cession des actions de l'émetteur » = rachats d'actions (routine), pas du M&A ;
 * « offre publique d'acquisition » ne doit pas compter une seconde fois comme M&A.
 */
const BOILERPLATE: [RegExp, string][] = [
  [/acquisition ou cession des actions de l.emetteur/g, "rachat d'actions"],
  [/acquisition or disposal of the issuer.s own shares/g, "own shares"],
  [/offre publique d.acquisition/g, "offre publique"],
];

/** Le drapeau `cac40` de l'API est incomplet (Société Générale, Michelin... absents) : on le complète par l'ISIN. */
function isLargeCap(p: Publication): boolean {
  return (p.isin !== null && CAC40.has(p.isin)) || String(p.raw?.cac40) === "1";
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function scorePublication(p: Publication): ScoredPublication {
  const text = BOILERPLATE.reduce(
    (t, [pattern, replacement]) => t.replace(pattern, replacement),
    normalize([p.info_type, p.info_subtype, p.title].filter(Boolean).join(" ")),
  );
  const hits = RULES.filter((r) => r.pattern.test(text));
  let score = hits.reduce((sum, r) => sum + r.weight, 0);
  // La routine reste exclue même pour le CAC 40 (ses rachats d'actions hebdomadaires ne font pas une brève).
  if (ROUTINE.test(text) && score < 60) {
    return { ...p, score: -100, selection_reason: "Publication réglementaire de routine" };
  }
  const labels = hits.map((r) => r.label);
  if (isLargeCap(p)) {
    score += LARGE_CAP_WEIGHT;
    labels.unshift("valeur du CAC 40");
  }
  if (p.document_url) score += 10;
  else {
    score -= 50;
    labels.push("pas de document source (pénalisé)");
  }
  if (p.language === "fr") score += 5;
  const selection_reason = labels.length ? `Signaux : ${labels.join(", ")}` : "Aucun signal éditorial";
  return { ...p, score, selection_reason };
}

/** Les sociétés bilingues publient FR + EN : on garde une seule édition (FR de préférence). */
export function dedupeBilingual(pubs: Publication[]): Publication[] {
  const byKey = new Map<string, Publication>();
  for (const p of pubs) {
    const key = [p.isin ?? p.company, p.info_type, p.published_at?.slice(0, 13)].join("|");
    const prev = byKey.get(key);
    if (!prev || (prev.language !== "fr" && p.language === "fr")) byKey.set(key, p);
  }
  return [...byKey.values()];
}

/** Retient les `n` meilleures publications, au plus une par société. */
export function selectTop(pubs: Publication[], n: number): ScoredPublication[] {
  const scored = dedupeBilingual(pubs)
    .map(scorePublication)
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score || (b.published_at ?? "").localeCompare(a.published_at ?? ""));
  const seen = new Set<string>();
  const picked: ScoredPublication[] = [];
  for (const p of scored) {
    const company = p.isin ?? p.company ?? p.id;
    if (seen.has(company)) continue;
    seen.add(company);
    picked.push(p);
    if (picked.length === n) break;
  }
  return picked;
}
