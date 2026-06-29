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
        const content = data.choices[0]?.message?.content ?? '';
        if (!content) throw new Error('Empty response');
        return content;
      } catch (e: any) {
        recordProviderError(key, e.message?.slice(0, 120) ?? 'Unknown error');
        throw e;
      }
    },
  };
}


function makeMistralProvider(apiKey: string): AIProvider {
  const MODELS = ['mistral-small-latest', 'open-mistral-7b', 'open-mixtral-8x7b'];
  return {
    name: 'Mistral',
    providerKey: 'mistral',
    async call(messages, systemPrompt) {
      recordProviderCall('mistral');
      let lastErr: Error = new Error('No model succeeded');
      for (const model of MODELS) {
        try {
          const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: [{ role: 'system', content: systemPrompt }, ...messages],
              max_tokens: 2048,
            }),
          });
          const headers: Record<string, string> = {};
          res.headers.forEach((v, k) => { headers[k] = v; });
          updateProviderHeaders('mistral', headers);
          if (!res.ok) {
            const body = await res.text().catch(() => '');
            lastErr = new Error(`Mistral ${model}: ${res.status} ${body.slice(0, 100)}`);
            continue;
          }
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content ?? '';
          if (!content) { lastErr = new Error(`Mistral ${model}: empty`); continue; }
          return content;
        } catch (e: any) {
          lastErr = e;
        }
      }
      recordProviderError('mistral', lastErr.message.slice(0, 120));
      throw lastErr;
    },
  };
}

export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  if (process.env.GROQ_API_KEY) providers.push(makeGroqProvider(process.env.GROQ_API_KEY, 'Groq-1', 'groq'));
  if (process.env.GROQ_API_KEY_2) providers.push(makeGroqProvider(process.env.GROQ_API_KEY_2, 'Groq-2', 'groq2'));
  if (process.env.MISTRAL_API_KEY) providers.push(makeMistralProvider(process.env.MISTRAL_API_KEY));
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
  const systemPrompt = 'You are a helpful AI assistant. Respond with valid JSON only. No markdown fences.';

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

/** Races all providers in parallel — returns the FIRST successful short text response.
 *  Used for enhance-prompt where speed matters more than quality comparison. */
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

  // Race ALL providers — take the first valid short response
  return new Promise((resolve) => {
    let settled = false;
    let failures = 0;
    const total = providers.length;

    for (const provider of providers) {
      provider.call(messages, systemPrompt)
        .then(result => {
          if (settled) return;
          const text = result.trim();
          if (text.length > 10 && text.length < 600) {
            // If looks like an answer (double newline = paragraphs), take first para
            const clean = text.includes('\n\n') ? text.split('\n\n')[0].trim() : text;
            if (clean.length > 10) {
              settled = true;
              resolve(clean);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          failures++;
          // If all providers failed/returned bad output, fall back to original
          if (!settled && failures >= total) {
            settled = true;
            resolve(roughPrompt);
          }
        });
    }
  });
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
    .filter((r): r is PromiseFulfilledResult<{ name: string; content: string }> => r.status === 'fulfilled' && r.value.content.length > 5)
    .map(r => r.value);

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[multi-ai] ${providers[i].name} failed: ${r.reason}`);
    }
  });

  if (successful.length === 0) throw new Error('All AI providers failed — check API keys in Settings');
  if (successful.length === 1) {
    onProviderResult?.(successful[0].name, successful[0].content, true);
    return { content: successful[0].content, provider: successful[0].name, reason: 'Only responding provider' };
  }

  // Notify UI of all responding providers
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
    // Use Groq-2 as judge if Groq-1 is rate-limited, else use first Groq available
    const judgeProvider =
      providers.find(p => p.name === 'Groq-2') ??
      providers.find(p => p.name.startsWith('Groq')) ??
      providers[0];
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
