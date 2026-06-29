import mongoose, { Schema, Document } from 'mongoose';

export interface IKnowledge extends Document {
  title: string;
  content: string;
  category: string;
  tags: string[];
  source?: string;
  createdAt: Date;
}

const KnowledgeSchema: Schema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, enum: ['tool', 'technique', 'lesson', 'command'], default: 'lesson' },
  tags: [{ type: String }],
  source: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Knowledge || mongoose.model<IKnowledge>('Knowledge', KnowledgeSchema);
