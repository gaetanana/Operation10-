# Operation10 — contexte projet

App web perso de Gaëtan pour tracker ses 10 mois de formation à Rennes.
Ce fichier sert à orienter rapidement toute nouvelle session Claude : **lis-le en premier**, puis explore le code si besoin.

## Stack

- **Frontend** : React 18 + TypeScript + Vite, TanStack Query v5, Axios, React Router v6, CSS custom (pas de Tailwind/MUI), icônes Tabler.
- **Backend** : NestJS 10 + TypeORM 0.3 + PostgreSQL 16, Swagger sur `/api/docs`, `ValidationPipe` global (whitelist + transform), DTOs class-validator.
- **Infra** : Docker Compose (postgres, backend `:3000`, frontend `:5173`). `synchronize: true` (pas de migrations — le schéma se crée/évolue au démarrage).

## Lancer

```
docker compose up --build
```
Front : http://localhost:5173 · API : http://localhost:3000/api · Swagger : /api/docs

## Conventions

- Un module backend = `X.entity.ts` / `X.dto.ts` / `X.service.ts` / `X.controller.ts` / `X.module.ts`. PK uuid, enums TypeORM.
- Intégration Claude (Vision + texte) : `fetch` brut sur `https://api.anthropic.com/v1/messages`, modèle `claude-haiku-4-5-20251001`, clé `ANTHROPIC_API_KEY` (dans `.env`), extraction JSON par regex `\{[\s\S]*\}`.
- Front : pages dans `frontend/src/pages/`, requêtes via `services/api.ts` (baseURL suit `window.location.hostname` → accès mobile LAN auto), thème sombre navy + accent vert dans `styles/globals.css`.
- Dates : helper local `YYYY-MM-DD` (jamais `.toISOString()` UTC pour les dates du jour).

## Sections

### Accueil (`/`) — DashboardPage
Tableau de bord : contrat sport de la semaine, macros nutrition du jour, cartes de révision dues, raccourcis. (La page Todo a été retirée — backend todo conservé mais non utilisé.)

### Séance du jour (`/seance`) — SeanceDuJourPage
Onglet tactile « préparer puis valider » : choisir un contrat (importe ses exercices) ou un type libre, adapter les exercices, puis « Valider » crée la séance du jour. Réutilise `ExForm`/`ExerciseRow`/`TYPE_CONFIG` exportés depuis `SportPage`.

### Sport (`/sport`) — SportPage
- **Contrats = objectif ×N/semaine** (`weeklyTarget`), plus de jour figé. Le champ `dayOfWeek` existe encore (déprécié).
- **Suivi souple** : une séance est attribuée au bon contrat par `templateId`, sinon type unique, sinon correspondance de nom (gère 2 contrats de même type, ex. « EMOM Pompes » vs « EMOM Tractions »).
- **Vue semaine** : navigation ◀▶, grille 7 jours, clic sur une séance → détail/édition, `+` par jour pour logger.
- **Export PDF** : vrai fichier via jsPDF chargé en CDN (pas d'impression navigateur). Libellé « Semaine N · du lundi… au dimanche… ».

### Nutrition (`/nutrition`) — NutritionPage
- **Recherche aliments** : Open Food Facts via `cgi/search.pl` plein-texte (sous-domaine `fr` puis `world`) + garde-fou de pertinence. ⚠️ NE PAS repasser sur `/api/v2/search?search_terms=` qui ignore la requête.
- **Analyse photo IA** (Claude Vision) : plateau multi-aliments ou emballage.
- **Ajout rapide** : favoris/combos (`meal_favorites`, créés depuis un repas ★ ou la journée entière, appliqués en 1 clic), « Répéter hier » (`/nutrition/duplicate`), aliments récents (`/nutrition/recent`).

### Révisions (`/revision`) — RevisionPage
- Entités `Subject` / `Sheet` (markdown) / `Flashcard` (SM-2 : `repetitions`, `easeFactor`, `intervalDays`, `dueDate`).
- Onglets : **Fiches** (rendu markdown maison, thème papier), **Réviser** (flashcards : on tape la réponse → vérif locale, puis Claude en renfort si douteux via `/flashcards/:id/check` ; notation SM-2), **Entraînement** (affiché si `subject.trainerKey` — ex. `reseau` → composant `ReseauTrainer` : @réseau/broadcast, subnetting, binaire).
- Bouton **Générer** (coin haut-droite, modale) : Claude crée fiche + cartes. Cartes aussi générables depuis une fiche, ou régénérables pour une matière.
- Seed idempotent : matières Linux & Réseau + fiches (rafraîchies à chaque démarrage) dans `revision.seed.ts` / `revision-seed.service.ts`.

### Stats (`/stats`) — StatsPage
Chiffres clés, répartition par groupe musculaire, histogramme 8 semaines, graphe progression des charges.

## Points importants / pièges

- **`synchronize: true`** actif — ne pas passer en migrations sans prévenir.
- **Pas d'authentification** (JWT installé, non branché). Ne PAS exposer publiquement sans ajouter un mot de passe.
- **Pas de tests.**
- Accès mobile : PC allumé + Docker, même Wi-Fi, `http://<IP_LOCALE>:5173`. CORS ouvert (`origin: true`) pour le réseau local. L'app n'est dispo que quand le PC tourne (hébergement cloud / serveur maison = piste future).
- Clé `ANTHROPIC_API_KEY` en clair dans `.env` versionné — à révoquer si le repo devient public.
