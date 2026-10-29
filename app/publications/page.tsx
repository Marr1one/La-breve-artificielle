import { listInfoTypes, listPublications, type PublicationFilters } from "@/lib/db/publications";
import { formatDate } from "@/lib/format";
import type { Publication } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | undefined>>;

function Filters({ f, types }: { f: PublicationFilters; types: string[] }) {
  return (
    <form className="filters" method="get">
      <input name="company" placeholder="Société" defaultValue={f.company} />
      <select name="type" defaultValue={f.type ?? ""}>
        <option value="">Tous les types d&apos;information</option>
        {types.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <label>
        Du <input type="date" name="from" defaultValue={f.from} />
      </label>
      <label>
        au <input type="date" name="to" defaultValue={f.to} />
      </label>
      <button type="submit">Filtrer</button>
      <a href="/publications">Réinitialiser</a>
    </form>
  );
}

function Row({ p }: { p: Publication }) {
  return (
    <tr className={p.selected ? "selected" : undefined}>
      <td>{formatDate(p.published_at, true)}</td>
      <td>{p.company ?? "—"}</td>
      <td>{p.info_type ?? "—"}</td>
      <td>
        {p.document_url ? (
          <a href={p.document_url} target="_blank" rel="noreferrer">
            {p.title ?? "Document"}
          </a>
        ) : (
          p.title ?? "—"
        )}
      </td>
      <td>{p.language ?? "—"}</td>
      <td>{p.selected ? `★ ${p.score}` : ""}</td>
    </tr>
  );
}

export default async function PublicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const f: PublicationFilters = { company: sp.company || undefined, type: sp.type || undefined, from: sp.from || undefined, to: sp.to || undefined };
  const [pubs, types] = await Promise.all([listPublications(f), listInfoTypes()]);
  return (
    <section>
      <h1 className="section-title">Publications réglementées</h1>
      <Filters f={f} types={types} />
      <p className="meta">{pubs.length} publication(s) affichée(s) (300 max). ★ = retenue pour une brève.</p>
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Société</th>
            <th>Type d&apos;information</th>
            <th>Titre</th>
            <th>Langue</th>
            <th>Sélection</th>
          </tr>
        </thead>
        <tbody>
          {pubs.map((p) => (
            <Row key={p.id} p={p} />
          ))}
        </tbody>
      </table>
    </section>
  );
}
