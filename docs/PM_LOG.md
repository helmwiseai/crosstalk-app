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

## PM Questions Pending
1. For MVP turn loop, do we allow temporary text-input fallback when mic permissions fail? (recommended: yes)
2. Should pilot transcripts be stored by default for debugging? (recommended: opt-in toggle)
3. Which hosting split do we want for first deploy: all-on-VPS or web on Vercel + API on VPS?
