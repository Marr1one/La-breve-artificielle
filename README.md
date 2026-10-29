# La Brève Artificielle

Petite application Next.js + Supabase qui récupère les publications réglementées déposées auprès de l'AMF
(open data info-financière), sélectionne celles qui méritent un article, rédige des brèves avec un LLM
et contrôle que les chiffres des brèves figurent bien dans le document source.

- Application déployée : _à compléter_
- Repo : _à compléter_

## Lancer le projet

```bash
npm install
cp .env.example .env.local   # remplir Supabase + Anthropic
npm run dev                  # http://localhost:3000
```

1. Dans Supabase > SQL Editor, exécuter `supabase/schema.sql`.
2. Ouvrir `/redaction` et cliquer sur **Tout lancer** (ou les 3 étapes une par une).
3. La une (`/`) affiche les brèves, `/publications` la liste filtrable.

Déploiement : Vercel, mêmes variables d'environnement. Les routes `/api/*` peuvent être protégées par `ADMIN_SECRET`.

## Architecture : 3 étapes

```
API info-financière ──(1) ingest──▶ Supabase.publications ──(2) select──▶ publications.selected
                                                                              │
                         Supabase.articles ◀──(3) generate : PDF → texte → LLM → vérification
```

| Étape | Route | Code |
|---|---|---|
| 1. Récupérer et stocker | `POST /api/ingest?days=4` | `lib/amf/client.ts`, `lib/amf/mapper.ts`, `lib/db/publications.ts` |
| 2. Sélectionner | `POST /api/select?n=5` | `lib/selection/score.ts` |
| 3. Rédiger + vérifier | `POST /api/generate` | `lib/pdf/extract.ts`, `lib/llm/brief.ts`, `lib/verify/figures.ts` |

`lib/pipeline.ts` orchestre les trois étapes. Règle de lisibilité : 7 fonctions max par fichier, 40 lignes max par fonction.

## Choix techniques

- **Next.js (App Router)** : pages en Server Components (lecture directe en base, pas d'API intermédiaire), route handlers pour le pipeline.
- **Supabase (Postgres)** : accès uniquement côté serveur avec la clé service role ; RLS activé sans policy publique.
- **Le record brut de l'API est stocké en `jsonb` (`raw`)** : si le mapping d'un champ est faux, on corrige le mapper sans refaire d'appel API.
- **unpdf** pour extraire le texte des PDF, **Claude (Anthropic)** pour la rédaction.
- Pas de framework CSS : une feuille de style unique, typographie serif façon quotidien.

## Structure des données

Dataset `flux-amf-new-prod` (API Opendatasoft Explore v2.1). Une ligne = un **événement de publication**, pas des
données financières : identifiant (`uin_idt_uin`), date AMF (`uin_dat_amf`), société, ISIN, type et sous-type
d'information, titre, langue et **lien vers le document** (le plus souvent un PDF). Les chiffres sont donc dans le PDF,
pas dans l'API.

Imperfections rencontrées et traitement :
- `limit` plafonné à 100 → pagination ;
- publications bilingues (FR + EN, deux identifiants) → dédoublonnage à la sélection, préférence FR ;
- valeurs littérales `"NULL"` → converties en vrai `null` ;
- LEI souvent vide → l'ISIN sert d'identifiant société ;
- documents non lisibles (archives ESEF, PDF scannés) → brève marquée « non vérifiable ».

_À compléter avec tes observations sur les données réelles (la réponse de `/api/ingest` liste les noms de champs reçus)._

## Critère de sélection

Score éditorial explicable (`lib/selection/score.ts`), calculé sur type + sous-type + titre :

| Signal | Points |
|---|---|
| Offre publique (OPA/OPE, retrait obligatoire) | +100 |
| M&A (acquisition, cession, fusion) | +70 |
| Résultats / information financière | +60 |
| Révision des objectifs | +40 |
| Franchissement de seuil, opération de financement | +35 |
| Changement de dirigeants | +20 |
| Information privilégiée | +15 |
| Document source disponible / absent | +10 / −50 |
| Version française | +5 |

Les publications de routine (rachats d'actions, contrats de liquidité, droits de vote, honoraires…) sont exclues.
On retient les 5 meilleurs scores, **une seule publication par société**. La raison est stockée et affichée sous chaque brève.

## Contrôle de l'exactitude des chiffres

1. Le prompt impose de recopier les chiffres tels qu'écrits dans le document (pas de conversion ni de calcul).
2. Après génération, tous les nombres de la brève sont extraits et réduits à leurs chiffres
   (« 1 234,5 », « 1.234,5 » → `12345`), puis recherchés dans le texte du document source.
3. Statut affiché sur chaque brève : **vérifié** (tous retrouvés), **à vérifier** (liste des chiffres introuvables),
   **non vérifiable** (pas de texte source exploitable).

Limites : une reformulation (« 1,2 Md€ » vs « 1 200 M€ ») est signalée à tort ; une coïncidence de chiffres peut
donner un faux positif. Le contrôle ne vérifie pas le sens (un chiffre juste attribué au mauvais indicateur passe).

## 3 prompts clés

1. _À compléter_
2. _À compléter_
3. _À compléter_ (le prompt système de rédaction est dans `lib/llm/brief.ts`)

## Une erreur de l'IA détectée

_À compléter._

## Améliorations possibles

- Vérification sémantique : demander au LLM la phrase source de chaque chiffre et la contrôler (chiffre + indicateur).
- OCR pour les PDF scannés, lecture des rapports ESEF (XBRL) pour des chiffres structurés.
- Ingestion planifiée (cron Vercel / Supabase) et regénération à la demande.
- Pondération du score par la taille de la société (capitalisation, indice).
- Tests unitaires sur le mapper, le score et la vérification des chiffres.

## Temps passé

_À compléter._
