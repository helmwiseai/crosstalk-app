# Architecture v0

## Core services
- Conversation Controller (constraints + repair loop)
- Exposure Engine (target words + distribution)
- Session Store (users/sessions/turns/exposures)

## Provider abstraction
- `LLMProvider`
- `ASRProvider`
- `TTSProvider`

Gemini can be primary provider for MVP while keeping interfaces provider-agnostic.
