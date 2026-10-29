import type { Brief, Publication } from "../types";

/**
 * Rédaction des brèves via l'API Gemini (niveau gratuit de Google AI Studio).
 * Le provider LLM est isolé dans ce fichier : changer de modèle ne touche que ce module.
 */
export const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Prompt court et directif : moins de tokens à lire, aucune réflexion demandée, sortie bornée.
const SYSTEM = `Journaliste Marchés d'un quotidien économique français. Rédige une brève à partir du document AMF fourni.
- Uniquement les faits du document ; rien d'inventé ni d'extrapolé.
- Chiffres recopiés à l'identique (ni conversion, ni arrondi, ni calcul) ; aucun chiffre si le document n'en contient pas.
- Va à l'essentiel : qui, quoi, combien, quand. Ignore mentions légales et avertissements.
- headline : 12 mots max, exact. chapo : 1 phrase. body : 80 à 120 mots, neutre, au présent.`;

// Sortie structurée : Gemini renvoie directement le JSON attendu, sans texte à nettoyer.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: { headline: { type: "STRING" }, chapo: { type: "STRING" }, body: { type: "STRING" } },
  required: ["headline", "chapo", "body"],
  propertyOrdering: ["headline", "chapo", "body"],
};

// "minimal" coupe la phase de réflexion, principale source de latence (les modèles Flash non-lite exigent "low").
const THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL ?? "minimal";
// Un appel répond en ~2 s ; au-delà, la requête est coincée dans la file du niveau gratuit : on retente une fois.
const TIMEOUT_MS = 20_000;
const RETRIES = 1;

const METADATA_ONLY =
  "AUCUN document lisible n'est disponible : rédige une brève très courte à partir des seules métadonnées, SANS AUCUN chiffre.";

function buildUserPrompt(p: Publication, docText: string): string {
  return [
    `Société : ${p.company ?? "inconnue"} (ISIN ${p.isin ?? "n/c"})`,
    `Type d'information : ${p.info_type ?? "n/c"}${p.info_subtype ? ` / ${p.info_subtype}` : ""}`,
    `Titre de la publication : ${p.title ?? "n/c"}`,
    `Date de publication : ${p.published_at ?? "n/c"}`,
    "",
    docText ? `<document>\n${docText}\n</document>` : METADATA_ONLY,
  ].join("\n");
}

/** Extrait l'objet JSON de la réponse (tolère un éventuel texte ou bloc ``` autour). */
function parseBrief(raw: string): Brief {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Réponse du LLM sans JSON");
  const json = JSON.parse(raw.slice(start, end + 1)) as Partial<Brief>;
  if (!json.headline || !json.body) throw new Error("JSON du LLM incomplet (headline/body)");
  return { headline: json.headline.trim(), chapo: (json.chapo ?? "").trim(), body: json.body.trim() };
}

type GeminiResponse = { candidates?: { content?: { parts?: { text?: string }[] } }[] };

async function callGemini(userPrompt: string, attempt = 0): Promise<string> {
  try {
    return await requestGemini(userPrompt);
  } catch (e) {
    const transient = (e as Error).name === "TimeoutError" || /API Gemini (429|500|503)/.test((e as Error).message);
    if (!transient || attempt >= RETRIES) throw e;
    return callGemini(userPrompt, attempt + 1);
  }
}

async function requestGemini(userPrompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Variable GEMINI_API_KEY manquante (voir .env.example).");
  const res = await fetch(`${API_URL}/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: { thinkingLevel: THINKING_LEVEL },
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`API Gemini ${res.status} : ${await res.text()}`);
  const data = (await res.json()) as GeminiResponse;
  return (data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
}

export async function generateBrief(p: Publication, docText: string): Promise<Brief> {
  return parseBrief(await callGemini(buildUserPrompt(p, docText)));
}