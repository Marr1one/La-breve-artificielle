import { getDocumentProxy } from "unpdf";

const MAX_CHARS = 12_000; // l'essentiel d'un communiqué tient dans les premières pages : prompt court = réponse rapide

async function download(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Téléchargement du document impossible (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

function startsWith(bytes: Uint8Array, ascii: string): boolean {
  return [...ascii].every((c, i) => bytes[i] === c.charCodeAt(0));
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ");
}

function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
}

/**
 * Texte brut du document source. Renvoie "" si le format n'est pas lisible
 * (archive ESEF/ZIP, PDF scanné sans couche texte...) : la brève sera alors marquée non vérifiable.
 */
export async function fetchDocumentText(url: string): Promise<string> {
  const bytes = await download(url);
  if (startsWith(bytes, "PK")) return ""; // archive ZIP (ESEF)
  if (!startsWith(bytes, "%PDF")) return tidy(stripHtml(new TextDecoder().decode(bytes)));
  // Lecture page par page jusqu'à MAX_CHARS : évite de parser un rapport annuel de 300 pages en entier.
  const pdf = await getDocumentProxy(bytes);
  let text = "";
  for (let i = 1; i <= pdf.numPages && text.length < MAX_CHARS; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    text += content.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n";
  }
  return tidy(text);
}
