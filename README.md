# Crosstalk App

Voice-first language acquisition app.

## Vision
- Long-term: generic multi-language platform
- MVP: Brazilian Portuguese (pt-BR)
- UX target: Gemini Live-style conversation loop

## Monorepo layout
- `apps/web` - mobile-first web client
- `apps/api` - realtime/session API
- `packages/contracts` - shared types/contracts
- `docs` - architecture + planning docs

## Week 1 goals
1. Define contracts for session loop
2. Stand up API skeleton (`/sessions/start`, `/sessions/end`)
3. Web skeleton with session states
4. Add provider abstraction stubs (ASR/TTS/LLM)

## Status
Bootstrap scaffold created.
