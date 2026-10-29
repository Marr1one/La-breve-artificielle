import Link from "next/link";
import { notFound } from "next/navigation";
import { VerificationBadge } from "@/components/VerificationBadge";
import { getArticle } from "@/lib/db/articles";
import { formatDate, rubric } from "@/lib/format";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

function VerificationBox({ article }: { article: Article }) {
  const { checks, note } = article.verification;
  return (
    <aside className="verif">
      <h3>
        Contrôle des chiffres <VerificationBadge status={article.status} />
      </h3>
      <p>{note}</p>
      {checks.length > 0 && (
        <ul className="checks">
          {checks.map((c) => (
            <li key={c.value} className={c.found ? "ok" : "ko"}>
              {c.found ? "✓" : "✗"} {c.value}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) notFound();
  const pub = article.publications;
  return (
    <article className="article">
      <p className="kicker">{rubric(pub?.info_type)}</p>
      <h1 className="article-title">{article.headline}</h1>
      {article.chapo && <p className="chapo chapo-lg">{article.chapo}</p>}
      <p className="meta">
        {pub?.company} · Publié auprès de l&apos;AMF le {formatDate(pub?.published_at, true)}
      </p>
      <div className="article-body">
        {article.body.split(/\n+/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      {pub?.document_url && (
        <p className="source">
          <a href={pub.document_url} target="_blank" rel="noreferrer">
            Lire le document source déposé auprès de l&apos;AMF →
          </a>
        </p>
      )}
      <VerificationBox article={article} />
      {pub?.selection_reason && <p className="why">Pourquoi cette brève ? {pub.selection_reason} (score {pub.score}).</p>}
      <p className="back">
        <Link href="/">← Retour à la une</Link>
      </p>
    </article>
  );
}
