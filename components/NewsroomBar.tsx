"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatDate } from "@/lib/format";

type Step = "ingest" | "select" | "generate";
type StepState = "pending" | "running" | "done" | "error";

/** Part de la barre attribuée à chaque étape, proportionnelle à sa durée habituelle. */
const STEPS: { id: Step; label: string; from: number; to: number }[] = [
  { id: "ingest", label: "Récupération des publications AMF", from: 0, to: 35 },
  { id: "select", label: "Sélection des 5 sujets", from: 35, to: 45 },
  { id: "generate", label: "Rédaction et contrôle des chiffres", from: 45, to: 100 },
];

const SECRET_KEY = "amf-admin-secret";

type GenerateResult = { company: string | null; headline?: string; status?: string; error?: string }[];

async function callStep(step: Step, days: number, secret: string): Promise<unknown> {
  const res = await fetch(`/api/${step}?days=${days}&n=5`, {
    method: "POST",
    headers: secret ? { "x-admin-secret": secret } : {},
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Secret admin requis : renseignez-le dans les réglages.");
  if (!res.ok) throw new Error(body.error ?? `Erreur ${res.status}`);
  return body;
}

/** Résumé lisible du résultat de chaque étape. */
function summarize(step: Step, result: unknown): string {
  if (step === "ingest") {
    const r = result as { fetched?: number; stored?: number };
    return `${r.stored ?? 0} publications enregistrées`;
  }
  if (step === "select") {
    const r = result as { candidates?: number; selected?: unknown[] };
    return `${r.selected?.length ?? 0} sujets retenus sur ${r.candidates ?? 0}`;
  }
  const r = result as GenerateResult;
  const ok = r.filter((a) => !a.error);
  if (r.length === 0) return "Brèves déjà à jour pour cette sélection";
  const verified = ok.filter((a) => a.status === "verifie").length;
  const failed = r.length - ok.length;
  return `${ok.length} brève(s) rédigée(s), ${verified} vérifiée(s)${failed ? `, ${failed} échec(s)` : ""}`;
}

export function NewsroomBar({ lastUpdate }: { lastUpdate: string | null }) {
  const router = useRouter();
  const [days, setDays] = useState(4);
  const [secret, setSecret] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [states, setStates] = useState<Record<Step, StepState>>({ ingest: "pending", select: "pending", generate: "pending" });
  const [notes, setNotes] = useState<Partial<Record<Step, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const target = useRef(0);

  useEffect(() => {
    try {
      setSecret(sessionStorage.getItem(SECRET_KEY) ?? "");
    } catch {
      // stockage indisponible (navigation privée) : le secret sera simplement redemandé
    }
  }, []);

  // Les routes ne renvoient pas d'avancement : la barre avance en douceur vers la fin de l'étape en cours.
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setProgress((p) => p + (target.current - 2 - p) * 0.05), 200);
    return () => clearInterval(timer);
  }, [running]);

  function saveSecret(value: string) {
    setSecret(value);
    try {
      sessionStorage.setItem(SECRET_KEY, value);
    } catch {
      // idem
    }
  }

  async function run() {
    setRunning(true);
    setError(null);
    setNotes({});
    setProgress(0);
    setStates({ ingest: "pending", select: "pending", generate: "pending" });
    for (const step of STEPS) {
      target.current = step.to;
      setStates((s) => ({ ...s, [step.id]: "running" }));
      try {
        const result = await callStep(step.id, days, secret);
        setNotes((n) => ({ ...n, [step.id]: summarize(step.id, result) }));
        setStates((s) => ({ ...s, [step.id]: "done" }));
        setProgress(step.to);
      } catch (e) {
        setStates((s) => ({ ...s, [step.id]: "error" }));
        setError((e as Error).message);
        if ((e as Error).message.startsWith("Secret")) setSettingsOpen(true);
        setRunning(false);
        return;
      }
    }
    setRunning(false);
    router.refresh(); // recharge la une avec les nouvelles brèves
  }

  const started = Object.values(states).some((s) => s !== "pending");

  return (
    <section className="newsroom" aria-label="Rédaction">
      <div className="newsroom-head">
        <div>
          <p className="newsroom-kicker">La rédaction</p>
          <p className="newsroom-status">
            {running
              ? "Édition en cours de préparation…"
              : lastUpdate
                ? `Dernière édition : ${formatDate(lastUpdate, true)}`
                : "Aucune édition publiée"}
          </p>
        </div>
        <div className="newsroom-actions">
          <button
            type="button"
            className="link-button"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((o) => !o)}
          >
            Réglages
          </button>
          <button type="button" className="primary" disabled={running} onClick={run}>
            {running ? "Rédaction en cours…" : "Relancer la rédaction"}
          </button>
        </div>
      </div>

      {settingsOpen && (
        <div className="newsroom-settings">
          <label>
            Publications des
            <input type="number" min={1} max={14} value={days} onChange={(e) => setDays(Number(e.target.value))} />
            derniers jours
          </label>
          <label>
            Secret admin
            <input
              type="password"
              placeholder="si configuré"
              value={secret}
              onChange={(e) => saveSecret(e.target.value)}
            />
          </label>
        </div>
      )}

      {started && (
        <div className="newsroom-progress">
          <div
            className={`progress ${error ? "progress-error" : ""}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <ol className="progress-steps">
            {STEPS.map((step) => (
              <li key={step.id} className={`step-${states[step.id]}`}>
                <span className="step-dot" aria-hidden />
                <span className="step-label">{step.label}</span>
                {notes[step.id] && <span className="step-note">{notes[step.id]}</span>}
              </li>
            ))}
          </ol>
          {error && <p className="newsroom-error">{error}</p>}
          {!running && !error && progress >= 100 && <p className="newsroom-done">Édition à jour.</p>}
        </div>
      )}
    </section>
  );
}
