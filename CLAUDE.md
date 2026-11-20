# GonfForge — contexte projet

App web perso de suivi des entraînements, de la nutrition et de la progression sur le long terme, anciennement Operation10. Le projet n'est plus limité aux 10 mois de formation à Rennes.
Ce fichier sert à orienter rapidement toute nouvelle session Claude : **lis-le en premier**, puis explore le code si besoin.

**Version actuelle** : Vercel sur <https://operation10.vercel.app>, Supabase `Sport_du_gonf`, thème dark et portail protégé par mot de passe à conserver. Les identifiants techniques historiques restent inchangés pour préserver données, sessions et brouillons. Le `README.md` détaille l'installation et les précautions de déploiement.

## Stack

- **Frontend** : React 18 + TypeScript + Vite, TanStack Query v5, Axios, React Router v7, CSS custom (pas de Tailwind/MUI), icônes Tabler.
- **Backend** : NestJS 11 + TypeORM 0.3 + PostgreSQL, Swagger sur `/api/docs`, `ValidationPipe` global (whitelist + transform), DTOs class-validator.
- **Infra** : Vercel réunit frontend et API `/api` ; PostgreSQL est sur Supabase. Docker Compose reste disponible pour le développement local (`:3000`, `:5173`). Synchronisation du schéma uniquement hors production ; migrations explicites en production.

## Lancer

```
docker compose up --build
```
Front : http://localhost:5173 · API : http://localhost:3000/api · Swagger : /api/docs

## Conventions

- Un module backend = `X.entity.ts` / `X.dto.ts` / `X.service.ts` / `X.controller.ts` / `X.module.ts`. PK uuid, enums TypeORM.
- Photos nutrition : `fetch` brut sur `https://api.groq.com/openai/v1/chat/completions`, modèle `qwen/qwen3.8-27b`, clé serveur `GROQ_API_KEY`, mode JSON. Compte Groq Free à conserver ; quota épuisé = erreur 429 explicite, sans retry automatique ni repli payant. Claude reste réservé aux révisions historiques (`ANTHROPIC_API_KEY`).
- Front : pages dans `frontend/src/pages/`, requêtes via `services/api.ts` (baseURL suit `window.location.hostname` → accès mobile LAN auto), thème sombre navy + accent vert dans `styles/globals.css`.
- Dates : helper local `YYYY-MM-DD` (jamais `.toISOString()` UTC pour les dates du jour).

## Sections

### Entraînement (`/`) — TrainingPage
- Onglets **Programme, Ma semaine, Historique, Bibliothèque**, dans le même espace. Les anciens modèles restent accessibles et peuvent rejoindre le programme courant ; le vocabulaire visible est « séance », pas « contrat ».
- `TrainingProgram` persiste la sélection, l'ordre et les objectifs hebdomadaires (4 minimum, repère haut 7 par défaut). Les séances restent indépendantes des jours de la semaine ; `dayOfWeek` est conservé pour compatibilité.
- `GET /sport/program` renvoie `{ weeklyMinimum, weeklyMaximum, sessions, modules, library }`. Les quatre références sont un démarrage par défaut, pas une limite fixe.
- Toutes les séances réalisées, y compris importées, comptent dans la semaine. La couverture du programme est distincte : `utils/trainingProgress.ts` utilise le modèle lié ou, en l'absence de lien, des correspondances non ambiguës de type et de nom. Pas de crédit en double.
- **Modules** : un module seul compte comme une séance ; ajouté à une séance, il est sauvegardé dans ses exercices et ne compte pas deux fois. Les métadonnées `activityType`, `moduleId`, `moduleName` préservent les activités mixtes. Des modules seuls ne valident pas la séance principale.

### Séance en cours (`/seance`) — WorkoutPage
- Charges de référence non validées par défaut ; seules les séries et durées confirmées alimentent l'enregistrement et les performances.
- Adaptations ponctuelles et modules sans modifier le modèle du programme. Une seule requête enregistre toute la séance.
- Brouillon local, repris après rechargement ; conserver la clé historique de stockage et la compatibilité des anciens brouillons.

### Calendrier — SportPage
- Intégré dans **Ma semaine** (`/?view=week`) ; `/sport` redirige vers cet onglet et `/archives` vers `/?view=library`.
- Navigation hebdomadaire, grille 7 jours, détail/édition des séances et rattachement au programme. L'ajout rétrospectif ne copie pas les performances de référence comme si elles avaient été faites.
- Export PDF via jsPDF chargé en CDN, libellé « Semaine N · du lundi… au dimanche… ».

### Nutrition (`/nutrition`) — NutritionPage
- Onglets **Journal, Favoris, Tendances** : journal par moment, ajout/édition des entrées, tendances hebdomadaires et repères calories/protéines facultatifs.
- **Recherche aliments** : Open Food Facts via `cgi/search.pl` plein-texte (sous-domaine `fr` puis `world`) + garde-fou de pertinence. ⚠️ NE PAS repasser sur `/api/v2/search?search_terms=` qui ignore la requête.
- **Analyse photo IA** (Groq Vision) : plateau multi-aliments ou emballage ; vérifier chaque estimation avant ajout.
- **Réutilisation** : favoris/combos (`meal_favorites`), copie de la veille (`/nutrition/duplicate`) et aliments récents (`/nutrition/recent`). Les portions et détails connus sont conservés.
- Les macros inconnues sont nulles, jamais assimilées à zéro ; les totaux incomplets sont signalés et les moyennes excluent les jours incomplets pour la valeur concernée. Les anciennes valeurs restent inchangées.
- La migration additive `NutritionJournal1794524400000` est requise avant déploiement ; ne pas l'appliquer à la production sans vérification de cible, sauvegarde et autorisation explicite.
- Le journal privilégie les protéines, avec calories/lipides secondaires et glucides dépliables. Photos déjeuner/dîner : estimation corrigible avec note facultative, puis confirmation groupée ; les images ne sont pas conservées.
- **Routine** : configuration des valeurs réelles d'un shaker dans `nutrition_settings.shaker`, deux prises quotidiennes idempotentes (`meals.routineSlot`), snapshots conservés. La copie de la veille exclut les prises de routine. Créatine séparée dans `nutrition_routine_days` : total par date, aucune macro ni dose prescrite.
- Migration additive `NutritionRoutine1794855600000` nécessaire, sans réécriture historique ; pas d'application en production sans autorisation explicite. Tests : `npm run test:nutrition` dans `backend`. Analyse photo : clé serveur `GROQ_API_KEY` requise, erreur 503 explicite si absente.

### Révisions — fonctionnalités historiques non exposées
- Entités `Subject` / `Sheet` (markdown) / `Flashcard` (SM-2 : `repetitions`, `easeFactor`, `intervalDays`, `dueDate`).
- Onglets : **Fiches** (rendu markdown maison, thème papier), **Réviser** (flashcards : on tape la réponse → vérif locale, puis Claude en renfort si douteux via `/flashcards/:id/check` ; notation SM-2), **Entraînement** (affiché si `subject.trainerKey` — ex. `reseau` → composant `ReseauTrainer` : @réseau/broadcast, subnetting, binaire).
- Bouton **Générer** (coin haut-droite, modale) : Claude crée fiche + cartes. Cartes aussi générables depuis une fiche, ou régénérables pour une matière.
- Seed idempotent : matières Linux & Réseau + fiches (rafraîchies à chaque démarrage) dans `revision.seed.ts` / `revision-seed.service.ts`.

### Stats (`/stats`) — StatsPage
Chiffres clés, répartition par groupe musculaire, histogramme 8 semaines, graphe progression des charges.

## Points importants / pièges

- En production, migrations et seeds restent désactivés par défaut. Ne pas les activer ou appliquer sur Supabase sans vérification de la cible et autorisation explicite. Le programme flexible nécessite la migration additive `FlexibleTrainingProgram1794434400000` avant son déploiement.
- Portail privé par mot de passe avec sessions serveur ; conserver cookies HttpOnly, SameSite Strict et expiration. Ne pas renommer les identifiants techniques historiques avec la marque.
- Tests : `npm test` dans `frontend`, `npm run test:auth` et `npm run test:sport` dans `backend`. Les tests PostgreSQL exigent une base locale dédiée `operation10_sport_test`, jamais la production.
- Production accessible sur mobile via l'URL Vercel, sans dépendre du PC. En développement, accès LAN possible au frontend sur `:5173` ; le client utilise le même hostname pour l'API sur `:3000`.
- Secrets uniquement dans l'environnement ; `.env` est ignoré. `GROQ_API_KEY` est facultative hors photos ; `ANTHROPIC_API_KEY` facultative hors révisions IA historiques.
