# Operation10

Application personnelle de suivi des entraînements et de la nutrition.

L'accueil est l'espace Entraînement : quatre séances, un accès direct à la séance en cours et un historique. La navigation propose Entraînement, Nutrition et Progression, avec une barre inférieure sur mobile. Les anciens contrats restent accessibles depuis le menu et l'espace historique, sans encombrer le programme principal. Révisions et les tâches ne sont plus exposées ; leurs données restent conservées.

## Programme et séries réalisées

Le programme de quatre jours est affiché directement : aucun import n'est demandé. `GET /sport/program` lit les quatre séances en réutilisant les modèles déjà importés portant les mêmes noms. `POST /sport/program/:key/prepare` crée uniquement le modèle manquant, dans une transaction sérialisée avec les anciens imports. Répéter cette préparation ne crée pas de doublon. `PATCH /sport/program/:key` permet de modifier les exercices et charges tout en préservant les identifiants des exercices existants. Aucun ancien contrat ni historique n'est supprimé.

Une séance s'ouvre avec les charges de référence, mais aucune série n'est considérée comme réalisée avant sa validation explicite. La saisie se fait exercice par exercice, avec rappel de dernière performance, minuteur de récupération et bilan avant enregistrement. Les finishers chronométrés ont leur propre validation. Une seule requête enregistre la séance et les efforts validés ; les séries non cochées et exercices non réalisés ne sont pas envoyés. Les anciennes séances conservent leur format et restent visibles dans l'historique. La charge maximale réalisée alimente les statistiques existantes. Le rappel de dernière performance utilise l'identifiant de l'exercice, ou son nom pour les anciennes séances sans identifiant.

Les saisies, y compris les séries encore non validées, sont sauvegardées dans le stockage local de cet appareil et reprises après rechargement. Une erreur de stockage est affichée explicitement. Les brouillons ne sont pas synchronisés entre appareils et sont supprimés à la déconnexion.
Le programme de référence est fourni par une route API authentifiée, et non inclus dans les fichiers JavaScript publics.

Les tests `npm run test:sport` valident les séries imbriquées. Pour inclure les tests PostgreSQL, fournir `SPORT_TEST_DATABASE_URL` vers une base locale dédiée et vide nommée `operation10_sport_test`. Ces tests appliquent les migrations et vérifient les annulations transactionnelles ; ils ne doivent pas cibler les données de l'application.

## Développement local

1. Copier `.env.example` vers `.env`.
2. Créer le hash du mot de passe propriétaire depuis un terminal interactif :

   ```powershell
   cd backend
   node scripts/hash-password.js
   ```

   Ajouter la valeur `APP_PASSWORD_HASH=...` affichée dans le fichier `.env` à la racine.
3. Démarrer PostgreSQL avec `docker compose up -d postgres`. L'URL `DATABASE_URL` de `.env` est utilisée par le backend lancé localement.
4. Lancer `npm install` et `npm run start:dev` dans `backend`.
5. Dans un second terminal, lancer `npm install` puis `npm run dev` dans `frontend`.
6. Ouvrir <http://localhost:5173>.

En développement, TypeORM synchronise le schéma automatiquement. En production, une migration versionnée crée les tables au premier déploiement.
Les migrations suivantes sont appliquées automatiquement avant le démarrage, y compris sur une base déjà initialisée. La migration des contrats hebdomadaires ajoute `weeklyTarget` avec une valeur par défaut de 1 sans supprimer les contrats existants.

## Déploiement personnel gratuit

Le dépôt contient un `render.yaml` et un Dockerfile multi-étapes : l'interface et l'API sont servies par **un seul service Render**, sur la même origine. Cela évite de partager les cookies de session entre domaines. Render Free peut mettre le service en veille après une période d'inactivité ; le premier chargement suivant peut donc prendre un moment. Les quotas et conditions des offres gratuites peuvent changer.

1. Créer une base PostgreSQL gratuite sur [Neon](https://neon.tech/), de préférence dans la même région que le service Render. Copier son URL de connexion avec SSL.
2. Créer un compte Render et importer ce dépôt via le Blueprint `render.yaml`.
3. Dans les variables secrètes du service Render, renseigner `DATABASE_URL` (URL Neon) et `APP_PASSWORD_HASH` (généré ci-dessus). `APP_ORIGIN` doit correspondre exactement à l'URL HTTPS publique du service.
4. Laisser le premier déploiement terminer : la migration initialise les tables et les tâches/programmes par défaut.
5. Vérifier `/api/auth/health`, puis se connecter à l'URL Render avec le mot de passe propriétaire. Il n'y a ni inscription publique ni compte préconfiguré.

L'API d'analyse de repas par photo nécessite une clé Anthropic et entraîne une facturation à l'usage ; cette fonction est facultative. Sans clé, les autres fonctions restent disponibles.

## Sécurité et données

- Toutes les routes API de données exigent une session propriétaire. Le cookie est `HttpOnly`, `SameSite=Strict`, sécurisé en HTTPS et expirant après sept jours ; le serveur ne stocke qu'un hash du jeton de session.
- Le mot de passe est dérivé avec scrypt et le login est limité en débit. Changer `APP_PASSWORD_HASH` puis supprimer la table `auth_sessions` révoque toutes les sessions.
- Garder les mots de passe et URLs de base en variables d'environnement, jamais dans Git. `.env` est ignoré par Git.
- Neon Free n'est pas une sauvegarde : exporter régulièrement les données PostgreSQL et vérifier les limites/règles de rétention en vigueur chez le fournisseur.
- L'application stocke des données de santé personnelle (sport et alimentation). Utiliser un mot de passe unique, ne pas partager le lien, et ne téléverser que des photos que l'on accepte de transmettre à l'API Anthropic.
