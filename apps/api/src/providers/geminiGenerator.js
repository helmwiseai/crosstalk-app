function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1] || text;
    try {
      return JSON.parse(fenced);
    } catch {
      const cleaned = fenced.replace(/"\s*\n\s*([a-zA-Z])/g, '"$1');
      return JSON.parse(cleaned);
    }
  }
}

function extractField(raw, key) {
  const re = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"`, 'i');
  return raw.match(re)?.[1]?.trim() || '';
}

export class GeminiGenerator {
  constructor({ apiKey, model = 'gemini-2.5-flash' }) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate({
    topic,
    targetWords,
    targetLanguage,
    userInput,
    lastAssistantQuestion,
    repairAttempt,
    activeRepair
  }) {
    if (!this.apiKey) throw new Error('missing_gemini_api_key');

    const systemPolicy = `
Você é parceiro de Crosstalk (ALG) em Português do Brasil.
REGRAS:
- Responda SOMENTE em português.
- Frases curtas, naturais e completas (média ~3-6 palavras; pode variar).
- Conversa natural e fluida; siga o usuário sem forçar tópico.
- Se o usuário fizer comentário social, responda socialmente e continue natural.
- Se o usuário mudar de assunto, acompanhe naturalmente.
- Se houver confusão, simplifique sem virar aula.
- NUNCA traduza para inglês nem ensine gramática.
- Se pedirem significado, explique em português simples com exemplo curto.
- Use palavras-alvo quando natural: ${targetWords.join(', ')}.
`;

    const userPrompt = {
      topic,
      targetLanguage,
      userInput,
      lastAssistantQuestion: lastAssistantQuestion || null,
      repairAttempt,
      activeRepair
    };

    const responseSchema = {
      assistantTextPtBr: 'string',
      intentAligned: 'boolean',
      repairNeeded: 'boolean',
      shiftIntent: 'boolean',
      nextQuestion: 'string|null'
    };

    const instruction = [
      systemPolicy,
      'Retorne APENAS JSON válido, sem markdown.',
      `Schema: ${JSON.stringify(responseSchema)}`,
      `Contexto: ${JSON.stringify(userPrompt)}`
    ].join('\n');

    const body = {
      contents: [{ role: 'user', parts: [{ text: instruction }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
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
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!raw) throw new Error('gemini_empty_response');

    try {
      const parsed = safeJsonParse(raw);
      if (!parsed?.assistantTextPtBr) throw new Error('missing_field');
      return {
        assistantTextPtBr: String(parsed.assistantTextPtBr),
        intentAligned: Boolean(parsed.intentAligned),
        repairNeeded: Boolean(parsed.repairNeeded),
        shiftIntent: Boolean(parsed.shiftIntent),
        nextQuestion: parsed.nextQuestion ? String(parsed.nextQuestion) : ''
      };
    } catch {
      // Graceful degradation: try regex extraction from near-JSON, then plain text fallback.
      const t = String(raw).trim();
      const extractedText = extractField(t, 'assistantTextPtBr');
      const extractedQuestion = extractField(t, 'nextQuestion');
      const bool = (k, d=false) => {
        const m = t.match(new RegExp(`"${k}"\\s*:\\s*(true|false)`, 'i'));
        return m ? m[1].toLowerCase() === 'true' : d;
      };

      const assistant = extractedText || t || 'Tudo bem. Vamos continuar.';
      const shiftIntent = bool('shiftIntent') || /(mudar de assunto|outro assunto|change topic|something else)/i.test(assistant);
      const repairNeeded = bool('repairNeeded') || /(não entendi|nao entendi|quase)/i.test(assistant);
      const intentAligned = bool('intentAligned', !repairNeeded);
      const nextQuestion = extractedQuestion || (/\?/.test(assistant) ? assistant.split('?').slice(-2, -1)[0]?.trim() + '?' : '');

      return {
        assistantTextPtBr: assistant,
        intentAligned,
        repairNeeded,
        shiftIntent,
        nextQuestion
      };
    }
  }
}
