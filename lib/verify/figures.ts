import type { Brief, Verification } from "../types";

/**
 * Vérification des chiffres, volontairement simple :
 * 1. on extrait tous les nombres de la brève (titre + chapô + corps) ;
 * 2. on réduit chaque nombre à sa « signature » = ses chiffres sans séparateurs
 *    (« 1 234,5 », « 1.234,5 » et « 1,234.5 » donnent tous « 12345 ») ;
 * 3. un nombre est vérifié si la même signature existe dans le texte du document source.
 * Limites assumées : une conversion faite par le LLM (« 1,2 Md€ » vs « 1 200 M€ ») est signalée
 * comme introuvable, et une coïncidence de chiffres peut produire un faux positif.
 */
const NUMBER = /\d{1,3}(?:[\s  .,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g;

export function extractNumbers(text: string): string[] {
  return [...new Set(text.match(NUMBER) ?? [])].map((n) => n.trim());
}

function signature(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

export function verifyFigures(brief: Brief, docText: string): Verification {
  if (!docText.trim()) {
    return {
      status: "non_verifiable",
      checks: [],
      note: "Texte du document source indisponible (lien absent, PDF scanné ou archive) : aucun chiffre ne peut être contrôlé.",
    };
  }
  const known = new Set(extractNumbers(docText).map(signature));
  const checks = extractNumbers(`${brief.headline} ${brief.chapo} ${brief.body}`).map((value) => ({
    value,
    found: known.has(signature(value)),
  }));
  const missing = checks.filter((c) => !c.found).map((c) => c.value);
  if (missing.length === 0) {
    const note = checks.length ? `${checks.length} chiffre(s) retrouvé(s) dans le document source.` : "La brève ne contient aucun chiffre.";
    return { status: "verifie", checks, note };
  }
  return {
    status: "partiel",
    checks,
    note: `${missing.length}/${checks.length} chiffre(s) introuvable(s) dans le document source : ${missing.join(", ")}.`,
  };
}
