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
