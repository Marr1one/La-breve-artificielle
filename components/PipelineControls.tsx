"use client";

import { useState } from "react";

type Step = "ingest" | "select" | "generate";

const LABELS: Record<Step, string> = {
  ingest: "1. Récupérer les publications",
  select: "2. Sélectionner",
  generate: "3. Rédiger les brèves",
};

async function callStep(step: Step, days: number, secret: string): Promise<unknown> {
  const res = await fetch(`/api/${step}?days=${days}&n=5`, {
    method: "POST",
    headers: secret ? { "x-admin-secret": secret } : {},
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Erreur ${res.status}`);
  return body;
}

export function PipelineControls() {
  const [days, setDays] = useState(4);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState<Step | null>(null);
  const [log, setLog] = useState<string[]>([]);

  async function run(steps: Step[]) {
    for (const step of steps) {
      setBusy(step);
      try {
        const result = await callStep(step, days, secret);
        setLog((l) => [`✓ ${LABELS[step]}\n${JSON.stringify(result, null, 2)}`, ...l]);
      } catch (e) {
        setLog((l) => [`✗ ${LABELS[step]} : ${(e as Error).message}`, ...l]);
        break;
      }
    }
    setBusy(null);
  }

  return (
    <div className="controls">
      <div className="controls-row">
        <label>
          Jours <input type="number" min={1} max={14} value={days} onChange={(e) => setDays(Number(e.target.value))} />
        </label>
        <input type="password" placeholder="Secret admin (si configuré)" value={secret} onChange={(e) => setSecret(e.target.value)} />
      </div>
      <div className="controls-row">
        {(Object.keys(LABELS) as Step[]).map((s) => (
          <button key={s} disabled={busy !== null} onClick={() => run([s])}>
            {busy === s ? "En cours…" : LABELS[s]}
          </button>
        ))}
        <button className="primary" disabled={busy !== null} onClick={() => run(["ingest", "select", "generate"])}>
          Tout lancer
        </button>
      </div>
      {log.map((entry, i) => (
        <pre key={i} className="log">
          {entry}
        </pre>
      ))}
    </div>
  );
}
