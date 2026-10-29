import { PipelineControls } from "@/components/PipelineControls";

export default function RedactionPage() {
  return (
    <section className="redaction">
      <h1 className="section-title">Rédaction</h1>
      <ol className="steps">
        <li>
          <strong>Récupérer</strong> les publications des derniers jours depuis l&apos;API info-financière et les
          stocker dans Supabase.
        </li>
        <li>
          <strong>Sélectionner</strong> les publications qui méritent une brève (score éditorial, une par société).
        </li>
        <li>
          <strong>Rédiger</strong> les brèves avec le LLM, puis contrôler les chiffres contre le document source.
        </li>
      </ol>
      <PipelineControls />
    </section>
  );
}
