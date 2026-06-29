import { Router } from 'express';
import connectToDatabase from '../lib/mongodb';
import Tool from '../lib/models/Tool';
import { seedTools } from '../lib/seed-tools';

const router = Router();

router.get('/tools', async (req, res) => {
  try {
    await connectToDatabase();
    const count = await Tool.countDocuments({});
    if (count === 0) await seedTools();
    const tools = await Tool.find({}).sort({ name: 1 });
    res.json(tools.map(t => ({
      id: t._id.toString(),
      name: t.name,
      slug: t.slug,
      category: t.category,
      description: t.description,
      officialUrl: t.officialUrl ?? null,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tools/:slug', async (req, res) => {
  try {
    await connectToDatabase();
    const tool = await Tool.findOne({ slug: req.params.slug });
    if (!tool) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({
      id: tool._id.toString(),
      name: tool.name,
      slug: tool.slug,
      category: tool.category,
      description: tool.description,
      cheatsheet: tool.cheatsheet,
      officialUrl: tool.officialUrl ?? null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tools', async (req, res) => {
  try {
    await connectToDatabase();
    const { name, category, description, cheatsheet, officialUrl } = req.body;
    if (!name || !category || !description || !cheatsheet) {
      res.status(400).json({ error: 'name, category, description, and cheatsheet are required' });
      return;
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existing = await Tool.findOne({ slug });
    if (existing) { res.status(409).json({ error: 'A tool with this name already exists' }); return; }
    const tool = await Tool.create({ name, slug, category, description, cheatsheet, officialUrl: officialUrl ?? null });
    res.status(201).json({
      id: tool._id.toString(),
      name: tool.name,
      slug: tool.slug,
      category: tool.category,
      description: tool.description,
      cheatsheet: tool.cheatsheet,
      officialUrl: tool.officialUrl ?? null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/tools/:id', async (req, res) => {
  try {
    await connectToDatabase();
    await Tool.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
