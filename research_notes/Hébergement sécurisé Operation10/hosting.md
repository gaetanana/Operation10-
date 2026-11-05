# Free-tier deployment options for Operation10- (React/Vite SPA + NestJS API + PostgreSQL + optional Anthropic image analysis)

All claims below were checked against official provider pricing/docs pages on **2026-11-05** (today). Prices and limits on these platforms change frequently and are not contractually guaranteed to remain free — see the explicit "no perpetual free tier" caveats in each section.

---

## 1. Static frontend hosting (React/Vite SPA)

### Takeaway
Vercel Hobby, Netlify Free, and Cloudflare Pages (Workers Free plan) are all viable $0 options for a single personal SPA with custom domain + free TLS; Cloudflare Pages has the most generous raw bandwidth/file limits, Vercel has the best DX for Vite but Hobby is explicitly personal/non-commercial, Netlify switched to a credit-based free model in 2026 which caps usage more tightly than before.

### Cited Findings
- **Vercel Hobby** is $0/month, described as "aimed at developers with personal projects, and small-scale applications"; includes 100 GB Fast Data Transfer, 1,000,000 CDN requests/month, 1,000,000 function invocations, custom domains with automatic HTTPS/TLS certificates included on all plans. — [Vercel Pricing](https://vercel.com/pricing) (checked 2026-11-05); [Vercel Hobby Plan docs](https://vercel.com/docs/plans/hobby) (last_updated 2026-09-14, checked 2026-11-05)
- Vercel general limits (Hobby): 200 projects, 100 deployments/day, 45-minute max build time, 100 MB static file upload limit, 1 concurrent deployment, proxied request timeout 120s. — [Vercel Limits docs](https://vercel.com/docs/limits) (last_updated 2026-09-16, checked 2026-11-05)
- Vercel Functions on Fluid compute: Hobby max memory 2 GB (Pro/Enterprise 4 GB). — [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations) (last_updated 2026-08-24, checked 2026-11-05)
- **Netlify Free** ("Free — $0 forever") now runs on a 300-credit/month model: custom domains with SSL included, unlimited deploy previews, global CDN, but production deploys cost 15 credits each, bandwidth 20 credits/GB, web requests 2 credits/10k — so the "$0 forever" plan has real throughput ceilings (300 credits ≈ $2/month equivalent value at the Pro pack rate) rather than large fixed free quotas. — [Netlify Pricing](https://www.netlify.com/pricing/) (checked 2026-11-05)
- **Cloudflare Pages** (Free plan, billed via Workers "Free" plan rules): 500 builds/month, 1 build at a time, 20-min build timeout, up to 20,000 files per site (25 MiB max file size), up to 100 custom domains per project, unlimited preview deployments, unlimited CDN bandwidth for static assets. Pages Functions (if used) are billed as Workers: Free plan gives 100,000 requests/day and 10ms CPU time per invocation. — [Cloudflare Pages Limits](https://developers.cloudflare.com/pages/platform/limits/) (last updated 2026-09-05, checked 2026-11-05); [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/) (last updated 2026-10-02, checked 2026-11-05)
- Cloudflare Workers/Pages Free plan requests to static assets are "free and unlimited" regardless of plan. — [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/) (checked 2026-11-05)

### Inferences
- For a pure static SPA (no SSR), Cloudflare Pages' free tier is the most headroom-friendly (unlimited static bandwidth, 100 custom domains) and least likely to require a card on file for normal personal traffic.
- Vercel Hobby is optimized for Vite/React out of the box (zero-config framework detection) but its ToS reserve Hobby for personal/non-commercial use (see Section 5 caveats) — a consideration if Operation10- is ever monetized even informally.
- Netlify's 2026 credit model means a few redeploys plus moderate traffic can burn through the "forever free" allotment faster than the old pre-2026 free tier; monitor credit usage if choosing Netlify.

### Gaps
- Could not locate Netlify's exact custom-domain/TLS cost-in-credits (page states "Add Custom domains with SSL" as included but doesn't break out a credit cost separate from the base 300/month allotment).
- Did not verify GitHub Pages / Surge / Cloudflare direct comparisons beyond the three above; main agent may want a 4th fallback (GitHub Pages) if Cloudflare/Vercel/Netlify all become unsuitable, but this wasn't in scope for this pass.

---

## 2. Node/NestJS API hosting

### Takeaway
Render's Free web service plan is currently the most realistic $0 option for a long-running NestJS/Express process, but it **sleeps after 15 minutes of inactivity** (≈1-minute cold-start) and is capped at 750 instance-hours/month; Railway's "Free" plan is effectively unusable for a public app (no custom domains, $1/month credit only) and Fly.io has **no free compute tier anymore** — the cheapest always-on Fly machine costs ~$2.19–$3.69/month. Cloudflare Workers can't run a standard NestJS/Express server directly (10ms CPU/invocation on Free plan, different runtime) without non-trivial adaptation.

### Cited Findings
- **Render Free web services**: free for Node.js/Python/Rails etc. web services; supports custom domains, managed TLS, service previews, log streams, limited rollbacks — but "Render spins down a Free web service that goes 15 minutes without receiving any inbound traffic" and cold "spins back up... takes about one minute," during which Render shows a loading page. Workspace gets 750 free instance-hours/month shared across free services; exceeding them suspends free services until next month. Filesystem is ephemeral — any local files are lost on redeploy/restart/spin-down; free services cannot attach a persistent disk (paid-only feature). — [Render Free docs](https://render.com/docs/free) (checked 2026-11-05)
- Render free services also count against monthly included outbound bandwidth and build-pipeline minutes; exceeding bandwidth without a payment method on file suspends the free service for the rest of the month. — [Render Free docs](https://render.com/docs/free) (checked 2026-11-05)
- **Railway** plans: "Free Trial" ($5 one-time credit, 30 days, no card) then a persistent **"Free"** plan at $0/month with only **$1/month of usage credit**, 1 vCPU/0.5 GB max per service, 1 replica, 3-day log history, and **0 custom domains allowed** (vs. 2 on Hobby $5/mo, 20 on Pro $20/mo). Railway bills per-second for CPU/memory/disk; there is no sleep/cold-start model — unused compute simply isn't billed if services are stopped. — [Railway Pricing](https://railway.com/pricing) (checked 2026-11-05)
- **Fly.io** no longer offers a free allowance: "Fly.io bills for the resources you use, with no monthly platform fee. The smallest always-on app costs $2.19 per 30 days." Smallest machine (`shared-cpu-1x`, 256 MB) = $2.19/month; 512 MB = $3.69/month; Fly's own example "small web app with Managed Postgres" totals ~$44/month once you add their Managed Postgres Basic plan ($38/month). Apps can auto-stop when idle to cut compute cost, but there's no genuinely free, always-available web-service tier as of this check. — [Fly.io Pricing](https://docs.fly.io/about/pricing) (checked 2026-11-05)
- **Cloudflare Workers Free plan**: 100,000 requests/day, **10 milliseconds of CPU time per invocation** (no charge for wall-clock duration, but CPU budget is tiny), 10 ms limit is likely too small for a typical NestJS request that touches a Postgres driver and does JSON (de)serialization plus any Anthropic API round-trip (which would need to be async/non-blocking to avoid burning CPU budget). Workers Paid plan ($5/month minimum) raises this to effectively no hard per-invocation CPU cap billed at $0.02/million extra CPU-ms, with 30 seconds default/5 minutes max execution duration. — [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/) (checked 2026-11-05)

### Inferences
- A standard NestJS app built on Express/Fastify is not Workers-compatible out of the box (different runtime, no native TCP/Postgres driver support without adapters like Hyperdrive); porting to Workers would require significant rework, so Cloudflare is realistically a frontend-only option for this stack, not an API host, at $0.
- Render Free is the most "drop-in" compatible choice for a NestJS Docker/Node web service, at the cost of a cold-start UX hit (~60s) after 15 minutes idle — acceptable for a single personal user who tolerates an occasional slow first load, but not suitable if the app must respond instantly to e.g. webhook callbacks.
- Because Render's free compute has an ephemeral filesystem, any file writes (e.g., temp image uploads before sending to Anthropic) must go to object storage or be processed in-memory/streamed, not written to local disk.

### Gaps
- Did not check Cyclic.sh / Glitch / Deta Space / Koyeb free tiers as additional fallbacks — out of scope for the ~15-call budget; main agent may want a follow-up pass if Render's cold starts are a dealbreaker.
- Did not verify whether Render's "750 free instance hours/month" resets per account or per-service when multiple free services are deployed (docs state "per workspace").

---

## 3. Managed PostgreSQL

### Takeaway
**Neon's Free plan is the strongest $0 Postgres option** for this stack: it is explicitly described as "permanent (not a trial)," needs no credit card, and persists data indefinitely (subject to 1 GB storage/project, 20 GB account total, and 100 CU-hours/project/month compute) — but it always scale-to-zero suspends after 5 minutes idle (cannot be disabled on Free), causing a brief cold-start on the next query. Supabase's Free plan is usable but pauses the whole project (not just compute) after 7 days of inactivity, which for "one personal user" with sporadic logins is a real risk of unexpected downtime requiring manual un-pause. Render's free Postgres **expires entirely after 30 days** and is not a long-term option. Railway and Fly.io no longer offer meaningfully free managed Postgres.

### Cited Findings
- **Neon Free plan**: $0/month, "permanent (not a trial); no credit card required." Includes 100 projects, 10 branches/project, 100 CU-hours/project/month compute, autoscaling up to 2 CU (8 GB RAM), storage 1 GB/project and 20 GB account total, 5 GB egress/project included, scale-to-zero after 5 minutes of inactivity ("Always enabled on Free, suspends after 5 min, cannot be turned off"), 1 manual snapshot, 6-hour point-in-time restore history window (1 GB limit), 1-day monitoring retention. Suspended (scaled-to-zero) compute accrues $0 CU-hours. — [Neon Pricing](https://neon.com/pricing) (page states "Last updated: 2026-10-31," checked 2026-11-05)
- Neon compute unit (CU) ≈ 4 GB RAM + CPU + SSD; CU-hour = compute size × hours running (e.g., 0.25 CU × 4h = 1 CU-hour). — [Neon Pricing](https://neon.com/pricing) (checked 2026-11-05)
- **Supabase Free plan**: $0/month, 500 MB database size (shared CPU, 500 MB RAM), 5 GB egress, 5 GB cached egress, 1 GB file storage, 50,000 monthly active users, community support — but "Free projects are paused after 1 week of inactivity. Limit of 2 active projects." Paid plans (Pro, from $25/month) are not paused for inactivity. — [Supabase Pricing](https://supabase.com/pricing) (checked 2026-11-05)
- **Render Postgres**: the docs explicitly flag "Note that Free Render Postgres databases expire 30 days after creation." Paid Render Postgres plans add point-in-time recovery and on-demand logical exports; the Free compute plan is documented as having further limitations (linked but not fully detailed in the fetched page). — [Render Free docs](https://render.com/docs/free) and [Render Postgres docs](https://render.com/docs/postgresql-creating-connecting) (checked 2026-11-05)
- **Railway** has no standalone free Postgres plan beyond the shared $1/month (Free plan) or $5/month (Hobby plan) compute credit pool that a Postgres service would consume alongside any other services in the project; with only 0.5 GB/1 vCPU max per service and 0 custom domains on Free, Railway Postgres is not a practical zero-cost long-term DB host for a public app. — [Railway Pricing](https://railway.com/pricing) (checked 2026-11-05)
- **Fly.io Managed Postgres** starts at $38/month (Basic plan) plus $0.28/GB/month storage — there is no free Fly Postgres tier. — [Fly.io Pricing](https://docs.fly.io/about/pricing) (checked 2026-11-05)

### Inferences
- For "one personal user," Neon's always-on scale-to-zero (5-minute idle suspend) is actually a feature, not a bug: it guarantees the account never silently loses the database (data persists indefinitely on Free, unlike Supabase's weekly-inactivity project pause or Render's 30-day free-DB expiry), at the cost of a short wake-up latency on the first query after idle periods — which pairs naturally with Render's own free-web-service cold start (both wake together on first request).
- 1 GB/project storage (Neon Free) should be more than sufficient for a single-user personal app's relational data (users, image-analysis metadata, etc.), though any raw image blobs should go to object storage rather than Postgres bytea columns to avoid hitting the limit quickly.
- Backups/exports: Neon's Free plan only offers a 6-hour point-in-time-restore window and 1 manual snapshot — adequate only for accidental-mistake recovery, not disaster recovery; a personal user should periodically run `pg_dump` manually for a real offline backup since none of the free Postgres tiers provide long-retention managed backups (Render/Supabase paid plans offer day-level backup retention; free tiers do not).

### Gaps
- Could not fetch Neon's region-availability page in this pass (list of supported AWS/Azure regions) — worth a follow-up if EU-only hosting is a hard requirement for Operation10-'s users.
- Did not confirm exact Supabase "free DB region list" or whether a paused Supabase free project can always be manually un-paused without data loss (Supabase docs suggest yes via dashboard, but this wasn't independently verified in this pass).

---

## 4. Optional Anthropic (Claude) image-analysis integration cost

### Takeaway
The Anthropic API is **purely pay-per-token with no documented perpetual free tier** for production use (only limited trial/promotional credits for new accounts, which are not guaranteed or permanent); this must be budgeted as the one component of the stack that cannot realistically be kept at $0 under sustained usage, though a single personal user doing occasional image analysis will likely incur only cents per month.
### Cited Findings
- Published per-model-token pricing (USD): e.g., Claude Sonnet 5 — $2/MTok base input, $10/MTok output; Claude Opus 5 — $5/MTok input, $25/MTok output; Claude Opus 5.5 — $4/MTok input, $20/MTok output. Image inputs are billed as input tokens (the pricing page covers "all Claude models" uniformly by token, with no separate free image-analysis allowance documented on this page). — [Claude/Anthropic Pricing docs](https://platform.claude.com/docs/en/about-claude/pricing) (checked 2026-11-05)

### Inferences
- Because Anthropic has no free recurring quota (unlike the hosting providers above), the "optional Anthropic image-analysis integration" should be treated as a true marginal/optional cost center: for one personal user doing infrequent image analysis (a handful of images/month), token costs would likely be a few cents to low dollars, but this is the one line item that cannot be structurally guaranteed free regardless of hosting choice.

### Gaps
- Did not verify current new-account promotional/trial credit amounts (these change often and are explicitly non-recurring); if the main agent needs an exact current figure, a dedicated follow-up check of the Anthropic Console billing page is recommended.

---

## 5. Hobby/commercial restrictions, regional availability, and "can the whole stack stay $0?" assessment

### Takeaway
No provider in this comparison offers a contractual guarantee of perpetual free service — all free tiers are explicitly revocable/changeable at the provider's discretion, and at least one commonly recommended frontend host (Vercel Hobby) restricts free usage to personal/non-commercial projects. For Operation10- with one personal user, a combination of **Cloudflare Pages (frontend) + Render Free web service (API) + Neon Free (Postgres)** can realistically run at $0/month for light/intermittent personal use, with the explicit trade-off of cold starts on both the API and DB after idle periods, and the Anthropic API being the one always-metered cost if the image-analysis feature is actually used.

### Cited Findings
- Vercel explicitly markets Hobby as "aimed at developers with personal projects, and small-scale applications" (not stated as unrestricted for commercial use) — [Vercel Hobby Plan docs](https://vercel.com/docs/plans/hobby) (checked 2026-11-05).
- Render's own docs caution: "Free instances have important limitations... **Do not use them for production applications.** However, they're perfect for testing out a new technology, working on a hobby project, or previewing Render's developer experience." — [Render Free docs](https://render.com/docs/free) (checked 2026-11-05)
- Neon's Free plan is the only one of the databases reviewed that its provider explicitly labels as "permanent (not a trial)" with "no credit card required," in contrast to Supabase (pauses after 7 days inactivity), Render (free DB expires after 30 days), Railway (minimal $1/month credit, not a true dedicated free DB plan), and Fly.io (no free Postgres at all). — [Neon Pricing](https://neon.com/pricing) (checked 2026-11-05); [Supabase Pricing](https://supabase.com/pricing) (checked 2026-11-05); [Render Free docs](https://render.com/docs/free) (checked 2026-11-05); [Railway Pricing](https://railway.com/pricing) (checked 2026-11-05); [Fly.io Pricing](https://docs.fly.io/about/pricing) (checked 2026-11-05)
- Custom domains + managed TLS are included free on every option reviewed for frontend and API hosting (Vercel Hobby, Netlify Free, Cloudflare Pages, Render Free web services), so TLS/custom-domain cost is not a blocker to staying at $0 on any of the recommended stack components. — [Vercel Pricing](https://vercel.com/pricing); [Cloudflare Pages Limits](https://developers.cloudflare.com/pages/platform/limits/); [Render Free docs](https://render.com/docs/free) (all checked 2026-11-05)

### Inferences
- **Recommended primary architecture (realistic $0/month for one personal user):**
  - Frontend (React/Vite SPA): **Cloudflare Pages** Free plan — unlimited static bandwidth, 100 custom domains/project, free managed TLS, no sleep/cold-start for static assets.
  - API (NestJS/Node): **Render** Free web service — drop-in Node/Docker support, free custom domain + TLS, accepts the documented trade-off of 15-minute idle sleep and ~60s cold start; must avoid writing to local disk given the ephemeral filesystem (stream any image bytes straight to Anthropic's API and to Postgres/object storage, not to local files).
  - Database: **Neon** Free plan — "permanent" free Postgres, 1 GB storage/project (enough for metadata, not raw images), scale-to-zero after 5 minutes idle (pairs naturally with Render's own cold start), no credit card required. Schedule a periodic manual `pg_dump` export since Neon Free's built-in restore window is only 6 hours.
  - Optional Anthropic image analysis: pay-as-you-go token billing — the one line item kept metered/paid as actual usage occurs; realistically a few cents to low dollars/month for a single user's occasional use.
- **Fallback architecture** if Render's cold starts or 750-hour/month cap become a problem: keep Cloudflare Pages for the frontend and Neon for Postgres, but move the API to a **paid-but-cheap** host such as Railway Hobby ($5/month, 48 vCPU/48 GB ceiling, 2 custom domains, no sleep since billing is per-second-of-actual-use) or Fly.io's smallest always-on machine (~$2.19–$3.69/month) — both eliminate the free-tier sleep/cold-start behavior for a small, predictable monthly cost, while Postgres and frontend stay at $0.
- Because every free tier reviewed is revocable/can change terms at any time (and several hosts, e.g., Render and Vercel, explicitly discourage/restrict free-tier use for "production" or "commercial" purposes), the main agent's final recommendation to the user should state plainly that **no provider guarantees indefinite free hosting**, and that the $0 architecture above should be periodically re-verified against each provider's current pricing page.

### Gaps
- Did not independently verify each provider's terms-of-service legal language on "commercial use" restrictions (only the marketing/pricing-page framing was checked, e.g., Vercel's "personal projects... small-scale applications" wording and Render's "Do not use for production" caution) — a stricter legal read of Vercel's and Render's full Terms of Service was out of scope for this research pass.
- Did not check data-residency/regional-availability specifics (e.g., EU-only region pinning) for Render, Neon, Cloudflare, or Vercel in this pass; if Operation10-'s single personal user has a data-residency requirement, a dedicated follow-up on each provider's available regions is recommended.
