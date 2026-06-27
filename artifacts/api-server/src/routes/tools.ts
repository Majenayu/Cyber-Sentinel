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

export default router;
