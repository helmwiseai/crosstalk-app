import express from 'express';
import { SessionStore } from './sessionStore.js';

const app = express();
const store = new SessionStore();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'crosstalk-api' });
});

app.post('/sessions/start', (req, res) => {
  const { userId, topic, targetLanguage } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (targetLanguage !== 'pt-BR') {
    return res.status(400).json({ error: 'MVP supports only targetLanguage=pt-BR' });
  }

  const session = store.startSession({ userId, topic });

  return res.status(201).json({
    sessionId: session.sessionId,
    topic: session.topic,
    targetWords: session.targetWords,
    level: session.level
  });
});

app.post('/sessions/end', (req, res) => {
  const { sessionId } = req.body || {};

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const summary = store.endSession(sessionId);
  if (!summary) {
    return res.status(404).json({ error: 'session not found' });
  }

  return res.status(200).json(summary);
});

app.listen(port, () => {
  console.log(`[crosstalk-api] listening on :${port}`);
});
