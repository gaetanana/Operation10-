# Déploiement gratuit, sécurisation « accès propriétaire unique » et pistes UX pour Operation10-

Vérifications effectuées le **2026-11-05**. Toutes les offres « gratuites » citées sont révocables et modifiables par les fournisseurs à tout moment — aucune n'est contractuellement garantie à vie.

Stack observée dans le repo : SPA React 18 + Vite 5 (`frontend/`), API NestJS **v10** + TypeORM + Postgres (`backend/`), module `nutrition` avec analyse d'image via l'API Anthropic (clé `ANTHROPIC_API_KEY` déjà dans `docker-compose.yml`), modules `sport`/`todo`, **aucun module `auth` actuellement présent** dans `backend/src` malgré la dépendance `@nestjs/jwt` déjà installée — l'app est donc, telle quelle, 100 % ouverte si déployée publiquement.

## Mise à jour après implémentation

L'analyse ci-dessous décrit les options et l'état initial du dépôt. Dans la branche de reprise, une première tranche est maintenant en place : **un service Render Free Docker** sert le front et l'API sur la même origine, avec **Neon Free** pour PostgreSQL ; le backend est passé à NestJS 12, les dépendances ont des lockfiles et les audits npm sont propres à la date du contrôle. L'authentification est une session propriétaire stockée en base, avec un cookie `HttpOnly`/`SameSite=Strict`, hash de jeton, mot de passe dérivé par scrypt, limitation des tentatives et pas d'inscription publique. L'interface a un écran de connexion, une navigation mobile et une correction de dates locales. Cette architecture monolithique Render a été retenue plutôt que la séparation Pages/API pour simplifier les cookies et CORS.

---

## 1. Résumé exécutif

- **Hébergement $0/mois réaliste pour un usage personnel** : un service Render Free Docker (frontend + API) + Neon Free (Postgres) — voir §2. Seul point jamais gratuit : l'API Anthropic, facturée au token (§3).
- **Sécurité** : pas besoin d'un portail tiers lourd (Auth0/Okta). Le choix le plus sûr et le plus simple pour un seul propriétaire est une **session cookie `HttpOnly`/`Secure`/`SameSite`** côté NestJS, pas un JWT stocké côté navigateur — en complément, un **portail d'accès au niveau du proxy/CDN** (Cloudflare Access) peut bloquer tout visiteur non authentifié avant même qu'il n'atteigne l'app (§4).
- **Coût récurrent non évitable** : l'API Anthropic (analyse d'image des repas) n'a pas de palier gratuit permanent documenté — à budgéter en centimes/mois pour un usage personnel occasionnel, mais ce n'est pas $0 structurellement (§3).
- **UX/produit** : l'application n'a aujourd'hui aucune authentification, aucun écran de login, des objectifs nutritionnels codés en dur, et pas de retour visuel clair pendant l'analyse d'image par l'IA — ce sont les 4 points à prioriser avant tout déploiement public (§5).

---

## 2. Où héberger gratuitement (frontend / API / base de données)

### 2.1 Frontend (SPA React/Vite)

| Fournisseur | Essentiel gratuit | Limite à connaître |
|---|---|---|
| **Cloudflare Pages** (recommandé) | Bande passante statique illimitée, 100 domaines personnalisés/projet, TLS gratuit, pas de mise en veille | 500 builds/mois, build unique à la fois, 20 min de timeout de build, fichiers ≤ 25 MiB — [Cloudflare Pages Limits](https://developers.cloudflare.com/pages/platform/limits/) (màj 2026-09-05, vérifié 2026-11-05) |
| Vercel Hobby | 100 Go de transfert/mois, 1M requêtes CDN, HTTPS auto, excellent support Vite | Explicitement réservé aux **« projets personnels et applications à petite échelle »**, pas garanti pour un usage commercial — [Vercel Pricing](https://vercel.com/pricing), [Vercel Hobby docs](https://vercel.com/docs/plans/hobby) (vérifié 2026-11-05) |
| Netlify Free | Domaine perso + SSL inclus, previews illimitées | Modèle à **crédits** depuis 2026 (300 crédits/mois ; 1 déploiement prod = 15 crédits, 1 Go de bande passante = 20 crédits) — s'épuise plus vite qu'avant — [Netlify Pricing](https://www.netlify.com/pricing/) (vérifié 2026-11-05) |

**Recommandation** : Cloudflare Pages pour une SPA purement statique — le plus de marge avant de devoir sortir la carte bancaire.

### 2.2 API NestJS

| Fournisseur | Verdict |
|---|---|
| **Render Free (web service)** (recommandé) | Compatible « drop-in » Node/Docker, domaine + TLS gratuits, mais **se met en veille après 15 min d'inactivité** (reprise ≈ 1 min), plafond de 750 h d'instance/mois par workspace, **système de fichiers éphémère** (aucune écriture locale persistante) — [Render Free docs](https://render.com/docs/free) (vérifié 2026-11-05) |
| Railway « Free » | Quasi inutilisable en public : seulement 1 $/mois de crédit d'usage et **0 domaine personnalisé autorisé** sur ce palier — [Railway Pricing](https://railway.com/pricing) (vérifié 2026-11-05) |
| Fly.io | **Plus de palier gratuit** : la plus petite machine toujours active coûte dès 2,19 $/mois — [Fly.io Pricing](https://docs.fly.io/about/pricing) (vérifié 2026-11-05) |
| Cloudflare Workers | Incompatible tel quel avec un NestJS/Express standard (10 ms de CPU par appel sur le palier gratuit, runtime différent, pas de driver Postgres natif) — à écarter pour l'API, bon uniquement pour le frontend |

**Conséquence concrète pour Operation10-** : comme le disque de Render Free est éphémère, toute image envoyée à l'API Anthropic doit être **traitée en flux/mémoire**, jamais écrite sur disque local avant envoi.

### 2.3 Base de données PostgreSQL

| Fournisseur | Verdict |
|---|---|
| **Neon Free** (recommandé) | Décrit comme « **permanent (pas un essai)**, aucune carte bancaire requise » ; 1 Go de stockage/projet, 20 Go au total, 100 CU-heures/mois ; se met en veille après **5 min** d'inactivité (ne peut pas être désactivé sur le palier gratuit) mais **ne perd jamais les données** — [Neon Pricing](https://neon.com/pricing) (màj 2026-10-31, vérifié 2026-11-05) |
| Supabase Free | 500 Mo de DB, 1 Go de stockage fichiers — mais **le projet entier se met en pause après 7 jours d'inactivité** (pas seulement le calcul), ce qui est un vrai risque pour un seul utilisateur aux connexions sporadiques — [Supabase Pricing](https://supabase.com/pricing) (vérifié 2026-11-05) |
| Render Postgres gratuit | **Expire définitivement après 30 jours** — inutilisable en continu — [Render Free docs](https://render.com/docs/free) (vérifié 2026-11-05) |
| Railway / Fly.io | Pas de palier Postgres réellement gratuit (Fly Managed Postgres dès 38 $/mois) — [Railway Pricing](https://railway.com/pricing), [Fly.io Pricing](https://docs.fly.io/about/pricing) (vérifié 2026-11-05) |

**Important** : Neon Free n'offre qu'une fenêtre de restauration ponctuelle de **6 heures** et **1 snapshot manuel** — pas une vraie sauvegarde long terme. Prévoir un `pg_dump` manuel périodique en backup réel hors plateforme.

### 2.4 Architectures envisageables ($0/mois réaliste)

```
Render Free Docker (frontend + API, $0, veille 15 min)
        │ HTTPS · même origine
Neon Free (Postgres, $0, veille 5 min)
```

- **Choix retenu pour cette reprise** : un service Render sert la SPA et l'API depuis le même domaine ; cela garde la session propriétaire first-party, évite le CORS de production et réduit les étapes de déploiement. Le dépôt fournit un Dockerfile multi-étapes et un Blueprint Render. La base reste hébergée séparément sur Neon.
- **Alternative** : Cloudflare Pages + Render + Neon peut donner davantage de marge au frontend statique, mais introduit une séparation de domaines à configurer soigneusement pour cookies, CORS et requêtes avec identifiants.
- Les deux veilles (API + DB) se réveillent naturellement ensemble à la première requête après inactivité — acceptable pour un usage personnel qui tolère ~1 min de lenteur au premier chargement du jour, **inadapté si l'app doit répondre instantanément** (ex. webhook).
- **Repli payant mais prévisible** si les mises en veille gênent trop : Railway Hobby (5 $/mois, facturé à la seconde réelle d'usage, pas de veille) ou la plus petite machine Fly.io always-on (2,19–3,69 $/mois) pour l'API seule, en gardant Cloudflare Pages et Neon à $0.
- Aucun fournisseur ci-dessus ne garantit contractuellement la gratuité perpétuelle ; Vercel Hobby et Render cadrent même explicitement leurs paliers gratuits comme non destinés à la « production » — à garder en tête si l'app devient plus critique.

---

## 3. Le seul poste de coût qui ne sera jamais $0 : l'API Anthropic

- Le pricing Anthropic est **uniquement au token**, sans palier gratuit permanent documenté pour un usage en production (seuls des crédits d'essai non garantis existent à la création d'un compte) — [Claude/Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) (vérifié 2026-11-05).
- Exemples de tarifs : Claude Sonnet 5 à 2 $/MTok en entrée et 10 $/MTok en sortie ; les images sont facturées comme tokens d'entrée, sans quota gratuit séparé documenté.
- **Pour un usage personnel occasionnel** (quelques photos de repas par semaine), le coût réel attendu est de l'ordre de **quelques centimes à quelques dollars par mois** — mais c'est le seul composant de la stack qui reste structurellement payant quel que soit l'hébergeur choisi.

---

## 4. Sécurité : protéger l'app pour un seul propriétaire (« portail »)

### 4.1 Pourquoi pas un JWT en `localStorage` : session cookie recommandée

Le guide de référence OWASP traite la session identifiée par cookie comme le mécanisme de base pour une app web classique, et réserve les JWT/bearer tokens aux architectures **multi-services sans état** (API tierces, mobile, microservices) — pas au cas d'un seul front + un seul backend du même propriétaire :

- « *the authenticated session ID/token... temporarily equivalent to the strongest authentication method used by the application* » — [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- Les JWT/bearer tokens sont positionnés pour « *stateless, multi-service REST architectures* » avec un fournisseur d'identité centralisé — [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- Un cookie `HttpOnly` est illisible par le JavaScript de la page (protège contre le vol de session via XSS) ; un JWT en `localStorage` est lisible par n'importe quel script injecté — [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)

**Recommandation concrète pour Operation10-** : utiliser une session serveur avec cookie `HttpOnly; Secure; SameSite=Strict`, stockée côté Postgres, plutôt qu'un JWT renvoyé au front. Un JWT n'apporte aucune valeur ici (pas de multi-services, pas de mobile) et complique la révocation. C'est l'approche implémentée dans cette branche ; seul le hash du jeton aléatoire est stocké.

> ⚠️ **Note spécifique à la version du repo** : les notes ci-dessus citent `app.useSecurityHeaders()` et `app.enableCsrfProtection()`, deux API natives de **NestJS ≥ 12.1**. Le `backend/package.json` actuel est en **`@nestjs/core: ^10.0.0`**. Pour obtenir les mêmes protections aujourd'hui, il faut soit **mettre à niveau vers NestJS 12.1+**, soit utiliser directement le paquet `helmet` (mêmes en-têtes par défaut) et une protection CSRF manuelle (vérification `Origin`/`Sec-Fetch-Site`, ou paquet équivalent à `csurf`) en attendant la mise à niveau.

### 4.2 Portail d'accès au niveau du proxy (défense en profondeur, pas un remplacement)

- Cloudflare Access permet de « *securely publish internal tools and applications by adding Cloudflare Access as an authentication layer between the end user and your origin server* », avec une politique par défaut en **deny-by-default** — [Cloudflare: Publish a self-hosted application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/) (vérifié 2026-11-05)
- Il filtre par e-mail, domaine d'e-mail, pays ou posture d'appareil, et pose un cookie de jeton applicatif à courte durée de vie vérifié à chaque requête — [Cloudflare Access Policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)

**Interprétation pour un propriétaire unique** : ce n'est **pas indispensable** (ça réintroduit une dépendance à un fournisseur d'identité, même « email OTP » Cloudflare), mais c'est une couche bon marché utile si l'app passe déjà par Cloudflare : aucune requête non authentifiée n'atteint NestJS, y compris des tentatives d'exploitation contre la page de login elle-même. Une alternative plus simple sans IdP tiers : liste blanche d'IP ou Basic Auth au niveau du reverse-proxy si l'adresse IP de l'utilisateur est stable.

### 4.3 Checklist essentielle (par ordre de priorité)

1. **Mot de passe** : hachage Argon2id (« 19 MiB mémoire, 2 itérations, 1 parallélisme » minimum) ou scrypt/bcrypt selon les contraintes du runtime, jamais SHA-256 seul — [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). L'implémentation utilise scrypt avec sel aléatoire via le module crypto de Node et impose 14 caractères minimum au générateur. Pas de rotation forcée périodique : ne changer le mot de passe qu'en cas de compromission suspectée.
2. **Cookie de session** : `HttpOnly; Secure; SameSite=Strict`, sans attribut `Domain` explicite, ID de session ≥ 64 bits d'entropie généré par le framework/store — [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
3. **CSRF** : protection par en-têtes `Sec-Fetch-Site`/`Origin` (ou paquet dédié tant que NestJS reste en v10) sur toutes les requêtes qui modifient l'état — [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
4. **Rate limiting** : `@nestjs/throttler` sur `/auth/login` (≈5 tentatives/min/IP), avec `app.set('trust proxy', ...)` indispensable si l'app est derrière Cloudflare/Nginx, sinon le rate limiting voit l'IP du proxy pour tout le monde — [NestJS Rate Limiting](https://docs.nestjs.com/security/rate-limiting).
5. **Pas de « mot de passe oublié » public** : avec un seul propriétaire ayant déjà accès au serveur, préférer une procédure de réinitialisation hors-ligne (script admin/migration) à un flux web complet — moins de surface d'attaque qu'un vrai formulaire « forgot password » — [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
6. **Secrets** : `DATABASE_URL`, `JWT_SECRET`/secret de session, `ANTHROPIC_API_KEY` doivent rester hors du dépôt et de l'image Docker — variables d'environnement côté plateforme d'hébergement (Render/Cloudflare ont leurs propres stores de secrets chiffrés), jamais commitées — [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html).
7. **En-têtes HTTP** : CSP, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy` — via `helmet` tant que NestJS reste en v10 (équivalent à `useSecurityHeaders()` en v12.1+) — [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html).
8. **CORS** : si le front et l'API sont servis sur le **même domaine** (recommandé pour ce projet), CORS peut être quasiment évité — sinon fixer `origin` à l'URL exacte du front (jamais `*` avec `credentials: true`) — [NestJS CORS docs](https://docs.nestjs.com/security/cors).
9. **MFA (TOTP)** : non essentiel pour un seul utilisateur disposant déjà d'un mot de passe fort + rate limiting, mais reste l'ajout à plus fort effet de levier si le temps le permet.

### 4.4 Limites de cette section
- Les conditions commerciales « usage personnel seulement » n'ont été vérifiées que sur les pages marketing/pricing, pas sur les CGU complètes de chaque fournisseur.
- La disponibilité régionale (résidence des données en UE, par exemple) n'a pas été vérifiée pour Render/Neon/Cloudflare dans cette passe.

---

## 5. Pistes pour retravailler le front et les fonctionnalités (priorisées)

Constat tiré d'une lecture directe du code (`frontend/src`, `backend/src`), pas de recherche externe — à considérer comme une revue produit, pas des faits sourcés :

### Priorité haute (bloquant avant mise en public)
1. **Écran de login et garde d'accès — fait dans cette branche** : les routes API de données sont protégées par une session propriétaire et l'interface demande le mot de passe avant d'afficher l'application. Aucun compte n'est préconfiguré et aucune inscription n'est ouverte.
2. **Retour visuel pendant l'analyse d'image IA** (`NutritionPage.tsx`) : le composant envoie une photo à l'API mais n'a pas d'indicateur de progression/erreur explicite observé dans le flux actuel — un utilisateur qui prend une photo doit voir un état « analyse en cours… » clair et un message d'erreur explicite si l'API Anthropic échoue ou est lente (cold start Render inclus).
3. **Objectifs nutritionnels codés en dur** (`const GOALS = { calories: 2500, proteins: 180, carbs: 250, fats: 80 }`) : pour une app personnelle, ces valeurs devraient être éditables (profil utilisateur) plutôt que figées dans le code — sinon chaque changement d'objectif nécessite une modification + redéploiement.

### Priorité moyenne (confort d'usage)
4. **Mode hors-ligne / tolérance aux temps de réveil** : avec l'architecture $0/mois recommandée (Render + Neon en veille), prévoir un état de chargement explicite « réveil du serveur, patientez ~30-60s » plutôt qu'un écran blanc ou une erreur réseau brute au premier chargement de la journée.
5. **Accessibilité mobile** : à vérifier sur `Sidebar.tsx`/pages (responsive, zones tactiles) puisque l'usage personnel se fait probablement aussi depuis un téléphone pour prendre les photos de repas.
6. **PWA / ajout à l'écran d'accueil** : pour une app personnelle à usage quotidien (nutrition, sport, todo), un manifest PWA + icône permettrait un accès en un tap sans passer par le navigateur, à faible coût d'implémentation sur une base Vite.

### Priorité basse (nice-to-have)
7. **Thème clair/sombre** et petites touches visuelles (déjà des couleurs par type de repas dans `MEAL_TYPES` — cohérent à étendre à un thème global).
8. **Notifications/rappels** (ex. rappel de repas non loggé en fin de journée) — fonctionnalité additionnelle, pas un correctif.

---

## 6. Plan d'action suggéré

1. **Fait** — authentification propriétaire, stockage des sessions, limitation du login, vérification d'origine et en-têtes HTTP.
2. **Fait** — NestJS 12, lockfiles et audits npm sans avis connus au contrôle du 2026-11-05.
3. **Prêt à configurer** — déployer le Blueprint Render + Neon et renseigner les secrets côté fournisseur. Aucun secret ni compte distant n'a été créé dans cette session.
4. **Reste à faire avant d'y stocker des données réelles** — générer le hash de mot de passe, vérifier le premier déploiement, puis mettre en place et tester des exports PostgreSQL réguliers.
5. **Pistes suivantes** — objectifs nutritionnels modifiables et PWA ; l'écran de connexion et la navigation mobile sont déjà présents.

---

## 7. Sources principales

- Hébergement : [Vercel Pricing](https://vercel.com/pricing) · [Cloudflare Pages Limits](https://developers.cloudflare.com/pages/platform/limits/) · [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/) · [Netlify Pricing](https://www.netlify.com/pricing/) · [Render Free docs](https://render.com/docs/free) · [Railway Pricing](https://railway.com/pricing) · [Fly.io Pricing](https://docs.fly.io/about/pricing) · [Neon Pricing](https://neon.com/pricing) · [Supabase Pricing](https://supabase.com/pricing)
- Coût IA : [Claude/Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Sécurité : [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) · [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html) · [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) · [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) · [OWASP Credential Stuffing Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html) · [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) · [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) · [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) · [NestJS CSRF](https://docs.nestjs.com/security/csrf) · [NestJS Security headers](https://docs.nestjs.com/security/helmet) · [NestJS Rate Limiting](https://docs.nestjs.com/security/rate-limiting) · [NestJS CORS](https://docs.nestjs.com/security/cors) · [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie) · [Cloudflare Access — self-hosted app](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
- Code analysé directement : `backend/package.json`, `backend/src/nutrition/*`, `frontend/package.json`, `frontend/src/pages/NutritionPage.tsx`, `frontend/src/components/Sidebar.tsx`, `docker-compose.yml`.

### Limites générales de ce rapport
- Les recherches de fond (hébergement, auth) datent toutes du 2026-11-05 ; les prix/limites des plateformes citées évoluent souvent — à revérifier avant mise en production si plusieurs semaines s'écoulent.
- La partie UX/fonctionnalités (§5) est une lecture de code, pas une recherche sourcée externe — elle reflète l'état du repo au moment de cette analyse, pas un audit exhaustif de toutes les pages (`SportPage.tsx`, `StatsPage.tsx`, `TodoPage.tsx` n'ont pas été lues en détail).
