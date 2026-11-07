# Daily sport and meal experience for Operation10

Research checked **7 November 2026**. Scope: Gaëtan’s deployed, personal, mobile-first web app; sport and meals only. The supplied four-day split and reference loads are user context, not a training prescription or measured workout history. Recommendations below are design inferences, not proven outcomes for Operation10.

Evidence labels: **Product documentation** verifies a documented interaction, not its effectiveness; **design guidance** supports a general interaction principle; **research** supplies empirical findings with population and methodological limitations. Undated sources are explicitly marked, rather than assigning the access date as a publication date.

## What flows reduce effort to start, log, resume, and review a workout?

### Takeaway

Start from a reusable routine, record actual activity with explicit completion, and make interruption recovery dependable. Separate the routine, its reference values, the active draft, and the completed session: reducing typing must never manufacture performance.

### Cited Findings

- **Product documentation:** Strong offers an empty workout or a template as starting points; exercises, sets, and notes remain editable while training. Each set is completed by checking a box after entering its weight/reps. A workout may be finished without completing every exercise and remains available in History. **Updated 14 February 2022.** — [Strong: performing a workout](https://help.strongapp.io/article/229-my-first-workout).
- **Product documentation:** Strong explicitly distinguishes a template from a performed workout: template sets cannot be completed and a template has no completion date/time. Templates can be created from actual historical workouts. **Updated 20 May 2021.** — [Strong: templates](https://help.strongapp.io/article/105-about-templates).
- **Product documentation:** Strong’s rest timer can start when a set is completed, remains compact, expands on demand, and can be changed or skipped. Its documented default is a product setting, **not** a recommendation to copy a rest duration. **Updated 8 February 2021.** — [Strong: rest timer](https://help.strongapp.io/article/231-rest-timer).
- **Product documentation:** Strong permits editing a past workout through History and explicitly saving changes. **Updated 22 February 2022.** — [Strong: editing history](https://help.strongapp.io/article/249-how-do-i-edit-a-past-workout).
- **Design guidance:** Recognition is easier than recalling information without cues; visible choices and contextual information reduce memory burden. Article metadata: **published 15 January 2024; modified 31 January 2024.** — [Nielsen Norman Group: recognition and recall](https://www.nngroup.com/articles/recognition-and-recall/).

### Inferences

**Recommendation 2 — Four named, editable routines, not four mandatory weekdays.**

- Offer `Pectoraux / triceps`, `Dos / biceps`, `Jambes`, and `Épaules / bras`; show the last **actually recorded** session date if one exists.
- Flow: `Commencer une séance` → choose routine → active workout. Preserve an equally available `Séance libre`. A suggested next routine is optional and overridable; do not bind the split to invented weekdays.
- Imported exercise weights belong under `Charge de référence — fournie par Gaëtan`. Only display `Dernière séance` when a real recorded session exists. No automatic “record,” progression graph point, or suggested progression from those references.
- Leave unknown sets/reps empty. Explicitly entered current-session values are required for a completed set. A reference may be copied deliberately, never counted as performed merely because it was displayed.
- **Evidence basis:** Strong’s template/session distinction and NN/g’s recognition principle support the structure, not a demonstrated adherence uplift. — [Strong templates](https://help.strongapp.io/article/105-about-templates); [NN/g](https://www.nngroup.com/articles/recognition-and-recall/).
- **Tradeoff:** More visible context takes space. Keep provenance in a small secondary line and disclose full history on tap. Do not import Strong’s subscription limits or commercial default routines.

**Recommendation 3 — A recoverable workout draft and a compact, explicit set logger.**

- Current exercise first; numeric weight/reps inputs and a large completion control. Offer add, remove, reorder, and notes without forcing a separate “preparation” stage.
- Persist edits incrementally; use a durable draft identifier, local draft recovery, and visible `Enregistré`, `En cours d’enregistrement`, or `À synchroniser`. Returning after a reload should offer `Reprendre la séance`, at the current exercise with the entered values intact.
- Keep current elapsed/rest timing compact and optional. A timer should use stored timestamps so returning from a backgrounded mobile tab does not require uninterrupted JavaScript execution. Do not claim dependable background sound/notification delivery without testing the target phone/browser.
- `Terminer` leads to a short factual review. Distinguish completed sets from skipped or unfinished entries. Allow saving a partial session and editing afterward; never turn unchecked rows into completed sets.
- **Evidence basis:** Editable, partially finishable logging and optional compact timing are documented precedents; autosave and recovery are an Operation10 reliability recommendation, **not a verified Strong feature in the consulted material**. — [Strong workout flow](https://help.strongapp.io/article/229-my-first-workout); [timer](https://help.strongapp.io/article/231-rest-timer); [history editing](https://help.strongapp.io/article/249-how-do-i-edit-a-past-workout).
- **Tradeoff:** Recovery and synchronization require more implementation than a final-submit form. For a daily mobile app, avoiding lost work deserves priority over animated workout summaries. Prevent duplicate saves on retry.

### Gaps

- No comparative study retrieved establishes that Strong’s flow is faster or improves adherence versus Operation10.
- The consulted product documents do not establish crash recovery or offline behavior. Implement and test these explicitly rather than borrowing an assumed guarantee.
- No missing exercise prescriptions have been inferred.

## What nutrition capture patterns reduce friction while keeping corrections transparent and estimates honest?

### Takeaway

Repeated meals should be reusable, but decomposable and editable. Photo or text interpretation should propose a draft, not silently create “precise” nutrition; product identification, portion measurement, and nutrient data quality are separate uncertainties.

### Cited Findings

- **Product documentation:** MacroFactor can select foods already on the timeline, create a recipe, adjust it, specify servings, and save or save-and-log. **Publication/update date not displayed; accessed 7 November 2026.** — [Create recipes from timeline foods](https://help.macrofactorapp.com/en/articles/14-create-recipes-from-foods-on-your-food-timeline).
- **Product documentation:** MacroFactor can “explode” a recipe into individual ingredients and edit individual quantities before logging. Changing recipe servings before exploding scales the ingredient quantities. **Publication/update date not displayed; accessed 7 November 2026.** — [Explode recipes](https://help.macrofactorapp.com/en/articles/3-explode-recipes).
- **Product documentation:** Cronometer describes photo logging as a starting point for review: change serving sizes, remove/swap foods, add missing ingredients. It notes uncertainty around milk, mayonnaise, cooking oil, and other concealed ingredients; suggested additions are explicitly added by the user. **Visible publication date 8 September 2025; no update date verified.** — [Cronometer photo logging](https://cronometer.com/blog/photo-logging/).
- **Product documentation:** Cronometer differentiates food search for entry/source/amount control, barcode scanning for packaged products, and photo/voice interpretation for convenient drafts. It supports selecting several search results before adding them and customizing frequently used capture actions. **Published 14 May 2026; no update date verified.** — [Four ways to log food](https://cronometer.com/blog/4-ways-to-log-food-on-cronometer/).
- **Product documentation:** Cronometer permits taking a photo now and uploading/reviewing it later, with a photo timestamp used for the diary time. Claims of “better adherence,” speed, and precision on this page are **vendor claims**, not an independent outcome evaluation. — [Photo logging, 8 September 2025](https://cronometer.com/blog/photo-logging/).

### Inferences

**Recommendation 4 — Make repetition the first-class meal shortcut.**

- In `Ajouter un repas`, show a short personal list of favorites/recent meals before general food search. Offer `Reprendre ce repas` and `Répéter hier`; make the selected meal/day and destination date obvious.
- A repeated meal must keep individual foods and quantities accessible: `Modifier les ingrédients`, not an opaque calorie blob. Let Gaëtan scale the meal or remove one component without changing the saved favorite.
- Saving a new favorite or updating an existing one should be explicit. Copying a day should be an intentional action with undo/duplicate protection, not a silent inference about what was eaten.
- **Evidence basis:** Existing foods → recipe and recipe → editable ingredients are documented patterns; favorites ordering and “repeat yesterday” are Operation10-specific extrapolations. — [MacroFactor recipe creation](https://help.macrofactorapp.com/en/articles/14-create-recipes-from-foods-on-your-food-timeline); [ingredient expansion](https://help.macrofactorapp.com/en/articles/3-explode-recipes); [NN/g recognition](https://www.nngroup.com/articles/recognition-and-recall/).
- **Tradeoff:** Reuse can perpetuate incorrect quantities. Always make the amount visible and preserve the distinction between editing this occurrence and updating the reusable meal.

**Recommendation 5 — One capture entry, several honest routes, one editable review.**

- `Ajouter un repas` offers `Habituels`, `Rechercher`, `Photo`, and, if worthwhile to implement, `Code-barres`. Voice/natural-language capture is optional, not a prerequisite for the redesign.
- Use search/barcode for known packaged foods; verify product name, brand, amount/unit, and per-100-g versus per-serving basis. A barcode identifies a database entry, not the portion actually eaten.
- Photo flow: photo → ingredient draft → editable amounts/source → explicit `Enregistrer`. Show `Estimation photo` persistently after saving; a reviewed photo remains estimated unless the uncertain inputs were replaced by measured/known ones.
- Ask a small, relevant question such as `Huile ou sauce à ajouter ?`; never auto-add an assumed condiment or display an uncalibrated “98% confidence.” Allow `À compléter` with a photo/text note when the user cannot estimate now.
- Store food source, amount/unit, capture method, and any user correction. User correction must survive reruns; changing the current entry must not silently overwrite a reusable food definition.
- Prefer rounded estimated totals with `≈`, rather than apparent decimal precision. Do not fabricate numeric uncertainty intervals without a validated method.
- **Evidence basis:** Cronometer’s review-first photo flow and differentiation between search, barcode, and interpreted capture support the interaction; persistent provenance, draft-only entries, and confidence policy are proposed safeguards. — [Photo logging](https://cronometer.com/blog/photo-logging/); [capture methods](https://cronometer.com/blog/4-ways-to-log-food-on-cronometer/).
- **Tradeoff:** Review costs taps; unreliable auto-saving costs trust. Use direct save for an already-correct favorite, but review uncertain photo results. External AI capture also introduces latency, operating cost, and data transmission; self-hosting alone does not imply photos stay on the server.

### Gaps

- No independent accuracy benchmark for Operation10’s current image model or food lookup was obtained. Do not copy Cronometer’s database-quality claims onto Open Food Facts or the app’s AI output.
- Cronometer’s page inconsistently describes the photo source as “NCCDB and CFCD” and later “only NCC”; therefore the exact present database coverage is not treated as established.
- No measured tap count or logging-time reduction is available for these patterns.

## How can a daily dashboard answer “what can I do now?” without empty counters and overloaded charts?

### Takeaway

Use the home screen as a launchpad and recovery surface, not a scoreboard. Show useful state and next actions; put longitudinal interpretation in an optional review view.

### Cited Findings

- **Design guidance:** Visible options and context support recognition rather than recall. This justifies recognizable routine/meal shortcuts, but does not by itself establish an optimal dashboard layout. **Published 15 January 2024; modified 31 January 2024.** — [NN/g](https://www.nngroup.com/articles/recognition-and-recall/).
- **Product documentation:** Cronometer lets people prioritize, rearrange, and remove capture actions without removing access to the underlying feature. **Published 14 May 2026.** — [Customizable plus menu](https://cronometer.com/blog/4-ways-to-log-food-on-cronometer/).
- **Research, systematic review:** Across 22 weight-management studies, self-monitoring was consistently associated with weight loss, but the authors explicitly judged the evidence weak because of methodological limitations; samples were predominantly White and female, and adherence was often self-reported. The necessary “dose” of monitoring was not established. **Final journal publication January 2011; PMC manuscript available 30 January 2012.** — [Burke et al., self-monitoring systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC3268700/).

### Inferences

**Recommendation 1 — “Aujourd’hui” as a calm, state-aware launchpad.**

- Stable navigation: `Aujourd’hui`, `Sport`, `Repas`; review/history is accessible within the latter sections. Revision has no place in this core experience.
- At the top: local date, then the active workout’s `Reprendre` if applicable; otherwise `Commencer une séance`. Adjacent/next: `Ajouter un repas`.
- Below: current-day entries and, only when relevant, `Repas à compléter`. Small personal routine/meal shortcuts provide immediate choices without a wall of categories.
- Empty meal day: `Aucun repas enregistré — Ajouter un repas`, not “0 kcal consumed.” No workout recorded is not proof of inactivity. Connection/loading errors must not masquerade as an empty day.
- After saving, reflect what exists: `Séance enregistrée` / meal name and time, with `Modifier`. Avoid automatic conclusions about whether Gaëtan has done “enough.”
- **Evidence basis:** Recognition and customizable frequent actions support the proposal; the exact home-screen hierarchy is a design hypothesis. — [NN/g](https://www.nngroup.com/articles/recognition-and-recall/); [Cronometer](https://cronometer.com/blog/4-ways-to-log-food-on-cronometer/).
- **Tradeoff:** Less dashboard density means an additional tap for analysis. That is deliberate: opening the app to log lunch should not require interpreting an eight-week chart.

**Recommendation 6 — Review actual records and coverage before trends.**

- Session review: completed exercises/sets and optional notes; distinguish unfinished content. Offer editing before charts.
- Meal review: food list, portions, source/estimate label, and `Modifier`. If macros are useful, label them `Total enregistré`, not the day’s definitive intake.
- Optional weekly view: sessions actually recorded, dates/routines, and a meal diary. For trends, distinguish `journée non renseignée`, `partielle`, and a day explicitly marked complete; partial/absent logging must not become a zero or a deficit.
- Load progression should compare real dated sessions of the same exercise with reps/set context. Reference loads are excluded. Show `Pas encore de séances comparables` and a helpful logging action instead of an empty chart.
- **Evidence basis:** Editable workout history and the review’s emphasis on truthfulness/timeliness support record integrity; this chart/coverage policy is an inference, not an empirically validated layout. — [Strong history editing](https://help.strongapp.io/article/249-how-do-i-edit-a-past-workout); [Burke et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC3268700/).
- **Tradeoff:** Coverage metadata adds complexity. Avoid forcing a daily “close” task: completeness should be optional and claimed only when explicitly confirmed.

### Gaps

- No source retrieved validates this exact action-first dashboard or proves that removing charts improves retention.
- Weight-loss self-monitoring evidence cannot establish what Gaëtan needs, nor justify automatic calorie targets, body-weight monitoring, or a daily logging quota.

## Which patterns are broadly useful, and which risk notification fatigue or shame?

### Takeaway

Reliable recovery, reusable inputs, and understandable corrections are useful independent of motivational style. Streak pressure, judgmental nutrition colors, and repeated prompts are neither necessary nor justified for this personal app.

### Cited Findings

- **Product philosophy:** MacroFactor defines “adherence neutral” as no functional/visual coercion or shame for not meeting nutrition targets. It explicitly avoids red over-target numbers, moral labels on foods, and instructions to compensate after exceeding targets. This is the vendor’s design rationale, **not a randomized test of its UI**. **Published 27 September 2023; modified 12 September 2025**, verified in article metadata. — [MacroFactor adherence neutrality](https://macrofactor.com/adherence-neutral/).
- **Research, naturalistic longitudinal study:** Lally et al. recruited 96 volunteers to repeat a chosen eating/drinking/activity behavior in a consistent context for 12 weeks. Habit automaticity varied substantially; the abstract reports that missing one opportunity did not materially affect habit formation. **Published online 16 July 2009; print October 2010.** Publisher abstract/date metadata were retrieved through Crossref because Wiley full text returned 403. — [Original DOI](https://doi.org/10.1002/ejsp.674); [retrieved publisher-deposited abstract](https://api.crossref.org/works/10.1002/ejsp.674).
- **Research, observational clinical sample:** In 105 people diagnosed with eating disorders, approximately 75% had used MyFitnessPal; 73% of those users perceived it as contributing to symptoms. Associations and self-reported perceptions do **not** demonstrate causation or predict risk for Gaëtan/the general population. **Published online 18 August 2017**, verified in PMC metadata. — [Levinson et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC5700836/).
- **Official design guidance:** Apple recommends consent, concise high-value notifications, no repeated notifications for the same item even if unanswered, and unobtrusive updates while the app is foregrounded. It warns against showing sensitive information in notifications and reserves app badges for unread notifications, not unrelated numeric scores. **Publication/update date not displayed; accessed 7 November 2026.** — [Apple notification guidance](https://developer.apple.com/design/human-interface-guidelines/notifications); [retrieved full guidance](https://developer.apple.com/design/human-interface-guidelines/notifications.md).

### Inferences

**Recommendation 7 — Neutral continuity, no streak debt, reminders off by default.**

- Use `Enregistré`, `À compléter`, `Reprendre`, and factual quantities. No `Échec`, “bad foods,” red shame states for target deviation, “earn your meal,” or compensatory workout messaging.
- A missing day stays missing. Do not make return contingent on filling yesterday, repairing a streak, or explaining an absence. Consistent contextual cues can be supported without suggesting daily exercise or an uninterrupted logging chain.
- Allow a simplified meal view without prominent calorie totals if Gaëtan prefers. This is a user-controlled display choice, not a clinical intervention.
- Start with no push reminders. If Gaëtan requests them later: one opt-in reminder tied to his chosen time/context, with pause/disable controls, cancellation when the relevant draft/action is resolved, and no escalation after nonresponse.
- A chosen rest timer is task feedback, not a daily engagement prompt. Do not expose food amounts, body data, or other sensitive detail on the lock screen.
- **Evidence basis:** Neutrality is a documented product philosophy; the habit study weakens the premise that one missed opportunity must be punished; Apple supplies explicit fatigue safeguards. None proves that a streak-free Operation10 will improve adherence. — [MacroFactor](https://macrofactor.com/adherence-neutral/); [Lally et al.](https://doi.org/10.1002/ejsp.674); [Apple](https://developer.apple.com/design/human-interface-guidelines/notifications).
- **Tradeoff:** Some people enjoy streaks or reminders, but this assignment explicitly prioritizes noncompulsive daily return. Removing pressure may reduce superficial app-open counts; fewer opens with successful, low-effort logging can still be the better product outcome.

Broadly useful candidates: routine reuse, transparent recipe expansion, editable estimates, undo/edit, honest missing-data states, draft recovery. Optional/context-dependent: timers, numeric nutrition goals, voice/photo capture, charts, reminders. Exclude from this redesign by default: social feeds, leaderboard comparisons, challenge subscriptions, streak repairs, automated coaching, and invented workout prescriptions.

### Gaps

- There is no evidence here that any specific UI prevents eating disorders or that Gaëtan has such a condition; do not imply either.
- Direct causal evidence on shame/streaks in this exact context was not retrieved. The clinical study supports caution, not a universal claim that tracking is harmful.
- Apple Fitness, Strava, and Hevy were considered as possible sources, but no sufficiently detailed verified material was retained for a feature-specific recommendation. This is not an exhaustive product audit.

## How should these seven recommendations be prioritized and checked?

### Takeaway

Prioritize integrity and fast resumption before advanced automation. Evaluate task success and comfort for the actual user, not engagement mechanics.

### Cited Findings

- Clear separation of templates and performed sessions is a directly documented precedent. — [Strong templates, updated 20 May 2021](https://help.strongapp.io/article/105-about-templates).
- Photo logging is explicitly positioned as an editable starting point with limitations for concealed ingredients. — [Cronometer photo logging, published 8 September 2025](https://cronometer.com/blog/photo-logging/).
- Existing monitoring research leaves the optimal monitoring dose unresolved and has limited generalizability. — [Burke et al., January 2011](https://pmc.ncbi.nlm.nih.gov/articles/PMC3268700/).

### Inferences

- **First delivery:** R1 action-first Today, R2 four routine templates/reference provenance, R3 persistent resumable workout, R4 repeatable editable meals, R7 neutral language/no default reminders.
- **Next:** R5 unified capture review/provenance and R6 honest review/history. Keep existing working photo/search functions where possible; their redesign should improve review and reliability before adding another AI modality.
- **Acceptance checks proposed for Gaëtan’s phone:** start a routine without retyping its exercises; refresh during a workout and recover exact entered values; navigate to meals and resume; retry a failed save without duplicates; save a partial workout without fake completed sets; repeat a meal and correct one ingredient without mutating the favorite; review a photo estimate and preserve corrections; see no-data/offline states without fake zeros; return after several missed days with no penalty.
- **Lightweight evaluation:** time/steps to first useful action, time to record a familiar meal, successful interruption recovery, number of lost/duplicate records, correction ease, and Gaëtan’s own assessment of pressure/clutter. Treat any target values as local acceptance goals, not published industry benchmarks. No remote analytics platform is necessary.

### Gaps

- These notes contain no baseline measurements for the deployed app. Validate with actual use before claiming redesign improvements.
- Mobile-browser autosave, storage, timing, and notification behavior require device testing; documentation about native apps does not transfer those guarantees to a self-hosted web app.
