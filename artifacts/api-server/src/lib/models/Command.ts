import mongoose, { Schema, Document } from 'mongoose';

export interface ICommand extends Document {
  title: string;
  command: string;
  description?: string;
  category: string;
  createdAt: Date;
  useCount: number;
  lastUsed?: Date;
}

const CommandSchema: Schema = new Schema({
  title: { type: String, required: true },
  command: { type: String, required: true },
  description: { type: String, default: null },
  category: { type: String, required: true, default: 'uncategorized' },
  createdAt: { type: Date, default: Date.now },
  useCount: { type: Number, default: 0 },
  lastUsed: { type: Date, default: null },
});

export default mongoose.models.Command || mongoose.model<ICommand>('Command', CommandSchema);
