import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { todayLabel } from "@/lib/format";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Brève Artificielle",
  description: "Brèves d'actualité rédigées à partir des publications réglementées déposées auprès de l'AMF.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <header className="masthead">
          <div className="masthead-top">
            <span className="capitalize">{todayLabel()}</span>
            <span>Source : info-financiere.gouv.fr (AMF)</span>
          </div>
          <Link href="/" className="masthead-title">
            La Brève Artificielle
          </Link>
          <nav className="sections">
            <Link href="/">À la une</Link>
            <Link href="/publications">Publications</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="footer">
          Brèves rédigées par IA à partir des documents déposés auprès de l&apos;AMF. Les chiffres sont contrôlés
          automatiquement contre le document source ; le statut de vérification figure sur chaque article.
        </footer>
      </body>
    </html>
  );
}
