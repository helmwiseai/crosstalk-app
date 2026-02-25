# DB Plan (W1-008)

Persistence strategy (summary/exposure-first, transcript-minimized):
- Persist users, sessions, short summaries.
- Persist exposure aggregates/events by lemma.
- Persist anonymized telemetry signals only (repairMode, intentAligned, repairAttempt, providerUsed, targetHitCount).
- Do not persist full raw conversation transcripts by default.

Next:
1. Install Prisma client + migrations.
2. Add Postgres-backed `SessionRepository` implementation.
3. Switch repository via env flag.
