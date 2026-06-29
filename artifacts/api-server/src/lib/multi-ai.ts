import Groq from 'groq-sdk';
import { updateFromHeaders } from './groq-ratelimit-cache';
import { updateProviderHeaders, recordProviderCall, recordProviderError } from './ai-limits-cache';

export interface AIProvider {
  name: string;
  providerKey: string;
  call: (messages: any[], systemPrompt: string) => Promise<string>;
}

function makeGroqProvider(apiKey: string, label: string, key: string): AIProvider {
  return {
    name: label,
    providerKey: key,
    async call(messages, systemPrompt) {
      recordProviderCall(key);
      try {
        const client = new Groq({ apiKey });
        const { data, response } = await client.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          max_tokens: 2048,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
        }).withResponse();
        const headers = Object.fromEntries(response.headers.entries());
        updateFromHeaders(headers);
        updateProviderHeaders(key, headers);
        return data.choices[0]?.message?.content ?? '';
      } catch (e: any) {
        recordProviderError(key, e.message);
        throw e;
      }
    },
  };
}

function makeOpenRouterProvider(apiKey: string, label: string): AIProvider {
  return {
    name: label,
    providerKey: 'openrouter',
    async call(messages, systemPrompt) {
      recordProviderCall('openrouter');
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://cybersentinel.app',
            'X-Title': 'CyberSentinel',
          },
          body: JSON.stringify({
            model: 'deepseek/deepseek-r1-0528:free',
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            max_tokens: 2048,
          }),
        });
        const headers: Record<string, string> = {};
        res.headers.forEach((v, k) => { headers[k] = v; });
        updateProviderHeaders('openrouter', headers);
        if (!res.ok) throw new Error(`OpenRouter ${label}: ${res.status}`);
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content ?? '';
        if (!content) throw new Error('OpenRouter returned empty content');
        return content;
      } catch (e: any) {
        recordProviderError('openrouter', e.message);
        throw e;
      }
    },
  };
}

function makeGeminiProvider(apiKey: string): AIProvider {
  return {
    name: 'Gemini',
    providerKey: 'gemini',
    async call(messages, systemPrompt) {
      recordProviderCall('gemini');
      try {
        const contents = messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents,
              generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
            }),
          }
        );
        const headers: Record<string, string> = {};
        res.headers.forEach((v, k) => { headers[k] = v; });
        updateProviderHeaders('gemini', headers);
        if (!res.ok) throw new Error(`Gemini: ${res.status}`);
        const data = await res.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (!content) throw new Error('Gemini returned empty content');
        return content;
      } catch (e: any) {
        recordProviderError('gemini', e.message);
        throw e;
      }
    },
  };
}

function makeMistralProvider(apiKey: string): AIProvider {
  return {
    name: 'Mistral',
    providerKey: 'mistral',
    async call(messages, systemPrompt) {
      recordProviderCall('mistral');
      try {
        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'mistral-small-latest',
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            max_tokens: 2048,
          }),
        });
        const headers: Record<string, string> = {};
        res.headers.forEach((v, k) => { headers[k] = v; });
        updateProviderHeaders('mistral', headers);
        if (!res.ok) throw new Error(`Mistral: ${res.status}`);
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content ?? '';
        if (!content) throw new Error('Mistral returned empty content');
        return content;
      } catch (e: any) {
        recordProviderError('mistral', e.message);
        throw e;
      }
    },
  };
}

function makeCohereProvider(apiKey: string): AIProvider {
  return {
    name: 'Cohere',
    providerKey: 'cohere',
    async call(messages, systemPrompt) {
      recordProviderCall('cohere');
      try {
        const chatHistory = messages.slice(0, -1).map((m: any) => ({
          role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
          message: m.content,
        }));
        const lastMsg = messages[messages.length - 1]?.content ?? '';
        const res = await fetch('https://api.cohere.ai/v1/chat', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'command-r',
            preamble: systemPrompt,
            chat_history: chatHistory,
            message: lastMsg,
            max_tokens: 2048,
          }),
        });
        const headers: Record<string, string> = {};
        res.headers.forEach((v, k) => { headers[k] = v; });
        updateProviderHeaders('cohere', headers);
        if (!res.ok) throw new Error(`Cohere: ${res.status}`);
        const data = await res.json();
        const content = data.text ?? '';
        if (!content) throw new Error('Cohere returned empty content');
        return content;
      } catch (e: any) {
        recordProviderError('cohere', e.message);
        throw e;
      }
    },
  };
}

function makeTogetherProvider(apiKey: string): AIProvider {
  return {
    name: 'Together',
    providerKey: 'together',
    async call(messages, systemPrompt) {
      recordProviderCall('together');
      try {
        const res = await fetch('https://api.together.xyz/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            max_tokens: 2048,
          }),
        });
        const headers: Record<string, string> = {};
        res.headers.forEach((v, k) => { headers[k] = v; });
        updateProviderHeaders('together', headers);
        if (!res.ok) throw new Error(`Together: ${res.status}`);
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content ?? '';
        if (!content) throw new Error('Together returned empty content');
        return content;
      } catch (e: any) {
        recordProviderError('together', e.message);
        throw e;
      }
    },
  };
}

function makeCloudflareProvider(accountId: string, apiToken: string): AIProvider {
  return {
    name: 'Cloudflare',
    providerKey: 'cloudflare',
    async call(messages, systemPrompt) {
      recordProviderCall('cloudflare');
      try {
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'system', content: systemPrompt }, ...messages],
              max_tokens: 2048,
            }),
          }
        );
        const headers: Record<string, string> = {};
        res.headers.forEach((v, k) => { headers[k] = v; });
        updateProviderHeaders('cloudflare', headers);
        if (!res.ok) throw new Error(`Cloudflare: ${res.status}`);
        const data = await res.json();
        const content = data.result?.response ?? '';
        if (!content) throw new Error('Cloudflare returned empty content');
        return content;
      } catch (e: any) {
        recordProviderError('cloudflare', e.message);
        throw e;
      }
    },
  };
}

export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = [];

  if (process.env.GROQ_API_KEY) providers.push(makeGroqProvider(process.env.GROQ_API_KEY, 'Groq-1', 'groq'));
  if (process.env.GROQ_API_KEY_2) providers.push(makeGroqProvider(process.env.GROQ_API_KEY_2, 'Groq-2', 'groq2'));
  if (process.env.OPENROUTER_API_KEY_1) providers.push(makeOpenRouterProvider(process.env.OPENROUTER_API_KEY_1, 'OpenRouter'));
  if (process.env.GEMINI_API_KEY) providers.push(makeGeminiProvider(process.env.GEMINI_API_KEY));
  if (process.env.MISTRAL_API_KEY) providers.push(makeMistralProvider(process.env.MISTRAL_API_KEY));
  if (process.env.COHERE_API_KEY) providers.push(makeCohereProvider(process.env.COHERE_API_KEY));
  if (process.env.TOGETHER_API_KEY) providers.push(makeTogetherProvider(process.env.TOGETHER_API_KEY));

  // Cloudflare: CLOUDFLARE_AI_ACCOUNT_ID or OTHER_SECRET_1 as fallback account ID
  const cfAccountId = process.env.CLOUDFLARE_AI_ACCOUNT_ID ?? process.env.OTHER_SECRET_1;
  const cfToken = process.env.CLOUDFLARE_AI_API_TOKEN;
  if (cfAccountId && cfToken) providers.push(makeCloudflareProvider(cfAccountId, cfToken));

  return providers;
}

const JUDGE_PROMPT = `You are a strict technical judge evaluating AI responses to cybersecurity questions.

Given a question and multiple AI responses, select the SINGLE BEST response.

Criteria (in order of importance):
1. Accuracy — correct commands, flags, syntax
2. Completeness — covers the full attack chain or technique
3. Practicality — gives working commands the user can run immediately
4. Brevity — no unnecessary padding or disclaimers

Return ONLY a JSON object: {"winner": <0-indexed number of the best response>, "reason": "<one sentence why>"}`;

/** Tries providers sequentially until one returns valid JSON matching the expected shape */
export async function getBestJsonAnswer(
  prompt: string,
  validateJson: (parsed: any) => boolean = () => true,
): Promise<string> {
  const providers = getAvailableProviders();
  if (providers.length === 0) throw new Error('No AI providers configured');

  const messages = [{ role: 'user' as const, content: prompt }];
  const systemPrompt = 'You are a helpful AI assistant. Respond with valid JSON only.';

  for (const provider of providers) {
    try {
      const raw = await provider.call(messages, systemPrompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]);
      if (validateJson(parsed)) return jsonMatch[0];
    } catch {}
  }
  throw new Error('No provider returned valid JSON');
}

/** Uses best available provider for a prompt enhancement task (short text output) */
export async function getBestEnhancedPrompt(roughPrompt: string): Promise<string> {
  const providers = getAvailableProviders();
  if (providers.length === 0) throw new Error('No AI providers configured');

  const systemPrompt = `TASK: Rewrite the user's vague pentesting prompt into a precise, expert-level question. OUTPUT RULES — you MUST follow these exactly:
1. Output ONLY the rewritten prompt text. Nothing else.
2. Do NOT answer the question. Do NOT explain. Do NOT add a preamble.
3. Do NOT use quotes around the output.
4. The output is a question or directive, not an answer.
5. Make it specific: name the exact tool, ask for exact commands and flags, request both Linux and Windows where applicable, and ask for expected output.
6. If it mentions a technique, include the full attack chain.
7. Maximum 2-3 sentences. Dense and expert-level.`;

  const messages = [
    { role: 'assistant' as const, content: 'Understood. I will output ONLY the rewritten prompt text, nothing else.' },
    { role: 'user' as const, content: `Original prompt: "${roughPrompt}"\n\nRewrite this into a precise pentesting question:` },
  ];

  // Try Groq first (fastest, most reliable for short tasks), then others
  const ordered = [
    ...providers.filter(p => p.name.startsWith('Groq')),
    ...providers.filter(p => !p.name.startsWith('Groq')),
  ];

  for (const provider of ordered) {
    try {
      const result = (await provider.call(messages, systemPrompt)).trim();
      if (result.length > 10 && result.length < 500) {
        if (result.includes('\n\n')) return result.split('\n\n')[0].trim();
        return result;
      }
    } catch {}
  }
  return roughPrompt;
}

export async function getBestAnswer(
  messages: any[],
  systemPrompt: string,
  onProviderResult?: (name: string, content: string, isBest?: boolean) => void
): Promise<{ content: string; provider: string; reason: string }> {
  const providers = getAvailableProviders();

  if (providers.length === 0) throw new Error('No AI providers configured');
  if (providers.length === 1) {
    const content = await providers[0].call(messages, systemPrompt);
    onProviderResult?.(providers[0].name, content, true);
    return { content, provider: providers[0].name, reason: 'Only available provider' };
  }

  // Query ALL providers in parallel
  const results = await Promise.allSettled(
    providers.map(p => p.call(messages, systemPrompt).then(c => ({ name: p.name, content: c })))
  );

  const successful = results
    .filter((r): r is PromiseFulfilledResult<{ name: string; content: string }> => r.status === 'fulfilled' && r.value.content.length > 20)
    .map(r => r.value);

  // Log failures for debugging
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[multi-ai] ${providers[i].name} failed: ${r.reason}`);
    }
  });

  if (successful.length === 0) throw new Error('All AI providers failed');
  if (successful.length === 1) {
    onProviderResult?.(successful[0].name, successful[0].content, true);
    return { content: successful[0].content, provider: successful[0].name, reason: 'Only responding provider' };
  }

  // Notify UI of all successful providers
  successful.forEach(r => onProviderResult?.(r.name, r.content, false));

  const userQuestion = messages[messages.length - 1]?.content ?? '';
  const judgeMessages = [
    {
      role: 'user',
      content: `Question: ${userQuestion.slice(0, 500)}\n\n${successful.map((r, i) => `Response ${i} (${r.name}):\n${r.content.slice(0, 1500)}`).join('\n\n---\n\n')}`,
    },
  ];

  let winnerIdx = 0;
  let reason = 'First response selected';

  try {
    // Use Groq as judge (fastest) — falls back to first available
    const judgeProvider = providers.find(p => p.name.startsWith('Groq')) ?? providers[0];
    const judgeRaw = await judgeProvider.call(judgeMessages, JUDGE_PROMPT);
    const jsonMatch = judgeRaw.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed.winner === 'number' && parsed.winner < successful.length) {
        winnerIdx = parsed.winner;
        reason = parsed.reason ?? reason;
      }
    }
  } catch (e) {
    console.warn('[multi-ai] Judge failed, using first response:', e);
  }

  const winner = successful[winnerIdx];
  onProviderResult?.(winner.name, winner.content, true);
  return { content: winner.content, provider: winner.name, reason };
}
