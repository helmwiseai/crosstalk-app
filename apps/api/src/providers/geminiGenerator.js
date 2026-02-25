import { buildSessionPrompt } from '../prompts/sessionPrompt.js';

export class GeminiGenerator {
  constructor({ apiKey, model = 'gemini-2.5-flash' }) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate({ topic, targetWords, userInput, repairMode, recentTurns = [] }) {
    if (!this.apiKey) throw new Error('missing_gemini_api_key');

    const prompt = buildSessionPrompt({
      topic,
      targetWords,
      repairMode,
      userInput,
      recentTurns
    });

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.45,
        maxOutputTokens: 220,
        thinkingConfig: { thinkingBudget: 0 }
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`gemini_http_${res.status}`);

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('gemini_empty_response');

    return {
      assistantTextPtBr: text,
      intentAligned: true,
      repairNeeded: repairMode,
      shiftIntent: false,
      nextQuestion: /\?/.test(text) ? text.split('?').slice(-2, -1)[0]?.trim() + '?' : ''
    };
  }
}
