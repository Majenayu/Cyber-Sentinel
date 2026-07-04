import mongoose, { Schema, Document } from 'mongoose';

export interface IResearchLog extends Document {
  runAt: Date;
  status: 'running' | 'done' | 'error';
  triggeredBy: 'scheduler' | 'manual';
  sourcesChecked: number;
  kbEntriesCreated: number;
  toolsCreated: number;
  commandsCreated: number;
  errors: string[];
  discoveries: Array<{ source: string; title: string; tags: string[] }>;
  finishedAt?: Date;
}

const ResearchLogSchema: Schema = new Schema({
  runAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['running', 'done', 'error'], default: 'running' },
  triggeredBy: { type: String, enum: ['scheduler', 'manual'], default: 'scheduler' },
  sourcesChecked: { type: Number, default: 0 },
  kbEntriesCreated: { type: Number, default: 0 },
  toolsCreated: { type: Number, default: 0 },
  commandsCreated: { type: Number, default: 0 },
  errors: [{ type: String }],
  discoveries: [{ source: String, title: String, tags: [String] }],
  finishedAt: { type: Date, default: null },
}, { suppressReservedKeysWarning: true });

export default mongoose.models.ResearchLog || mongoose.model<IResearchLog>('ResearchLog', ResearchLogSchema);
