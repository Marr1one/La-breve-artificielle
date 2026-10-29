# La Brève Artificielle

Un site d'actualité qui rédige automatiquement **5 brèves** à partir des publications que les sociétés
cotées déposent auprès de l'AMF (Autorité des marchés financiers).

Le principe :
1. on récupère toutes les publications récentes depuis l'API publique info-financiere.gouv.fr ;
2. on choisit les 5 plus intéressantes ;
3. une IA (Gemini) rédige une brève pour chacune, puis on vérifie que ses chiffres sont bien dans le document source.

- Application déployée : https://la-breve-artificielle.vercel.app/
- Repo : (https://github.com/Marr1one/La-breve-artificielle)

## Lancer le projet 

```bash
npm install
cp .env.example .env    # remplir Supabase + Gemini
npm run dev             # http://localhost:3000
```

1. Dans Supabase > SQL Editor, exécuter `supabase/schema.sql` (crée les tables).
2. Sur la page d'accueil, cliquer sur **Relancer la rédaction** : les 3 étapes s'enchaînent avec une barre de progression.
3. La une affiche les 5 brèves, la page **Publications** liste toutes les publications stockées.

Si `ADMIN_SECRET` est rempli dans `.env`, il faut le saisir dans **Réglages** pour lancer la rédaction.

## Choix techniques

- **Supabase pour la base de données** : une base Postgres prête à l'emploi et gratuite, sans serveur à gérer.
  Deux tables : `publications` (tout ce que renvoie l'API) et `articles` (les brèves rédigées).
- **Next.js** : le site et les routes API sont dans le même projet, ce qui simplifie le code et le déploiement.
- **4 à 5 publications choisies parmi toutes** : l'API renvoie environ 300 publications sur 4 jours, dont une grande
  partie sans intérêt pour un lecteur. On les stocke toutes, mais on ne rédige que les 5 meilleures.
- **Des brèves de 80 à 120 mots** : un texte plus court se rédige plus vite et reste dans l'esprit d'une brève.
- **Une IA rapide plutôt qu'une IA « puissante »** : Gemini Flash-Lite, avec la phase de réflexion désactivée.
  Une brève se rédige en 2 à 3 secondes au lieu de plusieurs dizaines, et les 5 sont rédigées en parallèle
  (environ 10 secondes au total).
- **On envoie à l'IA le texte du PDF, pas le PDF entier** : le code extrait lui-même le texte des premières pages
  (12 000 caractères maximum). Le prompt est plus court, donc la réponse est plus rapide.
- **Réponse de l'IA au format JSON imposé** (titre, chapô, corps) : pas de texte parasite à nettoyer.
- **La réponse brute de l'API est conservée** en base : si un champ a été mal interprété, on corrige le code sans
  rappeler l'API.

## Comment j’ai compris la structure des données

L’API renvoie du JSON où chaque record correspond à une publication réglementée : date, société, ISIN, type
d’information, titre, langue et lien vers le document source. En revanche, aucun chiffre financier n’est dans le
JSON : les chiffres se trouvent uniquement dans le document lié, le plus souvent un PDF.

J’ai donc transformé chaque record en ligne propre dans Supabase pour pouvoir filtrer et trier, puis extrait le texte
des PDF pour rédiger les brèves et vérifier leurs chiffres.

Au passage, j’ai traité quelques imperfections : doublons FR/EN, valeurs "NULL", publications de routine sans intérêt
éditorial.

## Critère de sélection des publications

J'ai mis les **grandes entreprises (CAC 40) en priorité**, puis j'ai construit un **système de points** : chaque
publication reçoit des points selon son sujet (lu dans son type et son titre), et les 5 meilleurs scores sont retenus.

| Critère | Points |
|---|---|
| **Entreprise du CAC 40** | **+150** |
| Fusion, acquisition, cession | +100 |
| Offre publique (OPA, OPE, retrait obligatoire) | +90 |
| Résultats, chiffre d'affaires | +80 |
| Nomination, directeur général, gouvernance | +45 |
| Objectifs, perspectives | +40 |
| Augmentation de capital, émission obligataire | +35 |
| Information privilégiée | +15 |
| Franchissement de seuil | +10 |
| **PDF source disponible** / absent | **+10 / −50** |
| Publication en français | +5 |

Règles en plus :
- les publications de **routine** sont exclues, même pour le CAC 40 (rachats d'actions, nombre de droits de vote, contrats de liquidité…) ;
- **une seule brève par société**, pour avoir une une variée ;
- la raison du choix est enregistrée avec chaque publication (par exemple « valeur du CAC 40, résultats financiers »).

Le code est dans `lib/selection/score.ts` : les points se modifient en changeant un seul nombre.

## Contrôle de l'exactitude des chiffres

Pour chacune des 5 publications choisies :
1. on télécharge le PDF, s'il existe, et on en extrait le texte ;
2. l'IA rédige la brève avec la consigne de recopier les chiffres **exactement** comme dans le document (pas d'arrondi, pas de calcul) ;
3. on relève **tous les nombres de la brève** et on vérifie qu'ils sont **présents dans le texte du PDF** ;
4. chaque brève affiche un badge :
   - **Chiffres vérifiés** : tous les nombres ont été retrouvés dans le PDF ;
   - **Chiffres à vérifier** : au moins un nombre est introuvable (la liste est affichée sur la page de la brève) ;
   - **Non vérifiable** : pas de PDF lisible.

Ce contrôle ne fait pas confiance à l'IA : il est fait par le code, après la rédaction.


## 3 prompts clés

Les prompts sont recopiés tels que je les ai écrits à l'IA qui m'a aidé à coder.

### 1. L'introduction : présenter le projet et poser les contraintes

> l'objectif est pour moi de le faire avec la stack next react supabase, d'avoir un code facilement reviewable, donc
> max 7 fonctions par fichiers et 40 lignes par fonctions si possible (avec possibilité de faire 70 max si vraiment
> c'est une trop grosse contrainte). donc j'ai découpé le projet en 3 grandes étapes, 1 - fetch depuis l'api
> (https://www.info-financiere.gouv.fr/api/explore/v2.0) les 3, 4 précédents jours des données financières et les
> récupérer dans une db supabase avec des colonnes comme société, type d'info, data. 2 - trier parmi les données
> récupérées 4 ou 5 publications les plus importantes (pour cela il va falloir que je regarde ce qu'il y a dans les
> données récupérées, donc dis-moi la structure des données récupérées) 3 - après avoir trié sortir le résultat voulu
> 4 5 publications, les envoyer à une llm et faire l'article, mais avant de générer l'article, de vérifier ce que
> produit la llm, les chiffres doivent être en adéquation avec ce qu'il y a dans la database. Ensuite pour ce qui est
> l'appli, j'aimerais qu'elle ressemble à une sorte de Le Monde, Le Figaro etc, des médias comme des journaux en ligne.

**Pourquoi il est clé** : il fixe tout le cadre dès le départ. La stack, les règles pour que le code reste facile à
relire, le découpage en 3 étapes (récupérer, trier, rédiger et vérifier) et le style « journal en ligne » du site.
Toute la suite du projet suit ce découpage.

### 2. Refuser une solution payante

> attends, l'étape 2 me demande de payer, c'est un peu overkill pour un test technique, y'a pas moyen d'utiliser mon
> propre compte et de faire des prompts afin de ne pas payer ?

**Pourquoi il est clé** : l'IA avait choisi un modèle payant (Claude, d'Anthropic). Ce prompt l'a fait passer à
Gemini, qui a une offre gratuite. C'est le début de l'erreur décrite plus bas.

### 3. Comprendre et choisir les critères de sélection

> quelles sont les critères que tu as choisis pour trier et choisir les 5 publications, et propose d'autres critères.
> et grâce à ces choix je vais pouvoir, si les autres critères que tu me proposes me plaisent, changer les critères

**Pourquoi il est clé** : au lieu de garder les critères de l'IA sans les comprendre, je lui ai demandé de les
expliquer et de proposer des alternatives. J'ai ensuite fait mes propres choix : le CAC 40 en priorité, les
fusions-acquisitions avant les offres publiques, les résultats dans le top 3, plus de poids pour les nominations et
moins pour les franchissements de seuil. En appliquant ces choix, on a aussi trouvé de fausses « acquisitions » qui
étaient en fait des rachats d'actions.

## Une erreur de l'IA détectée

L'IA qui m'a aidé à coder a fait un mauvais choix de modèle, en deux temps :

1. **Elle avait d'abord prévu un modèle Anthropic (Claude), qui est payant**, alors que le projet devait pouvoir
   tourner gratuitement. Je suis passé à Gemini, qui a une offre gratuite.
2. **Elle m'a ensuite dirigé vers un modèle Gemini trop lourd pour ce genre de tâche** (Gemini Flash, avec sa phase
   de réflexion activée). Pour écrire une brève de 100 mots, c'était bien trop puissant : un seul appel pouvait
   prendre plus de 3 minutes, et le modèle était souvent saturé (erreurs 503).

Correction : un modèle léger (Gemini Flash-Lite) avec la réflexion désactivée. Une brève se rédige maintenant en
2 à 3 secondes, et les 5 brèves en une dizaine de secondes, avec des chiffres toujours vérifiés.

## Idées d'amélioration (avec plus de temps)

- **Mieux filtrer par domaine** : une page par rubrique (Résultats, Acquisitions, Nominations…), pour que le lecteur
  aille directement à ce qui l'intéresse.
- **Des articles de meilleure qualité grâce à plusieurs relectures par plusieurs agents IA** : un agent rédige, un
  autre vérifie les faits, un troisième corrige le style. Avec seulement 5 brèves par jour, le coût et le temps restent
  raisonnables.
- **Une meilleure compréhension des chiffres** : aujourd'hui, un même montant écrit de deux façons différentes
  (« 1,2 Md€ » dans la brève, « 1 200 M€ » dans le PDF) est signalé à tort comme introuvable. Le contrôle devrait
  reconnaître les unités (millions, milliards, %) pour comparer les valeurs et non seulement les chiffres écrits.

## Temps passé

Environ **2 h à 2 h 30** pour l'ensemble du projet : réflexion personnelle sur le sujet, choix techniques,
développement et tests.
