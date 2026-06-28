import { Router } from 'express';
import connectToDatabase from '../lib/mongodb';
import Session from '../lib/models/Session';
import { getChatResponse, streamChatResponse } from '../lib/groq';

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

/** Streaming endpoint — SSE */
router.post('/chat/sessions/:id/messages/stream', async (req, res) => {
  try {
    await connectToDatabase();
    const session = await Session.findById(req.params.id);
    if (!session) { res.status(404).json({ error: 'Not found' }); return; }

    const { content } = req.body;
    const history = session.messages.slice(-10).map((m: any) => ({ role: m.role, content: m.content }));

    // Save user message immediately
    session.messages.push({ role: 'user', content, createdAt: new Date() } as any);
    await session.save();

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let fullContent = '';
    try {
      fullContent = await streamChatResponse(content, history, (text) => {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      });
    } catch (streamErr: any) {
      res.write(`data: ${JSON.stringify({ error: streamErr.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // Save assistant message
    session.messages.push({ role: 'assistant', content: fullContent, createdAt: new Date() } as any);
    await session.save();

    const lastMsg = session.messages[session.messages.length - 1] as any;
    res.write(`data: [DONE]\n\n`);
    res.write(`data: ${JSON.stringify({ messageId: lastMsg._id.toString() })}\n\n`);
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

/** Non-streaming fallback */
router.post('/chat/sessions/:id/messages', async (req, res) => {
  try {
    await connectToDatabase();
    const session = await Session.findById(req.params.id);
    if (!session) { res.status(404).json({ error: 'Not found' }); return; }

    const { content } = req.body;
    const history = session.messages.slice(-10).map((m: any) => ({ role: m.role, content: m.content }));

    session.messages.push({ role: 'user', content, createdAt: new Date() } as any);
    const aiContent = await getChatResponse(content, history);
    session.messages.push({ role: 'assistant', content: aiContent, createdAt: new Date() } as any);
    await session.save();

    const lastMsg = session.messages[session.messages.length - 1] as any;
    res.json({
      id: lastMsg._id.toString(),
      role: lastMsg.role,
      content: lastMsg.content,
      createdAt: lastMsg.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/chat/enhance-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'prompt required' });
    const { enhancePrompt } = await import('../lib/groq');
    const enhanced = await enhancePrompt(prompt.trim());
    res.json({ enhanced });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
