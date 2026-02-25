export class GeminiGenerator {
  constructor({ apiKey, model = 'gemini-2.5-flash' }) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate({ topic, targetWords, repairMode }) {
    if (!this.apiKey) throw new Error('missing_gemini_api_key');

    const instruction = [
      'Você é um parceiro de crosstalk em Português do Brasil.',
      'Responda SOMENTE em português.',
      'Frases curtas e simples, tempo presente.',
      repairMode ? 'O usuário não entendeu; simplifique ainda mais e repita com calma.' : 'Mantenha fluxo natural e simples.',
      `Tema: ${topic}.`,
      `Use naturalmente estas palavras quando possível: ${targetWords.join(', ')}.`,
      'Retorne apenas a resposta falada, sem explicações meta.'
    ].join(' ');

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: instruction }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 120
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`gemini_http_${res.status}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('gemini_empty_response');
    return text;
  }
}
