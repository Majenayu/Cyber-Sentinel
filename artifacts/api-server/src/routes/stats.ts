import { Router } from 'express';
import connectToDatabase from '../lib/mongodb';
import Knowledge from '../lib/models/Knowledge';
import Session from '../lib/models/Session';
import Command from '../lib/models/Command';
import Tool from '../lib/models/Tool';

const router = Router();

router.get('/stats', async (req, res) => {
  try {
    await connectToDatabase();
    const [totalKnowledgeEntries, totalChatSessions, totalCommands, totalTools, recentKnowledge] = await Promise.all([
      Knowledge.countDocuments({}),
      Session.countDocuments({}),
      Command.countDocuments({}),
      Tool.countDocuments({}),
      Knowledge.find({}).sort({ createdAt: -1 }).limit(10).select('tags'),
    ]);
    const allTags = recentKnowledge.flatMap((k: any) => k.tags ?? []);
    const uniqueTags = [...new Set(allTags)].slice(0, 10);
    res.json({ totalKnowledgeEntries, totalChatSessions, totalCommands, totalTools, recentTags: uniqueTags });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
