# PM Log — Crosstalk App

## 2026-02-25
- Product direction locked:
  - Long-term: generic multi-language architecture
  - MVP: Portuguese (pt-BR)
  - UX target: Gemini Live-style voice experience
- Storage/coordination established in Google Drive folder:
  - Folder: `Crosstalk App`
  - Charter, Backlog, Decisions, Weekly Notes, Roadmap board created.
- Engineering kickoff started (Week 1).
- Repo created: `github.com/helmwiseai/crosstalk-app`.
- Risk noted: persistent threaded PM subagent unavailable on current channel; mitigation is strict file-based PM log + periodic focused PM runs.

## Decisions captured from Pat
1. Text fallback allowed for early testing and automation.
2. Data minimization default: store exposure metrics + short summary, not full raw transcript by default.
3. Prioritize easiest local/VPS testing path and fastest shippable loop.

## Implementation notes
- Added `/sessions/:sessionId/turn` endpoint with repair-mode detection and L0 policy wrapper.
- Added `constraintPolicy` scaffold to keep enforcement in code path (not prompt-only architecture).
- End session now emits minimal `summary` + exposure counts.
- Refactor pass completed:
  - introduced `InMemorySessionRepository` behind repository abstraction.
  - introduced explicit `TurnPipeline` (`ingest -> detect -> generate -> enforce -> telemetry -> respond`).
  - split generator from policy enforcement using provider-style `StubGenerator`.
  - added language profile config (`pt-BR`) so future languages are config-driven instead of hardcoded.
- Gemini integration completed (text generation path):
  - Added `GeminiGenerator` provider and wired provider selection via env (`GENERATOR_PROVIDER=gemini|stub`).
  - Added fallback-to-stub behavior on provider failure.
  - Kept Level-0 policy enforcement server-side after generation.
  - Added local env loader for VPS/dev simplicity.
  - Verified live request path returns `providerUsed: "primary"` when Gemini succeeds.
- Conversation integrity rework (Phase 1) completed:
  - Added intent classification/alignment gate (`intent.js`).
  - Added repair-attempt state and graceful-abandon behavior in turn pipeline.
  - Added no-blind-yes-and flow: misaligned replies trigger controller repair, not topic drift.
  - Added telemetry fields for intent alignment + repair attempts.
  - Verified with scripted misalignment test ("I love bread" after a question) -> repair path triggered (`providerUsed: controller`, `intentAligned: false`).

## PM Questions Pending
1. For summary retention window, keep session summaries indefinitely or auto-expire after N days?
2. For pilot analytics, okay to store anonymized turn-level signals (repairMode flag, targetHits count) without full text?
3. For Week 2, do we prioritize realtime voice transport first, or Gemini provider integration first (text-in/text-out), then voice?


## Decisions confirmed (2026-02-25 follow-up)
4. Session summaries retention: keep forever (short summaries only).
5. Telemetry approved: store anonymized turn signals (`repairMode`, `targetHits` count) without full text.
6. Week 2 execution order: Gemini text integration first, then realtime voice transport.
7. Product direction reminder: maintain end-goal architecture for realtime voice-first Crosstalk experience while sequencing for fastest shippable MVP.

## Product Note (ALG exposure model) — 2026-02-25
- Pat confirmed conceptual direction for Level 0:
  - Define Level-0 lexicon as approximately the 300 most common words in target language.
  - Goal is high-frequency comprehensible exposure, not tight scripted output.
  - Working threshold concept: each Level-0 word should be heard at least ~100 times before advancing focus.
- Implementation preference:
  - Maintain natural conversation flow (ALG-aligned), avoid over-constrained robotic output.
  - Track broader incidental vocabulary, but keep scheduler pressure on underexposed Level-0 words.
  - Favor dynamic focus bands over rigid hard-gate progression to avoid stale conversations.
- Action: capture as design rule now; defer coding changes until explicitly requested.


- W1-008 completed:
  - Added Prisma schema draft for Postgres persistence focused on sessions/summaries/exposures/anonymized telemetry.
  - Explicitly excludes full raw transcript persistence by default.


- Architecture rework (Prompt-first session loop):
  - Simplified flow so LLM carries conversation naturally with minimal controller interference.
  - Controller now keeps only hard guardrails: language/quality validation, fallback safety, telemetry, exposure counting.
  - Shifted iteration model to session-based prompt tuning: run session -> collect report -> adjust next prompt.
  - Added end-of-session `sessionReport` with prompt-tuning hints (repair turns, avg response length, low-exposure words).
  - Added full-session all-word exposure tracking (not only target words) for richer analysis and prompt tuning.

## 2026-02-26 — Strategic heartbeat (plan progress + anti-cornering)
### Progress vs roadmap
- Week 1 objective is effectively complete for backend spine; only major open infra item is `W1-011` (Postgres adapter replacing in-memory repository).
- Current sequencing still aligns with agreed roadmap: Gemini text path first, realtime voice transport second.

### Open risks / local optimization signals
1. **Durability risk (high):** in-memory repository is still active, so session continuity and measurement integrity are fragile between restarts.
2. **Prompt-overfit risk (medium):** session-based prompt tuning is productive, but without fixed acceptance tests it can optimize for recent demo behavior while regressing broader conversation quality.
3. **Provider coupling risk (medium):** Gemini-first path is fine for MVP speed, but current implementation could drift toward Gemini-specific assumptions before alternative provider parity checks exist.
4. **Language-scope drift risk (medium):** pt-BR focus is correct for MVP; risk is hardcoding creeping into policy/exposure logic and making later multi-language extension expensive.

### Anti-cornering check (short)
- **Not cornered yet**, but trend is visible toward prompt-led iteration as the primary lever.
- To preserve long-term flexibility, keep control points in code (interfaces, evaluators, storage model) and use prompts as behavior tuning, not architecture.

### Next 3 priorities
1. **Close W1-011:** ship Postgres session repository + migration path; make it the default non-test backend.
2. **Add a lightweight eval harness:** define 8-12 repeatable turn scenarios (intent alignment, repair behavior, target-word exposure pressure, hallucination guardrails) and gate prompt changes against it.
3. **Run a de-hardcode pass for multilingual readiness:** centralize all pt-BR specifics into language profiles/config and add one “shadow” second-language config to prove no hidden assumptions.

## 2026-02-26 — Strategic heartbeat (follow-up recheck)
### Progress vs roadmap
- No material change since prior heartbeat entry today: Week 1 backend spine still complete except `W1-011`.
- Sequencing remains valid: Gemini text stabilization before realtime voice transport.

### Open risks / dead-end check
- **Durability:** unchanged high risk until Postgres adapter lands.
- **Evaluation gap:** unchanged medium risk; prompt changes still weakly gated.
- **Provider/language flexibility:** unchanged medium risk; avoid Gemini/pt-BR assumptions in core flow.

### Anti-cornering verdict
- Still **not cornered**, but no evidence yet that flexibility is enforced by tests.
- Rule held: prompt tuning may optimize behavior, but architecture guarantees must come from interfaces + repeatable evals.

### Next 3 priorities (unchanged)
1. Ship `W1-011` Postgres repository and make it default runtime backend.
2. Add 8-12 repeatable acceptance scenarios and gate prompt changes.
3. Complete de-hardcode pass and validate with one shadow second-language profile.

## 2026-02-26 — QA Crosstalk regression sweep (cron)
### Scope executed
- API health check (`GET /health`) on local server.
- `npm run test:e2e` (`scripts/e2e-session-smoke.sh`).
- Manual natural-conversation sanity spot-check (`/sessions/start` → two `/turn` calls incl. misunderstanding cue → `/sessions/end`).
- Drift check against prompt-first architecture intent.

### Results
- **API health:** pass (`ok: true`, service live).
- **E2E smoke:** pass.
- **Natural conversation sanity:** pass (normal turn stayed natural; misunderstanding cue triggered `repairMode: true`; session end returned summary/exposure/sessionReport).

### Findings (non-blocking, architecture drift risk)
1. **Durability gap remains active:** runtime still instantiates `InMemorySessionRepository` in `apps/api/src/server.js` (Postgres adapter not yet wired as default).
2. **MVP language gate is still hardcoded at route level:** `/sessions/start` rejects non-`pt-BR` directly in server route logic. This is acceptable for MVP but is a known drift pressure vs profile-driven multi-language architecture.

### QA verdict
- Regression sweep **functionally passes**.
- No immediate release blocker from this run.
- Keep `W1-011` + de-hardcode pass as top architecture integrity priorities.
