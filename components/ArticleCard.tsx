import Link from "next/link";
import { formatDate, rubric } from "@/lib/format";
import type { Article } from "@/lib/types";
import { VerificationBadge } from "./VerificationBadge";

type Props = { article: Article; variant: "lead" | "side" | "standard" };

export function ArticleCard({ article, variant }: Props) {
  const pub = article.publications;
  return (
    <article className={`card card-${variant}`}>
      <p className="kicker">{rubric(pub?.info_type)}</p>
      <h2 className="card-title">
        <Link href={`/articles/${article.id}`}>{article.headline}</Link>
      </h2>
      {variant !== "side" && article.chapo && <p className="chapo">{article.chapo}</p>}
      <p className="meta">
        {pub?.company ?? "Société inconnue"} · {formatDate(pub?.published_at)} ·{" "}
        <VerificationBadge status={article.status} />
      </p>
    </article>
  );
}
