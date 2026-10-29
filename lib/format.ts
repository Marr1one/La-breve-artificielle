import type { VerificationStatus } from "./types";

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export function todayLabel(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date());
}

export const STATUS_LABEL: Record<VerificationStatus, string> = {
  verifie: "Chiffres vérifiés",
  partiel: "Chiffres à vérifier",
  non_verifiable: "Non vérifiable",
};

/** Surtitre façon rubrique de journal, dérivé du type d'information. */
export function rubric(infoType: string | null | undefined): string {
  return (infoType ?? "Marchés").replace(/^Communiqués? (au titre de l.)?/i, "").slice(0, 60);
}
