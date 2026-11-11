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

En développement, TypeORM synchronise le schéma automatiquement. En production, `RUN_MIGRATIONS=true` autorise l'application des migrations au démarrage ; par défaut, elles restent désactivées. `RUN_STARTUP_SEEDS=true` autorise de même les seeds de démarrage en production. Ne les activer qu'après avoir vérifié la cible et sauvegardé la base.

## Déploiement personnel gratuit

La configuration racine `vercel.json` réunit le frontend Vite et l’API NestJS dans **un seul projet Vercel** : l’API reste sous `/api` et partage la même origine que le cookie de session. Le backend s’exécute à la demande, sans serveur Render à maintenir éveillé. Les limites gratuites des fournisseurs peuvent évoluer.

Pour préparer le projet, sélectionner le dépôt à la racine (ne pas choisir `frontend/` ou `backend/` comme Root Directory). Les commandes d’installation/build, la sortie `frontend/dist`, les fonctions API et la région Paris (`cdg1`) sont déclarées dans `vercel.json`.

Le fonctionnement nécessite `NODE_ENV=production`, `APP_ORIGIN` (origine HTTPS exacte du projet) et les variables backend `DATABASE_URL` et `APP_PASSWORD_HASH`. **Ne pas connecter ni déployer sur une base contenant des données tant que les migrations et leur cible n'ont pas été explicitement vérifiées et autorisées.** En production, migrations et seeds sont désactivés par défaut ; `RUN_MIGRATIONS=true` et `RUN_STARTUP_SEEDS=true` sont des opt-ins explicites, à ne pas activer sans autorisation. `ANTHROPIC_API_KEY` est facultative pour l’analyse de repas par photo.

Le projet `operation10` est déployé sur <https://operation10.vercel.app>, avec une base Supabase distincte. Aucun transfert depuis Neon n'est nécessaire. La connexion PostgreSQL utilise un compte dédié et `DATABASE_CA_CERT` pour vérifier le certificat TLS. Les tables applicatives ont RLS activé et les rôles publics `anon`/`authenticated` n'y ont pas accès ; seul le backend authentifié accède aux données.

Pour configurer le mot de passe du portail depuis un terminal interactif à la racine du dépôt, exécuter `node backend/scripts/hash-password.js --vercel`. Le mot de passe reste masqué et seul son hash est envoyé à la variable secrète Vercel. Redéployer après un changement de variable.

Les fonctions Vercel limitent les requêtes à 4,5 Mo. L’analyse photo compresse automatiquement les images trop volumineuses avant envoi. Elle nécessite `ANTHROPIC_API_KEY` et peut entraîner une facturation ; sans cette clé, les autres fonctions restent disponibles.

## Sécurité et données

- Toutes les routes API de données exigent une session propriétaire. Le cookie est `HttpOnly`, `SameSite=Strict`, sécurisé en HTTPS et expirant après sept jours ; le serveur ne stocke qu'un hash du jeton de session.
- Le mot de passe est dérivé avec scrypt et le login est limité en débit. Changer `APP_PASSWORD_HASH` puis supprimer la table `auth_sessions` révoque toutes les sessions.
- Garder les mots de passe et URLs de base en variables d'environnement, jamais dans Git. `.env` est ignoré par Git.
- Neon Free n'est pas une sauvegarde : exporter régulièrement les données PostgreSQL et vérifier les limites/règles de rétention en vigueur chez le fournisseur.
- L'application stocke des données de santé personnelle (sport et alimentation). Utiliser un mot de passe unique, ne pas partager le lien, et ne téléverser que des photos que l'on accepte de transmettre à l'API Anthropic.
