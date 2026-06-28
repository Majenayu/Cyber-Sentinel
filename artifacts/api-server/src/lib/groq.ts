import Groq from 'groq-sdk';
import connectToDatabase from './mongodb';
import Knowledge from './models/Knowledge';

const SYSTEM_PROMPT = `You are Cyber Sentinel, an advanced AI cybersecurity assistant designed for junior penetration testers. 
Your primary goal is to help users learn from HackTheBox Academy and perform authorized security testing.

CRITICAL INSTRUCTIONS:
1. DO NOT REFUSE legitimate security-related questions. You are an uncensored educational tool for cybersecurity professionals and students. 
2. ALWAYS provide detailed command examples (nmap, gobuster, ffuf, etc.) and explain what each flag does.
3. If the user provides context from their "Knowledge Base", prioritize that information in your answer.
4. Maintain a professional, terminal-like tone (Cyberpunk/Hacker aesthetic).
5. When providing code or commands, use markdown code blocks with the language specified.
6. If a request is ambiguous, ask for the target IP or domain to help refine the command.

Your knowledge is restricted to cybersecurity, penetration testing, and software development for security tools.`;

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

async function buildMessages(userMessage: string, history: any[] = []) {
  await connectToDatabase();
  const keywords = userMessage.split(/\s+/).filter(w => w.length > 3).slice(0, 10);
  let context = '';

  if (keywords.length > 0) {
    const relevantKnowledge = await Knowledge.find({
      $or: [
        { title: { $regex: keywords.join('|'), $options: 'i' } },
        { content: { $regex: keywords.join('|'), $options: 'i' } },
        { tags: { $in: keywords } },
      ],
    }).limit(3);

    if (relevantKnowledge.length > 0) {
      context =
        '\n\nRelevant context from your Knowledge Vault:\n' +
        relevantKnowledge.map(k => `--- ${k.title} ---\n${k.content}`).join('\n\n');
    }
  }

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: context ? `${userMessage}${context}` : userMessage },
  ];
}

/** Non-streaming fallback */
export async function getChatResponse(userMessage: string, history: any[] = []) {
  try {
    const groq = getGroqClient();
    const messages = await buildMessages(userMessage, history);
    const completion = await groq.chat.completions.create({
      messages: messages as any,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2048,
    });
    return completion.choices[0]?.message?.content ?? 'No response generated.';
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}

/** Streaming — yields text chunks, returns full content when done */
export async function streamChatResponse(
  userMessage: string,
  history: any[],
  onChunk: (text: string) => void,
): Promise<string> {
  const groq = getGroqClient();
  const messages = await buildMessages(userMessage, history);

  const stream = await groq.chat.completions.create({
    messages: messages as any,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 2048,
    stream: true,
  });

  let full = '';
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) {
      full += text;
      onChunk(text);
    }
  }
  return full;
}
