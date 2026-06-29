import { Router } from 'express';
import connectToDatabase from '../lib/mongodb';
import Command from '../lib/models/Command';

const router = Router();

router.get('/commands', async (req, res) => {
  try {
    await connectToDatabase();
    const commands = await Command.find({}).sort({ createdAt: -1 });
    res.json(commands.map(c => ({
      id: c._id.toString(),
      title: c.title,
      command: c.command,
      description: c.description ?? null,
      category: c.category,
      createdAt: c.createdAt,
      useCount: (c as any).useCount ?? 0,
      lastUsed: (c as any).lastUsed ?? null,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/commands', async (req, res) => {
  try {
    await connectToDatabase();
    const { title, command, description, category } = req.body;
    const cmd = await Command.create({ title, command, description: description ?? null, category: category || 'uncategorized' });
    res.status(201).json({
      id: cmd._id.toString(),
      title: cmd.title,
      command: cmd.command,
      description: cmd.description ?? null,
      category: cmd.category,
      createdAt: cmd.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/commands/:id', async (req, res) => {
  try {
    await connectToDatabase();
    const cmd = await Command.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!cmd) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({
      id: cmd._id.toString(),
      title: cmd.title,
      command: cmd.command,
      description: cmd.description ?? null,
      category: cmd.category,
      createdAt: cmd.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/commands/:id/use', async (req, res) => {
  try {
    await connectToDatabase();
    const cmd = await Command.findByIdAndUpdate(
      req.params.id,
      { $inc: { useCount: 1 }, $set: { lastUsed: new Date() } },
      { new: true }
    );
    if (!cmd) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ useCount: (cmd as any).useCount, lastUsed: (cmd as any).lastUsed });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/commands/:id', async (req, res) => {
  try {
    await connectToDatabase();
    await Command.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
