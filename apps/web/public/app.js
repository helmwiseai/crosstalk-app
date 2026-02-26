let apiBase = '/api';
let sessionId = null;
let targetWords = [];
let idleTimer = null;
let autoFollowupArmed = false;

const SILENCE_MS = 5000;

const els = {
  userId: document.getElementById('userId'),
  topic: document.getElementById('topic'),
  startBtn: document.getElementById('startBtn'),
  endBtn: document.getElementById('endBtn'),
  sessionMeta: document.getElementById('sessionMeta'),
  chat: document.getElementById('chat'),
  msg: document.getElementById('msg'),
  sendBtn: document.getElementById('sendBtn'),
  report: document.getElementById('report')
};

async function boot() {
  apiBase = '/api';
  appendBot(`UI connected. API proxy: ${apiBase}`);
}

function append(who, text, meta = '') {
  const div = document.createElement('div');
  div.className = `msg ${who}`;
  div.innerHTML = `<span class="who">${who === 'user' ? 'You' : 'Bot'}:</span>${escapeHtml(text)}${meta ? `<br><small>${escapeHtml(meta)}</small>` : ''}`;
  els.chat.appendChild(div);
  els.chat.scrollTop = els.chat.scrollHeight;
}

function appendUser(t) { append('user', t); }
function appendBot(t, m) { append('bot', t, m); }

function escapeHtml(s = '') {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function api(path, body) {
  const r = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `${r.status}`);
  return data;
}

function setActive(active) {
  els.msg.disabled = !active;
  els.sendBtn.disabled = !active;
  els.endBtn.disabled = !active;
}

function clearIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function armIdleFollowup() {
  clearIdleTimer();
  if (!sessionId || !autoFollowupArmed) return;
  idleTimer = setTimeout(async () => {
    if (!sessionId || !autoFollowupArmed) return;
    try {
      const out = await api(`/sessions/${sessionId}/turn`, { userInput: '__silence__', inputMode: 'text' });
      appendBot(out.assistantTextPtBr, `provider=${out.providerUsed} repair=${out.repairMode} auto-followup`);
      // only one auto-followup per user turn to avoid spam loops
      autoFollowupArmed = false;
    } catch (e) {
      appendBot(`Auto follow-up failed: ${e.message}`);
    }
  }, SILENCE_MS);
}

els.startBtn.onclick = async () => {
  try {
    const out = await api('/sessions/start', {
      userId: els.userId.value || 'pat',
      topic: els.topic.value || undefined,
      targetLanguage: 'pt-BR'
    });
    sessionId = out.sessionId;
    targetWords = out.targetWords || [];
    els.sessionMeta.textContent = `Session: ${sessionId} | Topic: ${out.topic} | Target: ${targetWords.join(', ')}`;
    setActive(true);
    els.report.textContent = '(in progress)';
    appendBot(`Sessão iniciada. Tema: ${out.topic}.`);
  } catch (e) {
    appendBot(`Start failed: ${e.message}`);
  }
};

async function sendTurn() {
  const text = els.msg.value.trim();
  if (!text || !sessionId) return;
  clearIdleTimer();
  els.msg.value = '';
  appendUser(text);
  try {
    const out = await api(`/sessions/${sessionId}/turn`, { userInput: text, inputMode: 'text' });
    appendBot(out.assistantTextPtBr, `provider=${out.providerUsed} repair=${out.repairMode}`);
    autoFollowupArmed = true;
    armIdleFollowup();
  } catch (e) {
    appendBot(`Send failed: ${e.message}`);
  }
}

els.sendBtn.onclick = sendTurn;
els.msg.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendTurn();
});

els.endBtn.onclick = async () => {
  if (!sessionId) return;
  clearIdleTimer();
  try {
    const out = await api('/sessions/end', { sessionId });
    appendBot('Sessão encerrada.');
    els.report.textContent = JSON.stringify(out, null, 2);
    sessionId = null;
    setActive(false);
    els.sessionMeta.textContent = 'No active session.';
  } catch (e) {
    appendBot(`End failed: ${e.message}`);
  }
};

boot().catch((e) => appendBot(`Boot failed: ${e.message}`));
