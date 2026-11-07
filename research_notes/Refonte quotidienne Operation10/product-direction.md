# Operation10 product direction: a daily journal with a real training logbook

Research accessed **7 November 2026**. Product pages and browser/provider documentation describe the versions visible on that date, not guaranteed future behavior. This is a design recommendation, not an implementation or exercise/nutrition prescription.

**Evidence labels:** *direct evidence* = published research or an official documented capability; *practitioner convention* = an established product/design pattern, not evidence of clinical effectiveness; *synthesis* = a recommendation for this specific one-person app. Competitor marketing establishes advertised capabilities, not their usability, accuracy, or effect on adherence.

Project constraints are supplied by the assignment rather than independently audited: React/TypeScript/Vite; NestJS/TypeORM/PostgreSQL; owner-only authentication; free Render/Neon hosting; existing training contracts, exercise/session records, food/meal logs, favorites and statistics; Revision may be removed. The exact Monday–Thursday split and reference weights were not included in this research assignment. They must be carried forward from the owner's actual input, never reconstructed.

## 1. What product direction, navigation and first screen best serve daily training and meals?

### Takeaway

Choose a **daily journal backed by a serious training logbook**, rather than a generic wellbeing cockpit or a workout-only app. Its promise is: **“Know what I intended today, record what I actually did or ate, and see what is changing.”** This is a recommendation for this owner's two main jobs, not a scientifically established winning navigation.

### Cited Findings

- **Direct product evidence:** Hevy describes its three pillars as workout logging, progress tracking and socializing. That makes it a useful reference for training/progress separation, but its social pillar is not relevant to an owner-only tool. — [Hevy features](https://www.hevyapp.com/features/)
- **Direct product evidence:** Strong advertises custom exercises, supersets, RPE, timers, charts and CSV export. This demonstrates the coherent training-logbook direction; it does not establish that every advanced feature belongs in Operation10. — [Strong](https://www.strong.app/)
- **Direct product evidence:** Cronometer presents food journaling, personalized targets, macro/micronutrient tracking, and text, barcode, photo and voice capture. Its broad biometrics/device ecosystem illustrates how a nutrition tool can expand into a cockpit. — [Cronometer](https://cronometer.com/)
- **Direct product evidence:** MyFitnessPal advertises camera/voice/barcode logging, a food diary, recipes, meal planning and progress, alongside AI coaching, device connections and GLP-1 tracking. Capture and diary patterns are relevant; medication tracking and a coaching ecosystem are not established needs here. — [MyFitnessPal](https://www.myfitnesspal.com/)
- **Direct research evidence:** A 2021 systematic review of 39 randomized trials reports that self-monitoring can support comparison with goals or past performance. Its intervention population was adults with overweight/obesity, not recreational strength trainees. — [Patel, Wakayama and Bennett, 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC12838191/)

### Inferences

**Compare complete directions, not isolated widgets.**

| Direction | Organizing question | Strength for this owner | Main weakness | Decision |
|---|---|---|---|---|
| Daily journal | “What is happening today?” | Training and food share one daily context; quick re-entry after interruptions | Can become a long mixed feed | Best primary direction, with structured sections rather than an endless feed |
| Training logbook | “What should I lift, and what did I lift?” | Excellent in-session focus and exercise history | Meals feel bolted on; a workout-first landing wastes space on rest days | Best subordinate experience |
| Personal wellbeing cockpit | “How is my whole health?” | Attractive overview if sleep, activity, recovery and biometrics are reliable | Many empty metrics, integrations and scores; less emphasis on capture | Reject as initial direction |

**Four stable, labeled mobile navigation destinations:**

1. **Aujourd’hui** — the selected day's journal, defaulting to the owner's local date.
2. **Entraînement** — routines/program, flexible weekly organization, exercise library and workout history.
3. **Repas** — meal/food capture and reusable meal library; recent foods and favorites first.
4. **Progrès** — trustworthy training trends, nutrition summaries and historical exploration.

Settings, personal targets, units, export and privacy live behind an always-findable profile/settings control, not a fifth permanent tab. Revision is removed from the main product; any existing revision content should be exported or archived before destructive removal. “Today workout” is an action/state inside Aujourd’hui and Entraînement, not a separate top-level destination.

The distinction between **Aujourd’hui** and **Repas** should be explicit: Today is the cross-domain daily record and launchpad; Meals is the focused food-entry/library workflow. Both point to the same underlying records, not independent diaries.

**First screen hierarchy:**

- Header: date, previous/next day and “return to today”; discreet sync status and settings.
- If a workout is active: **Reprendre la séance** above everything else.
- Otherwise: training card showing the next intended routine, **Démarrer**, and secondary **Déplacer / Autre séance**. On rest days, say “Repos prévu”; still allow a free session.
- Food section: always-visible **Ajouter un repas**, recent/favorite shortcut, logged meals, and modest kcal/protein summary **only if those targets have been chosen**.
- Compact flexible weekly view: completed sessions versus personal intention, with no “failure” badge when a day moves.
- No global readiness score, calorie-burn balance, giant monthly chart, AI welcome monologue or training-course countdown.

Allow one scroll, but keep the first meaningful action available without scrolling on the owner's actual phone. In an active workout, the training surface becomes focused; global navigation must not accidentally abandon the session.

### Gaps

- No direct study found here establishes that four tabs or Today-first is superior for this exact user. Test it against an Entraînement-first alternative using the owner's actual tasks.
- This was a public-documentation review, not hands-on competitor testing. Advertised features and pricing/plan eligibility can change.
- The owner has not specified whether strength, energy balance, protein, enjoyment or another goal is primary. The proposed architecture accommodates them without silently choosing weight loss.

## 2. Which features, habit patterns and visual principles deserve the scope?

### Takeaway

Repeat use should come from **low-effort capture, reusable routines/meals, understandable feedback and resilient recovery**, not engagement tricks. Put completeness, optionality and delight into a small number of well-designed flows.

### Cited Findings

- **Direct research evidence:** The 2021 digital self-monitoring review included 39 studies from 2009–2019 and 67 interventions. Few achieved monitoring on at least 75% of days; digital arms had higher monitoring than paper in 21 of 34 comparisons and lower in two. Greater monitoring was associated with weight loss in 74% of reported occurrences. These are associations within weight-management interventions, not a retention benchmark or proof of causal benefit for this app. — [Patel et al., 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC12838191/)
- **Direct research evidence:** A prior review of 22 studies found consistent associations between monitoring and weight loss, but explicitly rated the evidence as weak because of methodological limitations and homogeneous samples. It also stresses truthful, consistent and timely monitoring. — [Burke, Wang and Sevick, 2011](https://pmc.ncbi.nlm.nih.gov/articles/PMC3268700/)
- **Direct research evidence:** Patel et al. discuss time-saving databases, commonly eaten foods and mobile portability as mechanisms that can reduce monitoring burdens. Their review does not isolate favorites, streaks or a particular visual style as causally effective components. — [Patel et al., 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC12838191/)
- **Practitioner convention:** WCAG 2.2's minimum pointer target criterion is 24 × 24 CSS pixels with specified exceptions; the enhanced criterion uses 44 × 44. Larger controls help touchscreen use, but 44 pixels must not be misrepresented as the universal AA minimum. — [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- **Direct product evidence:** Strong's advanced training toolkit and Cronometer/MyFitnessPal's multiple capture modes demonstrate feature categories already coherent in mature products, not a requirement to reproduce their entire catalogs. — [Strong](https://www.strong.app/); [Cronometer](https://cronometer.com/); [MyFitnessPal](https://www.myfitnesspal.com/)

### Inferences

**Capability selection for Operation10:**

| Capability | Meaningful job | Recommended scope |
|---|---|---|
| Quick capture | Reduce effort at meal time and between sets | Core: favorites/recent foods, repeat a meal, numeric keypad, few required fields |
| Routines/program | Avoid recreating familiar sessions | Core: owner's named split/routines; retain reference weights; unknown prescriptions remain empty |
| Workout mode | Record performed sets while training | Core: actual load/reps, previous performance, check/undo, draft resume; simple rest timer if wanted |
| Flexible plan | Make real-life rescheduling normal | Core: intended weekday or order plus move/skip/swap/free session; no automatic “missed” punishment |
| History/progress | Answer “what changed?” | Core: date/exercise history and a few provenance-aware charts |
| Meal library | Make repetition useful | Core: named meals, editable portions, favorites; full recipe builder only if normal meals require it |
| Personal targets | Support a chosen intention | Core but optional: owner-entered calories/protein and weekly training intention; further macros later |
| Barcode capture | Resolve frequent packaged-food search friction | Conditional: measure search pain first; offer manual search if camera fails |
| Food photo AI | Help with unusual meals or identification | Optional secondary workflow: reviewed suggestions, never silently logged facts |
| Supersets/RPE/advanced timers | Match an actual training practice | Add only when present in the supplied program or requested; optional metadata |
| Sleep/recovery/water/body metrics | Serve an explicit new question | Deferred; do not create empty cockpit tiles “for completeness” |
| Wearables, social, leaderboards, coach chat, auto programming | New product ecosystems | Out of scope initially |

**Habit loop without pressure:** make the intended session visible → allow a very small recording action → acknowledge exactly what was saved → offer a brief weekly reflection based on real records. Let the owner correct, resume or return after gaps without losing an identity/status. A skipped day is not a failed person. Reminders, if later wanted, should be opted into and sparse.

Do not equate more app minutes with better value: a successful redesign can reduce screen time while increasing reliable capture. Avoid competitive streaks, red macro “debt,” “earn your food” messaging and default exercise-calorie compensation.

**Visual identity proposal — calm personal logbook, not a clinical cockpit.**

- Deep ink/navy typography, warm off-white surfaces, one restrained evergreen accent; optional dark theme for a gym environment. This is a proposed direction, not evidence that changing the current navy/green palette improves habits.
- Reserve filled accent buttons for the main action and a clear, undoable completion treatment. Distinguish training and food with wording/icons and restrained secondary accents, not color alone.
- One spacing scale, consistent corner radius, one readable sans family and tabular numbers for kg/reps/macros. Use real labels such as “Prévu,” “Réalisé,” “Estimé,” and “En attente.”
- Make tap areas around 44–48 CSS pixels where practical, especially set completion and numeric controls; check contrast, text zoom, keyboard focus and screen-reader names. The larger target recommendation is grounded in W3C guidance but is a project design choice.
- Progressive disclosure: show essentials; reveal notes, RPE, nutrients and scheduling details on demand.
- Small optional completion motion, reduced-motion support and factual microcopy (“Repas enregistré”) create delight without attention-seeking confetti.

### Gaps

- No causal evidence was verified that gamification, a particular palette or AI capture improves long-term adherence for this owner.
- The reviews concern weight-management populations and interventions; generalization to strength progression, muscle gain or one-person leisure tracking is limited.
- Need to observe actual food-search failures, repeated meals, training device use and desired rest-timer behavior before prioritizing additional capture modes.

## 3. How should planned/reference strength data differ from performed sets?

### Takeaway

Separate **intention, historical reference and observed performance** in both data and presentation. A routine's reference weight is never proof that any set was performed, and no prefilled value should silently enter progress analytics.

### Cited Findings

- **Direct research evidence:** Burke et al. define monitoring as recording behavior and emphasize truthfulness, consistency and timeliness. The paper does not prescribe a strength-data schema, but supports keeping actual records reliable. — [Burke et al., 2011](https://pmc.ncbi.nlm.nih.gov/articles/PMC3268700/)
- **Direct product evidence:** Strong advertises custom exercises, RPE, charts and export. Those capabilities provide a training-logbook reference, but its public landing page does not establish specific internal rules for templates or unperformed sets. — [Strong](https://www.strong.app/)
- **Direct technical evidence:** Offline/background operations may be retried, and a service worker may terminate and restart an operation rather than resume it. This creates a concrete duplicate-write risk if a training app treats network retries as new logs. — [MDN offline/background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)

### Inferences

**Conceptual contract, not a proposed implementation patch:**

| Layer | Fields/concepts | Permitted role |
|---|---|---|
| Routine/intention | Exercise identity, order, optional target sets/reps/range, optional reference load, units, load convention, optional planned day/order | Guides a session; cannot count toward performed totals |
| Session plan snapshot | Routine/version and chosen date; intended exercise details at start | Explains what was intended even if the routine changes later |
| Performed set | Exercise, actual reps/load or duration/distance, units, timestamp, completion state, optional warm-up/work-set and RPE | Eligible for appropriate performance analysis after explicit confirmation |
| Historical reference | Previous performed set/date; separately supplied reference load | Suggestion shown next to input, not a new observation |

**Interaction example without inventing the owner's values:**

- “Référence du programme: [owner-supplied load]”
- “Dernière fois: [actual recorded reps/load], [date]”
- Editable current row: actual reps/load, then explicit ✓.
- If values are copied from last time, show them as **proposed** until confirmed. Confirmation can be a single tap; requiring retyping is unnecessary.
- Incomplete/abandoned exercises remain incomplete. Finishing a workout must not convert every planned row into performed work.
- Explicitly confirmed sets in a partial session can remain valid observations; finishing the whole session is not required to make those sets real.
- Editing a routine affects future intentions, not past sessions. Editing a performed set changes relevant aggregates; support undo and visible recalculation.

**Analytics trust rules:**

1. Define each metric in plain language. Example: recorded working-set volume = sum of actual reps × actual load for eligible confirmed sets; specify whether warm-ups are included.
2. Treat volume as a logging statistic, not a universal measure of effort or hypertrophy. Don't compare unrelated exercises or incompatible machine loads as though they were standardized.
3. Store/describe whether dumbbell weight is per hand or combined, barbell total includes the bar, and assisted exercises encode assistance. Bodyweight-only exercise is not simply “zero work.”
4. Prefer an exercise-specific timeline of actual sets and same-condition load/reps over an unexplained global score.
5. If estimated 1RM is added later, disclose formula and eligibility; label it estimated and avoid comparing it to a tested 1RM. It is not necessary for the first redesign.
6. Unknown/unlogged is distinct from zero. A chart gap should not become a zero-load session; an unlogged food day should not imply fasting.
7. Preserve food-nutrient values and portions used at log time so later food-library edits do not silently rewrite historical consumption; present estimated AI values as estimates.
8. Retry/sync handling needs client operation IDs and server idempotency; distinguish “saved on device” from “saved on server.”

**Existing-history handling:** inspect what current records actually mean before drawing new graphs. If legacy exercise values may be references or aggregate session notes rather than verified performed sets, preserve them as legacy/uncertain and label/exclude appropriately. Do not manufacture set-level history from ambiguous data. A conservative chart is preferable to a confident false improvement.

### Gaps

- The supplied split/reference weights are missing here. No sets, reps, rest intervals, progression scheme, equipment conventions or Monday–Thursday exercise names can responsibly be supplied by this research.
- No schema or historical record audit was conducted. The precise migration and compatibility rules depend on current stored semantics.
- These analytics rules are engineering/product synthesis, not claims that a competitor uses the same implementation.

## 4. What phased rollout and success measures make the renovation manageable?

### Takeaway

Renovate **one validated vertical slice at a time**, starting with trust and the daily training/meal loop. For one owner, use repeated task observations and personal value checks, not statistically unsupported growth dashboards.

### Cited Findings

- **Direct research evidence:** Digital monitoring rates vary and high-frequency adherence is uncommon in the reviewed weight-management interventions. The literature does not justify setting an arbitrary universal daily-use requirement. — [Patel et al., 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC12838191/)
- **Direct technical evidence:** Render's free web services spin down after 15 minutes without inbound traffic and typically take about one minute to wake. Their local filesystem is ephemeral. Therefore some perceived sluggishness is infrastructure rather than layout, and uploaded images cannot be relied on there for persistence. — [Render free instances](https://render.com/docs/free)
- **Direct technical evidence:** Neon documentation, updated 4 November 2026, says inactive computes scale to zero after five minutes and typically reactivate within a few hundred milliseconds; free-plan users cannot disable it. This is different from the longer documented Render cold start. — [Neon scale to zero](https://neon.com/docs/introduction/scale-to-zero)

### Inferences

**Phase 0 — agree the product contract and establish a baseline.**

- Observe several real meals and at least one real or replayed session on the owner's phone.
- Confirm personal objectives, actual split, load conventions, missing prescriptions, privacy preferences and whether calories should be prominent.
- Audit records and analytics meanings; make an export/backup and demonstrate restoration before schema changes.
- Prototype Today, meal repetition and one active-session screen. Compare task completion with the current app.
- Define one small visual system. Archive/remove Revision from navigation without accidentally destroying unrelated stored data.
- Exit gate: the owner recognizes the proposed organization and the distinction between reference and actual performance.

**Phase 1 — the minimum delightful daily loop.**

- Deliver Today, basic routines, explicit performed-set capture, draft resume, date correction and favorite/recent/repeated meals.
- Add basic history/detail and edit/undo. Keep existing working food search and manual capture; redesigning screens does not require replacing reliable integrations.
- Start personal targets as opt-in entered values, not generated prescriptions.
- Persist drafts early; an internet outage or cold start must not erase current entry. Initially the server remains the authoritative history.
- Exit gate: the owner can complete normal training/food tasks faster or with fewer corrections, with no unexplained loss/duplication.

**Phase 2 — flexible program and trustworthy progress.**

- Add planned weekday/order, move/skip/swap, per-exercise history, transparent chart definitions and a short weekly review.
- Add editable meal-library portions/recipes only as needed.
- Introduce confirmed-vs-pending display and retry safety wherever writes can be repeated.
- Exit gate: actual workout history matches the owner's expectations and a program edit does not change old results.

**Phase 3 — resilient mobile experience, then optional accelerators.**

- Add installability and an offline shell; extend limited local drafts into an explicit outbox only if connectivity/hosting pain warrants it.
- Test reconnect, duplicate submission, expired auth, browser eviction, simultaneous phone/desktop edits and service-worker upgrades.
- Improve photo review or add barcode capture if observed friction persists; do not add voice, coaching or integrations merely because competitors have them.
- Evaluate a modest paid backend against offline engineering effort if cold starts remain the dominant issue. No deceptive “instant online” promise.

These are decision gates, not calendar promises. Preserve current service/entities where their semantics fit, add narrow contracts where they do not, and avoid replacing the stack or building a full local-first replication engine during a visual overhaul. Schema changes need an explicit reversible plan; do not introduce a migration strategy or rely on automatic synchronization destructively without an owner decision.

**Proposed personal measures — hypotheses, not external benchmarks:**

| Measure | How to observe it | Reason |
|---|---|---|
| Favorite meal capture time | Same meal/task before and after; e.g. aim for ~10 seconds once familiar | Tests the repeated-use loop |
| Set recording time | Typical confirmed set with numeric keyboard; e.g. ~5 seconds | Checks that workout mode helps rather than distracts |
| Corrections/abandonment | Count wrong portions, accidental checks and unfinished flows | Reveals hidden friction behind nominal speed |
| Capture coverage | Logged actual sessions / sessions owner says occurred; food days compared with chosen intent | Measures usefulness, not app opens |
| Trust failures | Lost/duplicated records, planned sets counted as real, old history changing unexpectedly | Zero known failures is a release requirement |
| Resume reliability | Refresh/close/reopen/cold-start/outage rehearsals | Protects capture at the point of use |
| Warm vs cold responsiveness | Separate first useful screen from first server response | Avoids blaming UI for hosting behavior |
| Felt burden and usefulness | Brief weekly owner rating and one sentence: “What annoyed/helped me?” | Captures experiential value |
| Progress comprehension | Owner can explain a chart and verify it against a session | Guards against impressive but misleading visuals |

Use a short baseline (for example one normal week) and several post-release weeks (for example two to four), chosen to include the owner's normal schedule. These periods and timings are pragmatic proposals, not validated sample sizes. A/B significance testing is inappropriate for one owner. Keep telemetry local/private and content-free where possible; the app should not need third-party analytics to evaluate itself.

### Gaps

- No baseline timing, frustration log or usage frequency was supplied.
- No effort estimate is justified without inspecting the implementation and existing data.
- Hosting plan behavior was checked in documentation, not measured on this deployment. Free-tier database backup/recovery entitlement needs separate verification.

## 5. What privacy, AI-food and offline/PWA risks should constrain the design?

### Takeaway

Treat the record as private and irreplaceable even though it belongs to one person. PWA installation is a distribution convenience, **not** a guarantee of offline capture, secure local storage or durable backup; AI food estimates need an explicit review boundary.

### Cited Findings

- **Direct research evidence:** In a 2017 observational study of 493 college students, calorie-tracker use was associated with greater eating concern/restraint, and fitness tracking with eating-disorder symptomatology after specified adjustments. This cannot show that tracking caused those symptoms or predict this owner's response. Abstract retrieved through Europe PMC because the PubMed page required cookies. — [Simpson and Mazzeo, DOI](https://doi.org/10.1016/j.eatbeh.2017.02.002); [Europe PMC record](https://europepmc.org/article/MED/28214452)
- **Direct provider evidence:** Anthropic says commercial/API inputs and outputs are not used for model training by default, with exceptions for feedback or explicit permission. This policy is not equivalent to “data never leaves the device” or zero retention. — [Anthropic API training policy](https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training)
- **Direct provider evidence:** Anthropic's standard API retention policy says backend inputs/outputs are deleted within 30 days, with exceptions including policy/safety/legal cases; the policy also describes covered-model and feedback retention. Do not promise unconditional 30-day deletion or assume a zero-retention agreement. — [Anthropic retention policy](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data)
- **Direct browser evidence:** Browser storage is best-effort by default; persistence can be requested but browsers may approve or deny it. Users can delete stored data, and private-mode data usually disappears when the session ends. — [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- **Direct browser evidence:** Offline operation requires explicit service-worker caching strategies; cache-first can serve stale data. Background workers can terminate, and retry behavior does not guarantee an operation completes while the app is closed. — [MDN offline/background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
- **Direct infrastructure evidence:** Render free filesystem writes disappear on redeployment, restart or spin-down. The Render page's free-Postgres expiration rules apply to Render Postgres, **not automatically to the project's Neon database**. — [Render free instances](https://render.com/docs/free)

### Inferences

**Exercise/food privacy:**

- Logs can reveal daily routines, locations through photo backgrounds/metadata, body goals and sensitive health-related patterns. Treat them as sensitive by design, without asserting every food entry automatically has the same legal classification.
- Keep owner-only access on every API route, not just the frontend. Keep credentials/provider keys server-side; avoid logging meal contents, images or authentication tokens in diagnostic tools.
- Prefer secure, HttpOnly session cookies where appropriate, with correct cross-origin/CORS/CSRF handling for the deployment; offline functionality must not bypass server authorization on sync.
- Minimize collection. Don't add injuries, diagnosis, body photos, location or medication fields without a real purpose.
- Provide export, deletion, backup/restore and a clear description of where cloud/local/AI data goes. A household-purpose legal exception, if applicable, is not a technical security strategy; broader sharing/service provision needs separate legal review.
- Do not frame calories as moral success/failure. Offer calorie-hidden or protein/meal-focused display and allow targets to be turned off. No default restrictive nutrition plan.

**Food-photo AI:**

- Keep manual/favorite capture fully usable without AI.
- Before upload, identify the external processor and purpose. Offer cropping and avoid identifying people/house interiors; remove metadata where practical.
- Send only the image and minimum food-analysis context, not the owner's whole history.
- Keep original images transient by default; do not store them on Render's ephemeral disk as a persistence solution. If future image history is explicitly wanted, choose durable object storage, access controls and retention deliberately.
- Return editable identified foods, portions and nutrient estimates with visible uncertainty/source labels; require confirmation before logging.
- Distinguish label/OFF data from AI estimates. A photograph cannot establish every ingredient, oil or portion with certainty; no model-specific accuracy rate was verified here.
- Handle refusal, timeout, malformed response and unavailable service without losing the meal draft. Do not quietly fall back to invented calorie values.
- Recheck model/provider retention terms at release because current policies contain model-specific exceptions.

**Recommended architecture scope: server-backed with limited local resilience.**

1. Keep Postgres as authoritative history and independently back it up.
2. Cache the public application shell selectively; do not blanket-cache authenticated API responses or images.
3. Store necessary current drafts in IndexedDB, with schema/version handling and an explicit local-data explanation. Browser-origin isolation is not a promise of application-level encryption or protection from XSS/unlocked-device access.
4. If offline writes are added, use a durable local outbox, client IDs, idempotent server writes, version checks and visible **Sur cet appareil / En attente / Synchronisé / À résoudre** states.
5. Retry on foreground/reconnect as a baseline; treat background sync as progressive enhancement, not a cross-browser guarantee.
6. Define conflicts for phone/desktop concurrent edits; never silently overwrite performed records. A one-person app can still have multiple devices.
7. On logout, avoid silent draft loss: warn about unsynced work and offer sync/export/discard before clearing private caches. Revoked sessions cannot upload until reauthenticated.
8. Test service-worker updates, device/browser restarts, storage denial/quota failures, expired login and local-day boundaries, including near midnight/DST. Do not schedule exact rest-timer notifications or background alarms on assumptions about worker longevity.

A static PWA shell can make the interface feel immediate despite a sleeping backend, but it cannot make food search, photo analysis or uncached history work without connectivity. Explain that boundary honestly. A small paid always-on backend may be simpler than full bidirectional replication; make that tradeoff after observing the actual failure mode.

### Gaps

- This research is not a security audit or a legal assessment; authentication/session configuration and deployment data-region choices were not inspected.
- Owner device/browser combinations, cross-device requirements, provider contract exceptions and desired photo retention are unknown.
- No reliable model-specific food-photo accuracy was verified. Avoid accuracy claims and pseudo-precise confidence scores.
- The verified literature does not prove harmful or beneficial psychological effects for this owner; optionality and nonjudgmental defaults are prudent design safeguards.

**Overall synthesis:** make Operation10 an enduring personal **daily sport-and-food journal**, with a focused, honest workout mode and an efficient meal library underneath. Keep the four-destination IA small, import only the owner's real program/reference data, deliver capture and trust before dashboards, and earn additional features through observed daily friction rather than competitor breadth.
