import Groq from 'groq-sdk';
import { updateFromHeaders } from './groq-ratelimit-cache';
import { updateProviderHeaders } from './ai-limits-cache';

export interface AIProvider {
  name: string;
  call: (messages: any[], systemPrompt: string) => Promise<string>;
}

function makeGroqProvider(apiKey: string, label: string): AIProvider {
  return {
    name: label,
    async call(messages, systemPrompt) {
      const client = new Groq({ apiKey });
      const { data, response } = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 2048,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }).withResponse();
      const headers = Object.fromEntries(response.headers.entries());
      updateFromHeaders(headers);
      updateProviderHeaders('groq', headers);
      return data.choices[0]?.message?.content ?? '';
    },
  };
}

function makeOpenRouterProvider(apiKey: string, label: string): AIProvider {
  return {
    name: label,
    async call(messages, systemPrompt) {
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
      return data.choices?.[0]?.message?.content ?? '';
    },
  };
}

function makeGeminiProvider(apiKey: string): AIProvider {
  return {
    name: 'Gemini',
    async call(messages, systemPrompt) {
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
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    },
  };
}

function makeMistralProvider(apiKey: string): AIProvider {
  return {
    name: 'Mistral',
    async call(messages, systemPrompt) {
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
      return data.choices?.[0]?.message?.content ?? '';
    },
  };
}

function makeCohereProvider(apiKey: string): AIProvider {
  return {
    name: 'Cohere',
    async call(messages, systemPrompt) {
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
      return data.text ?? '';
    },
  };
}

function makeTogetherProvider(apiKey: string): AIProvider {
  return {
    name: 'Together',
    async call(messages, systemPrompt) {
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
      return data.choices?.[0]?.message?.content ?? '';
    },
  };
}

function makeCloudflareProvider(accountId: string, apiToken: string): AIProvider {
  return {
    name: 'Cloudflare',
    async call(messages, systemPrompt) {
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
      return data.result?.response ?? '';
    },
  };
}

export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  if (process.env.GROQ_API_KEY) providers.push(makeGroqProvider(process.env.GROQ_API_KEY, 'Groq-1'));
  if (process.env.GROQ_API_KEY_2) providers.push(makeGroqProvider(process.env.GROQ_API_KEY_2, 'Groq-2'));
  if (process.env.OPENROUTER_API_KEY_1) providers.push(makeOpenRouterProvider(process.env.OPENROUTER_API_KEY_1, 'OpenRouter-1'));
  if (process.env.OPENROUTER_API_KEY_2) providers.push(makeOpenRouterProvider(process.env.OPENROUTER_API_KEY_2, 'OpenRouter-2'));
  if (process.env.GEMINI_API_KEY) providers.push(makeGeminiProvider(process.env.GEMINI_API_KEY));
  if (process.env.MISTRAL_API_KEY) providers.push(makeMistralProvider(process.env.MISTRAL_API_KEY));
  if (process.env.COHERE_API_KEY) providers.push(makeCohereProvider(process.env.COHERE_API_KEY));
  if (process.env.TOGETHER_API_KEY) providers.push(makeTogetherProvider(process.env.TOGETHER_API_KEY));
  if (process.env.CLOUDFLARE_AI_ACCOUNT_ID && process.env.CLOUDFLARE_AI_API_TOKEN)
    providers.push(makeCloudflareProvider(process.env.CLOUDFLARE_AI_ACCOUNT_ID, process.env.CLOUDFLARE_AI_API_TOKEN));
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

  const results = await Promise.allSettled(
    providers.map(p => p.call(messages, systemPrompt).then(c => ({ name: p.name, content: c })))
  );

  const successful = results
    .filter((r): r is PromiseFulfilledResult<{ name: string; content: string }> => r.status === 'fulfilled' && r.value.content.length > 20)
    .map(r => r.value);

  if (successful.length === 0) throw new Error('All AI providers failed');
  if (successful.length === 1) {
    onProviderResult?.(successful[0].name, successful[0].content, true);
    return { content: successful[0].content, provider: successful[0].name, reason: 'Only responding provider' };
  }

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
  } catch {}

  const winner = successful[winnerIdx];
  onProviderResult?.(winner.name, winner.content, true);
  return { content: winner.content, provider: winner.name, reason };
}
