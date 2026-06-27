import mongoose, { Schema, Document } from 'mongoose';

export interface ITool extends Document {
  name: string;
  slug: string;
  category: string;
  description: string;
  cheatsheet: string;
  officialUrl?: string;
}

const ToolSchema: Schema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  cheatsheet: { type: String, required: true },
  officialUrl: { type: String, default: null },
});

export default mongoose.models.Tool || mongoose.model<ITool>('Tool', ToolSchema);
