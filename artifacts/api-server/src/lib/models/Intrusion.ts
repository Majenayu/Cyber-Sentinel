import mongoose, { Schema, Document } from 'mongoose';

export interface IIntrusion extends Document {
  ip: string;
  country: string;
  region: string;
  city: string;
  isp: string;
  org: string;
  lat: number;
  lon: number;
  timezone: string;
  attempts: number;
  attemptedIds: string[];
  userAgent: string;
  browser: string;
  os: string;
  platform: string;
  language: string;
  screenResolution: string;
  colorDepth: number;
  cores: number;
  memory: number;
  cookieEnabled: boolean;
  doNotTrack: string;
  plugins: string[];
  emailSent: boolean;
  firstSeen: Date;
  lastSeen: Date;
}

const IntrusionSchema: Schema = new Schema({
  ip: { type: String, required: true, unique: true, index: true },
  country: { type: String, default: 'Unknown' },
  region: { type: String, default: 'Unknown' },
  city: { type: String, default: 'Unknown' },
  isp: { type: String, default: 'Unknown' },
  org: { type: String, default: 'Unknown' },
  lat: { type: Number, default: 0 },
  lon: { type: Number, default: 0 },
  timezone: { type: String, default: 'Unknown' },
  attempts: { type: Number, default: 1 },
  attemptedIds: [{ type: String }],
  userAgent: { type: String, default: '' },
  browser: { type: String, default: 'Unknown' },
  os: { type: String, default: 'Unknown' },
  platform: { type: String, default: 'Unknown' },
  language: { type: String, default: 'Unknown' },
  screenResolution: { type: String, default: 'Unknown' },
  colorDepth: { type: Number, default: 0 },
  cores: { type: Number, default: 0 },
  memory: { type: Number, default: 0 },
  cookieEnabled: { type: Boolean, default: false },
  doNotTrack: { type: String, default: 'Unknown' },
  plugins: [{ type: String }],
  emailSent: { type: Boolean, default: false },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
});

export default mongoose.models.Intrusion || mongoose.model<IIntrusion>('Intrusion', IntrusionSchema);
