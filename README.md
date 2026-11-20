# GonfForge

Application personnelle de suivi des entraînements, de la nutrition et de la progression sur le long terme, sans limite de durée.

Anciennement Operation10, l'application conserve son thème dark et son portail protégé par mot de passe. Le changement de nom ne modifie ni les données ni les identifiants techniques historiques : cookies de session, stockage des brouillons, verrous d'import et configuration de base restent compatibles.

L'accueil est l'espace Entraînement : **Programme, Ma semaine, Historique et Bibliothèque** réunissent les séances prévues et réalisées. Les anciens modèles sont conservés dans la bibliothèque et peuvent rejoindre le programme courant ou devenir des modules. La navigation propose Entraînement, Nutrition et Progression, avec une barre inférieure sur mobile. Révisions et les tâches ne sont plus exposées ; leurs données restent conservées.

## Installation sur mobile

Sur Android, ouvrir GonfForge dans Chrome puis choisir **Installer l'application** ou **Ajouter à l'écran d'accueil** dans le menu. Sur iPhone, ouvrir le site dans Safari puis choisir **Partager → Sur l'écran d'accueil**. L'application s'ouvre dans sa propre fenêtre et conserve le portail protégé par mot de passe.

Une connexion Internet reste nécessaire : aucune donnée de santé ni réponse API n'est mise en cache pour un usage hors ligne. Les brouillons de séance restent enregistrés localement comme dans le navigateur.

## Programme et séries réalisées

Le programme courant est flexible : aucune séance n'est imposée à un jour précis. La fourchette hebdomadaire est configurable, avec **4 séances minimum et 7 comme repère haut** par défaut ; elle ne bloque pas l'enregistrement d'une activité supplémentaire. On peut créer, renommer, modifier, réordonner ou retirer des séances du programme, sans supprimer leurs modèles ni leur historique. Les quatre séances de référence servent uniquement de point de départ.

Le compteur hebdomadaire inclut toutes les séances réellement enregistrées, **y compris les imports**. Un second indicateur suit la couverture des séances du programme et de leurs fréquences hebdomadaires. L'attribution utilise le modèle explicitement associé ; sans modèle lié, elle utilise une correspondance non ambiguë de type et de nom. Une séance ne crédite jamais deux modèles et un module autonome ne valide pas une séance principale portant un nom similaire. Le rattachement d'une ancienne séance peut être corrigé depuis son détail dans l'historique ou le calendrier.

Les **modules** sont des modèles réutilisables : EMOM, course, circuit, musculation, etc. Un module réalisé seul compte comme une séance. Un module ajouté à une autre séance reste un groupe d'exercices dans le même enregistrement et ne compte pas une deuxième fois. Si seuls les modules sont validés, l'activité compte dans la semaine mais ne valide pas la séance principale du programme. Nom, type, ordre des exercices et efforts peuvent être adaptés pour la séance en cours sans modifier son modèle.

`GET /sport/program` renvoie `{ weeklyMinimum, weeklyMaximum, sessions, modules, library }` et ne crée aucune performance. `PATCH /sport/program` persiste la sélection et l'ordre des modèles ainsi que la fourchette. `POST /sport/program/templates` crée une séance ou un module et l'ajoute au programme. `POST /sport/program/:key/prepare` prépare le modèle manquant dans une transaction sérialisée avec les anciens imports ; répéter l'appel ne crée pas de doublon. `PATCH /sport/program/:key` modifie le modèle en préservant les identifiants des exercices existants. Les clés sont des UUID ou `reference-0` à `reference-3` avant la première préparation ; les anciens indices numériques restent acceptés par le backend.

Une séance s'ouvre avec les charges de référence, mais aucune série n'est considérée comme réalisée avant sa validation explicite. La saisie se fait exercice par exercice, avec rappel de dernière performance, minuteur de récupération et bilan avant enregistrement. Les finishers chronométrés ont leur propre validation. Une seule requête enregistre la séance et les efforts validés ; les séries non cochées et exercices non réalisés ne sont pas envoyés. Les anciennes séances conservent leur format et restent visibles dans l'historique. La charge maximale réalisée alimente les statistiques existantes. Le rappel de dernière performance utilise l'identifiant de l'exercice, ou son nom pour les anciennes séances sans identifiant.

## Nutrition

Le journal regroupe les aliments par moment, avec ajout par recherche Open Food Facts, photo, saisie manuelle ou réutilisation des récents et favoris. Les entrées sont modifiables ; la quantité en grammes et la provenance peuvent être conservées. Les valeurs laissées vides sont inconnues, distinctes d'un zéro connu ; les totaux incomplets sont indiqués comme partiels. Les anciennes entrées sont conservées sans déduire leur portion ni leur provenance.

Les favoris peuvent contenir une entrée ou une journée complète ; la copie conserve les détails connus et les moments d'origine. Les tendances hebdomadaires ne calculent chaque moyenne que sur les jours dont toutes les entrées ont la valeur correspondante. Des repères calories et protéines sont facultatifs, saisis manuellement et non prescriptifs. L'analyse photo envoie l'image à Groq et fournit des estimations à vérifier avant enregistrement.

Le journal met les **protéines en priorité** face à un repère personnel facultatif. Calories et lipides restent visibles en second niveau ; les glucides et le détail du journal sont dépliables. Les raccourcis déjeuner et dîner ouvrent la prise de photo : estimation, correction des aliments/portions ou précision textuelle (par exemple sauce non consommée), puis confirmation du repas en une requête. Aucun aliment n'est ajouté avant confirmation. Les photos ne sont pas conservées ; les valeurs issues de photos restent signalées comme estimées. Une journée renseignée partiellement n'est pas considérée comme un bilan exhaustif.

Petit-déjeuner, déjeuner et dîner proposent chacun **Prendre une photo**, **Choisir dans la galerie** et **Ajouter sans photo**. La galerie utilise un sélecteur d'image sans attribut `capture` pour ne pas imposer l'appareil photo sur mobile. Pour un emballage (biscuits, par exemple), ajuster la portion réellement consommée après lecture de l'étiquette.

**Ma routine** conserve une portion de shaker configurée depuis l'étiquette : grammes de poudre et protéines par préparation, avec calories/glucides/lipides facultatifs (lait compris si utilisé). Deux prises distinctes peuvent être confirmées ou annulées pour chaque date. Elles correspondent à de vraies entrées du journal, sans double comptage après répétition de la même confirmation ; une modification du produit ne réécrit pas les prises antérieures. La copie de la veille ne copie pas ces prises de routine. La créatine est un total quotidien saisi séparément, sans contribution aux macros ni prescription de dose ; la dernière quantité connue peut être proposée sans valider la prise automatiquement.

La migration additive `NutritionRoutine1794855600000` est nécessaire pour ce parcours : configuration du shaker, deux prises uniques par date et table créatine protégée par RLS. Elle ne modifie pas les anciennes entrées. Ne pas l'appliquer à la production sans autorisation explicite. `npm run test:nutrition` dans `backend` couvre validation, confirmations répétées, conservation des prises, créatine séparée et analyse photo.

`GROQ_API_KEY` doit être configurée côté serveur (environnement Production sur Vercel) pour l'analyse photo. Créer une clé dans la [console Groq](https://console.groq.com/keys) et conserver le compte sur l'offre Free pour utiliser les quotas gratuits. Ne jamais placer cette clé dans une variable `VITE_*` ou dans le navigateur. Sans elle, une erreur explicite est affichée ; recherche et saisie manuelle restent disponibles.

L'analyse utilise `qwen/qwen3.8-27b` via l'API vision Groq en mode JSON, sans bibliothèque supplémentaire ni repli vers Anthropic ou un autre fournisseur payant. Si le quota est atteint (HTTP 429), l'application demande de réessayer plus tard : aucun nouvel essai automatique ni changement de fournisseur. Les [quotas](https://console.groq.com/docs/rate-limits) et modèles disponibles peuvent changer ; la gratuité dépend de l'offre du compte Groq, pas d'un verrou de facturation dans le code. L'application ne souscrit ni ne change de formule.

La migration additive `NutritionJournal1794524400000` est nécessaire avant le déploiement : elle rend les macros existantes facultatives sans modifier leurs valeurs, ajoute quantité et provenance, et crée une table de repères protégée par RLS. Ne pas l'appliquer à la base de production sans vérification de la cible, sauvegarde et autorisation explicite.

Les saisies, y compris les séries encore non validées, sont sauvegardées dans le stockage local de cet appareil et reprises après rechargement. Une erreur de stockage est affichée explicitement. Les brouillons ne sont pas synchronisés entre appareils et sont supprimés à la déconnexion.
Le programme de référence est fourni par une route API authentifiée, et non inclus dans les fichiers JavaScript publics.

Depuis `frontend`, `npm test` vérifie le comptage des imports, les attributions ambiguës, les limites de semaine locale, les brouillons et les modules sans double comptage. Depuis `backend`, `npm run test:sport` valide le programme flexible, les séries imbriquées et la stabilité des identifiants ; `npm run test:auth` couvre le portail privé. Pour inclure les tests PostgreSQL, fournir `SPORT_TEST_DATABASE_URL` vers une base locale dédiée et vide nommée `operation10_sport_test`. Ces tests appliquent les migrations et vérifient les annulations transactionnelles ; ils ne doivent pas cibler les données de l'application.

**Avant de déployer le programme flexible**, appliquer la migration additive `FlexibleTrainingProgram1794434400000` sur la cible explicitement autorisée : elle crée `training_programs` avec RLS et ajoute les colonnes facultatives `activityType`, `moduleId` et `moduleName` aux exercices. Elle ne modifie ni ne supprime les séances existantes. L'API nécessite ce schéma ; ne pas déployer le nouveau code sur une base non migrée. Ne pas activer les seeds pour cette évolution.

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

Le fonctionnement nécessite `NODE_ENV=production`, `APP_ORIGIN` (origine HTTPS exacte du projet) et les variables backend `DATABASE_URL` et `APP_PASSWORD_HASH`. **Ne pas connecter ni déployer sur une base contenant des données tant que les migrations et leur cible n'ont pas été explicitement vérifiées et autorisées.** En production, migrations et seeds sont désactivés par défaut ; `RUN_MIGRATIONS=true` et `RUN_STARTUP_SEEDS=true` sont des opt-ins explicites, à ne pas activer sans autorisation. `GROQ_API_KEY` est facultative hors analyse de repas par photo. `ANTHROPIC_API_KEY` reste réservée aux fonctions de révision historiques.

GonfForge conserve le projet Vercel `operation10` et l'adresse <https://operation10.vercel.app>, avec le projet Supabase `Sport_du_gonf`. Aucun transfert depuis Neon n'est nécessaire. La connexion PostgreSQL utilise un compte dédié et `DATABASE_CA_CERT` pour vérifier le certificat TLS. Les tables applicatives ont RLS activé et les rôles publics `anon`/`authenticated` n'y ont pas accès ; seul le backend authentifié accède aux données.

Pour configurer le mot de passe du portail depuis un terminal interactif à la racine du dépôt, exécuter `node backend/scripts/hash-password.js --vercel`. Le mot de passe reste masqué et seul son hash est envoyé à la variable secrète Vercel. Redéployer après un changement de variable.

Les fonctions Vercel limitent les requêtes à 4,5 Mo. L’analyse photo compresse automatiquement les images trop volumineuses avant envoi. Elle nécessite `GROQ_API_KEY` ; sans cette clé ou quand le quota est atteint, les autres fonctions restent disponibles.

## Sécurité et données

- Toutes les routes API de données exigent une session propriétaire. Le cookie est `HttpOnly`, `SameSite=Strict`, sécurisé en HTTPS et expirant après sept jours ; le serveur ne stocke qu'un hash du jeton de session.
- Le mot de passe est dérivé avec scrypt et le login est limité en débit. Changer `APP_PASSWORD_HASH` puis supprimer la table `auth_sessions` révoque toutes les sessions.
- Garder les mots de passe et URLs de base en variables d'environnement, jamais dans Git. `.env` est ignoré par Git.
- Exporter régulièrement les données PostgreSQL de Supabase et vérifier les limites/règles de rétention en vigueur chez le fournisseur.
- L'application stocke des données de santé personnelle (sport et alimentation). Utiliser un mot de passe unique, ne pas partager le lien, et ne téléverser que des photos que l'on accepte de transmettre à l'API Groq. L'absence de stockage des images dans GonfForge ne garantit pas l'absence de rétention chez le fournisseur ; consulter ses conditions de traitement des données.
