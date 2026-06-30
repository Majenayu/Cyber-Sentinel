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
  languages: string[];
  screenResolution: string;
  colorDepth: number;
  cores: number;
  memory: number;
  cookieEnabled: boolean;
  doNotTrack: string;
  plugins: string[];
  referrer: string;
  // Advanced fingerprinting
  canvasHash: string;
  webglRenderer: string;
  webglVendor: string;
  webglVersion: string;
  webglExtensions: number;
  audioHash: string;
  webrtcIps: string[];
  isIncognito: boolean;
  hasAdBlocker: boolean;
  geoPermission: string;
  notificationPermission: string;
  cameraPermission: string;
  micPermission: string;
  connectionType: string;
  downlink: number;
  rtt: number;
  supportedCodecs: string;
  batteryLevel: number;
  batteryCharging: boolean;
  uaData: string;
  typeTimeMs: number;
  usedPaste: boolean;
  darkMode: boolean;
  reducedMotion: boolean;
  devicePixelRatio: number;
  availableScreen: string;
  viewport: string;
  windowSize: string;
  maxTouchPoints: number;
  touchDevice: boolean;
  timezoneOffset: number;
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
  languages: [{ type: String }],
  screenResolution: { type: String, default: 'Unknown' },
  colorDepth: { type: Number, default: 0 },
  cores: { type: Number, default: 0 },
  memory: { type: Number, default: 0 },
  cookieEnabled: { type: Boolean, default: false },
  doNotTrack: { type: String, default: 'Unknown' },
  plugins: [{ type: String }],
  referrer: { type: String, default: '' },
  canvasHash: { type: String, default: '' },
  webglRenderer: { type: String, default: '' },
  webglVendor: { type: String, default: '' },
  webglVersion: { type: String, default: '' },
  webglExtensions: { type: Number, default: 0 },
  audioHash: { type: String, default: '' },
  webrtcIps: [{ type: String }],
  isIncognito: { type: Boolean, default: false },
  hasAdBlocker: { type: Boolean, default: false },
  geoPermission: { type: String, default: 'unknown' },
  notificationPermission: { type: String, default: 'unknown' },
  cameraPermission: { type: String, default: 'unknown' },
  micPermission: { type: String, default: 'unknown' },
  connectionType: { type: String, default: 'unknown' },
  downlink: { type: Number, default: 0 },
  rtt: { type: Number, default: 0 },
  supportedCodecs: { type: String, default: '' },
  batteryLevel: { type: Number, default: -1 },
  batteryCharging: { type: Boolean, default: false },
  uaData: { type: String, default: '' },
  typeTimeMs: { type: Number, default: 0 },
  usedPaste: { type: Boolean, default: false },
  darkMode: { type: Boolean, default: false },
  reducedMotion: { type: Boolean, default: false },
  devicePixelRatio: { type: Number, default: 1 },
  availableScreen: { type: String, default: '' },
  viewport: { type: String, default: '' },
  windowSize: { type: String, default: '' },
  maxTouchPoints: { type: Number, default: 0 },
  touchDevice: { type: Boolean, default: false },
  timezoneOffset: { type: Number, default: 0 },
  emailSent: { type: Boolean, default: false },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
});

export default mongoose.models.Intrusion || mongoose.model<IIntrusion>('Intrusion', IntrusionSchema);
