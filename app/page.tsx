import Image from "next/image";
import { ArticleCard } from "@/components/ArticleCard";
import { NewsroomBar } from "@/components/NewsroomBar";
import { listArticles } from "@/lib/db/articles";

export const dynamic = "force-dynamic";

function EmptyState() {
  return (
    <section className="empty">
      <h1>Aucune brève publiée pour le moment</h1>
      <p>
        Lancez la rédaction ci-dessus : récupération des publications AMF, sélection des sujets, puis rédaction des
        brèves.
      </p>
    </section>
  );
}

export default async function HomePage() {
  const articles = await listArticles(20);
  const bar = <NewsroomBar lastUpdate={articles[0]?.created_at ?? null} />;
  if (articles.length === 0) {
    return (
      <>
        {bar}
        <EmptyState />
      </>
    );
  }
  const [lead, ...others] = articles;
  const side = others.slice(0, 4);
  const more = others.slice(4);
  return (
    <>
      {bar}
      <section className="une">
        <div className="une-main">
          <ArticleCard article={lead} variant="lead" />
          <figure className="une-visual">
            <Image
              src="/une-marches.png"
              alt="Graphique boursier en hausse sur fond de piles de pièces"
              width={2560}
              height={1440}
              sizes="(max-width: 760px) 100vw, 720px"
              priority
            />
          </figure>
        </div>
        <aside className="une-side">
          {side.map((a) => (
            <ArticleCard key={a.id} article={a} variant="side" />
          ))}
        </aside>
      </section>
      {more.length > 0 && (
        <section className="grid">
          <h2 className="section-title">Les brèves précédentes</h2>
          {more.map((a) => (
            <ArticleCard key={a.id} article={a} variant="standard" />
          ))}
        </section>
      )}
    </>
  );
}
