#!/usr/bin/env node
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const API = process.env.CROSSTALK_API_URL || 'http://127.0.0.1:3001';

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function checkHealth() {
  const res = await fetch(`${API}/health`);
  if (!res.ok) throw new Error(`health check failed: ${res.status}`);
  return res.json();
}

const rl = readline.createInterface({ input, output });

try {
  const health = await checkHealth();
  console.log(`\n✅ API online (${health.service}) generator=${health.generator}`);

  const userId = (await rl.question('User id [pat]: ')).trim() || 'pat';
  const topic = (await rl.question('Optional topic (enter to auto): ')).trim();

  const start = await post('/sessions/start', {
    userId,
    targetLanguage: 'pt-BR',
    ...(topic ? { topic } : {})
  });

  const sessionId = start.sessionId;
  console.log(`\n🟢 Session started: ${sessionId}`);
  console.log(`Topic: ${start.topic}`);
  console.log(`Target words: ${start.targetWords.join(', ')}`);
  console.log('\nType messages. Commands: /end to finish, /quit to abort\n');

  while (true) {
    const msg = (await rl.question('You> ')).trim();
    if (!msg) continue;

    if (msg === '/quit') {
      console.log('Aborted without end call.');
      break;
    }

    if (msg === '/end') {
      const end = await post('/sessions/end', { sessionId });
      console.log('\n🏁 Session summary');
      console.log(`Topic: ${end.topic}`);
      console.log(`Summary: ${end.summary}`);
      console.log('Exposure:');
      for (const row of end.exposureSummary) {
        console.log(`- ${row.lemma}: ${row.count}`);
      }
      break;
    }

    const turn = await post(`/sessions/${sessionId}/turn`, {
      userInput: msg,
      inputMode: 'text'
    });

    console.log(`Bot> ${turn.assistantTextPtBr}`);
    console.log(`   [provider=${turn.providerUsed} repair=${turn.repairMode} aligned=${turn.intentAligned} attempt=${turn.repairAttempt}]`);
  }
} catch (err) {
  console.error(`\n❌ ${err.message}`);
  console.error('Tip: start API first: node apps/api/src/server.js');
  process.exitCode = 1;
} finally {
  rl.close();
}
