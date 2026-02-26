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
Week 1 foundation is live:
- Session lifecycle endpoints implemented
- Prompt-first turn pipeline in place (natural conversation + light guardrails)
- E2E smoke script available (`npm run test:e2e`)
- Simple web UI available (`apps/web`)

## Quick text demo
1. Start API: `node apps/api/src/server.js`
2. In a second terminal: `npm run demo:text`

## Quick web UI
1. Terminal A: `node apps/api/src/server.js`
2. Terminal B: `npm run dev:web`
3. Open: `http://127.0.0.1:5173`
