import { Router } from 'express';
import connectToDatabase from '../lib/mongodb';
import Session from '../lib/models/Session';
import { getChatResponse, streamChatResponse } from '../lib/groq';
import { getBestAnswer, getBestEnhancedPrompt } from '../lib/multi-ai';
import { detectToolsInText } from './scrape';

const router = Router();

router.get('/chat/sessions', async (req, res) => {
  try {
    await connectToDatabase();
    const sessions = await Session.find({}).sort({ updatedAt: -1 }).select('title createdAt updatedAt');
    res.json(sessions.map(s => ({
      id: s._id.toString(),
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/chat/sessions', async (req, res) => {
  try {
    await connectToDatabase();
    const { title } = req.body;
    const session = await Session.create({
      title: title || `Op_${new Date().toISOString().slice(0, 10)}`,
      messages: [],
    });
    res.status(201).json({
      id: session._id.toString(),
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/chat/sessions/:id', async (req, res) => {
  try {
    await connectToDatabase();
    await Session.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/chat/sessions/:id/messages', async (req, res) => {
  try {
    await connectToDatabase();
    const session = await Session.findById(req.params.id);
    if (!session) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(session.messages.map((m: any) => ({
      id: m._id.toString(),
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** Streaming endpoint — tries Groq streaming first, falls back to multi-AI if rate-limited */
router.post('/chat/sessions/:id/messages/stream', async (req, res) => {
  try {
    await connectToDatabase();
    const session = await Session.findById(req.params.id);
    if (!session) { res.status(404).json({ error: 'Not found' }); return; }

    const { content } = req.body;
    const history = session.messages.slice(-10).map((m: any) => ({ role: m.role, content: m.content }));

    session.messages.push({ role: 'user', content, createdAt: new Date() } as any);
    await session.save();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let fullContent = '';

    // Try Groq streaming first
    try {
      fullContent = await streamChatResponse(content, history, (text) => {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      });
    } catch (streamErr: any) {
      // Groq failed (rate limit, network, etc.) — fall back to multi-AI best answer
      res.write(`data: ${JSON.stringify({ text: '' })}\n\n`); // clear any partial
      try {
        const { SYSTEM_PROMPT } = await import('../lib/groq');
        const messages = [...history, { role: 'user', content }];
        const { content: bestContent, provider, reason } = await getBestAnswer(messages, SYSTEM_PROMPT);
        fullContent = bestContent;
        // Stream it word-by-word so the UI still animates
        const words = bestContent.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = (i === 0 ? '' : ' ') + words[i];
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ provider, reason })}\n\n`);
      } catch (fallbackErr: any) {
        res.write(`data: ${JSON.stringify({ error: `All AI providers failed: ${fallbackErr.message}` })}\n\n`);
      }
    }

    if (fullContent) {
      session.messages.push({ role: 'assistant', content: fullContent, createdAt: new Date() } as any);
      await session.save();
    }

    const lastMsg = session.messages[session.messages.length - 1] as any;
    res.write('data: [DONE]\n\n');
    res.write(`data: ${JSON.stringify({ messageId: lastMsg._id?.toString() ?? '' })}\n\n`);
    res.end();
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

/** Non-streaming fallback — uses multi-AI getBestAnswer directly */
router.post('/chat/sessions/:id/messages', async (req, res) => {
  try {
    await connectToDatabase();
    const session = await Session.findById(req.params.id);
    if (!session) { res.status(404).json({ error: 'Not found' }); return; }

    const { content } = req.body;
    const history = session.messages.slice(-10).map((m: any) => ({ role: m.role, content: m.content }));

    session.messages.push({ role: 'user', content, createdAt: new Date() } as any);

    let aiContent: string;
    try {
      const { SYSTEM_PROMPT } = await import('../lib/groq');
      const messages = [...history, { role: 'user', content }];
      const { content: best } = await getBestAnswer(messages, SYSTEM_PROMPT);
      aiContent = best;
    } catch {
      aiContent = await getChatResponse(content, history);
    }

    session.messages.push({ role: 'assistant', content: aiContent, createdAt: new Date() } as any);
    await session.save();

    const lastMsg = session.messages[session.messages.length - 1] as any;
    res.json({ id: lastMsg._id.toString(), role: lastMsg.role, content: lastMsg.content, createdAt: lastMsg.createdAt });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/chat/enhance-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'prompt required' });
    const enhanced = await getBestEnhancedPrompt(prompt.trim());
    res.json({ enhanced });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


/** Multi-AI best-answer endpoint — queries all configured providers, picks the best */
router.post('/chat/sessions/:id/messages/best', async (req, res) => {
  try {
    await connectToDatabase();
    const session = await Session.findById(req.params.id);
    if (!session) { res.status(404).json({ error: 'Not found' }); return; }

    const { content } = req.body;
    const history = session.messages.slice(-10).map((m: any) => ({ role: m.role, content: m.content }));

    session.messages.push({ role: 'user', content, createdAt: new Date() } as any);
    await session.save();

    const { SYSTEM_PROMPT } = await import('../lib/groq');
    const messages = [...history, { role: 'user', content }];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const providerResults: Array<{ name: string; content: string; isBest?: boolean }> = [];

    const { content: bestContent, provider, reason } = await getBestAnswer(
      messages,
      SYSTEM_PROMPT,
      (name, content, isBest) => {
        providerResults.push({ name, content, isBest });
        res.write(`data: ${JSON.stringify({ type: 'provider_result', name, isBest })}\n\n`);
      }
    );

    const toolCards = detectToolsInText(bestContent);

    session.messages.push({ role: 'assistant', content: bestContent, createdAt: new Date() } as any);
    await session.save();

    const lastMsg = session.messages[session.messages.length - 1] as any;

    res.write(`data: ${JSON.stringify({ type: 'answer', content: bestContent, provider, reason, toolCards })}\n\n`);
    res.write(`data: ${JSON.stringify({ messageId: lastMsg._id.toString() })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

/** Tool card detection on arbitrary text */
router.post('/chat/detect-tools', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) { res.status(400).json({ error: 'text required' }); return; }
    res.json({ toolCards: detectToolsInText(text) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
