"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="empty">
      <h1>Une erreur est survenue</h1>
      <p>{error.message}</p>
      <p>Vérifiez les variables d&apos;environnement (.env.local) et que le schéma Supabase a bien été créé.</p>
      <button onClick={reset}>Réessayer</button>
    </section>
  );
}
