export type Publication = {
  id: string;
  company: string | null;
  isin: string | null;
  info_type: string | null;
  info_subtype: string | null;
  title: string | null;
  published_at: string | null;
  language: string | null;
  document_url: string | null;
  raw: Record<string, unknown>;
  score?: number | null;
  selection_reason?: string | null;
  selected?: boolean;
};

export type ScoredPublication = Publication & { score: number; selection_reason: string };

export type Brief = { headline: string; chapo: string; body: string };

export type VerificationStatus = "verifie" | "partiel" | "non_verifiable";

export type FigureCheck = { value: string; found: boolean };

export type Verification = {
  status: VerificationStatus;
  checks: FigureCheck[];
  note: string;
};

export type Article = Brief & {
  id: string;
  publication_id: string;
  status: VerificationStatus;
  verification: Verification;
  model: string | null;
  source_chars: number | null;
  created_at: string;
  publications: Publication | null;
};
