import express from 'express';
import { InMemorySessionRepository } from './repositories/inMemorySessionRepository.js';
import { StubGenerator } from './providers/stubGenerator.js';
import { TurnPipeline } from './pipeline/turnPipeline.js';

const app = express();
const sessionRepository = new InMemorySessionRepository();
const turnPipeline = new TurnPipeline({
  sessionRepository,
  generator: new StubGenerator()
});

const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'crosstalk-api' });
});

app.post('/sessions/start', (req, res) => {
  const { userId, topic, targetLanguage } = req.body || {};

  if (!userId) return res.status(400).json({ error: 'userId is required' });
  if (targetLanguage !== 'pt-BR') {
    return res.status(400).json({ error: 'MVP supports only targetLanguage=pt-BR' });
  }

  const session = sessionRepository.startSession({ userId, topic, targetLanguage });

  return res.status(201).json({
    sessionId: session.sessionId,
    topic: session.topic,
    targetWords: session.targetWords,
    level: session.level
  });
});

app.post('/sessions/:sessionId/turn', (req, res) => {
  const { sessionId } = req.params;
  const { userInput, inputMode } = req.body || {};

  if (!userInput || typeof userInput !== 'string') {
    return res.status(400).json({ error: 'userInput (string) is required' });
  }

  const turn = turnPipeline.run({ sessionId, userInput, inputMode: inputMode || 'text' });
  if (!turn) return res.status(404).json({ error: 'session not found' });

  return res.status(200).json({
    sessionId: turn.sessionId,
    assistantTextPtBr: turn.assistantTextPtBr,
    repairMode: turn.repairMode,
    targetHits: turn.targetHits,
    complexity: turn.complexity
  });
});

app.post('/sessions/end', (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  const summary = sessionRepository.endSession(sessionId);
  if (!summary) return res.status(404).json({ error: 'session not found' });

  return res.status(200).json(summary);
});

app.listen(port, () => {
  console.log(`[crosstalk-api] listening on :${port}`);
});
