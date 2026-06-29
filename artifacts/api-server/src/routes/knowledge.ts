import { Router } from 'express';
import connectToDatabase from '../lib/mongodb';
import Knowledge from '../lib/models/Knowledge';

const router = Router();

router.get('/knowledge', async (req, res) => {
  try {
    await connectToDatabase();
    const { q, tag } = req.query as { q?: string; tag?: string };
    let filter: any = {};
    if (tag) filter.tags = tag;
    if (q) {
      const regex = new RegExp(q, 'i');
      filter = { $or: [{ title: regex }, { content: regex }, { tags: regex }] };
    }
    const entries = await Knowledge.find(filter).sort({ createdAt: -1 });
    res.json(entries.map(e => ({
      id: e._id.toString(),
      title: e.title,
      content: e.content,
      tags: e.tags ?? [],
      source: e.source ?? null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/knowledge', async (req, res) => {
  try {
    await connectToDatabase();
    const { title, content, tags, source } = req.body;
    const entry = await Knowledge.create({ title, content, category: 'lesson', tags: tags ?? [], source: source ?? null });
    res.status(201).json({
      id: entry._id.toString(),
      title: entry.title,
      content: entry.content,
      tags: entry.tags,
      source: entry.source ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/knowledge/:id', async (req, res) => {
  try {
    await connectToDatabase();
    const entry = await Knowledge.findById(req.params.id);
    if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({
      id: entry._id.toString(),
      title: entry.title,
      content: entry.content,
      tags: entry.tags ?? [],
      source: entry.source ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/knowledge/:id', async (req, res) => {
  try {
    await connectToDatabase();
    const entry = await Knowledge.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({
      id: entry._id.toString(),
      title: entry.title,
      content: entry.content,
      tags: entry.tags ?? [],
      source: entry.source ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/knowledge/:id', async (req, res) => {
  try {
    await connectToDatabase();
    await Knowledge.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
