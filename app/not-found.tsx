import Link from "next/link";

export default function NotFound() {
  return (
    <section className="empty">
      <h1>Article introuvable</h1>
      <p>
        <Link href="/">← Retour à la une</Link>
      </p>
    </section>
  );
}
