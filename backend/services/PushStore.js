const mongoose = require("mongoose");
const webpush = require("web-push");

// ── Push Subscription Model ────────────────────────────────────────────────
const pushSubSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: String,
    auth: String,
  },
  createdAt: { type: Date, default: Date.now },
});

const PushSubscription =
  mongoose.models.PushSubscription || mongoose.model("PushSubscription", pushSubSchema);

// ── Configure web-push ─────────────────────────────────────────────────────
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:sundaymac47@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function subscribe(subscription) {
  const existing = await PushSubscription.findOne({ endpoint: subscription.endpoint });
  if (existing) return existing;
  return new PushSubscription(subscription).save();
}

async function unsubscribe(endpoint) {
  return PushSubscription.deleteOne({ endpoint });
}

async function sendToAll(payload) {
  const subs = await PushSubscription.find();
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  let sent = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        data
      );
      sent++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await PushSubscription.deleteOne({ _id: sub._id });
        console.log("🗑️ Removed expired push subscription");
      } else {
        console.warn("Push send failed:", err.message);
      }
    }
  }

  return sent;
}

module.exports = { subscribe, unsubscribe, sendToAll, PushSubscription };
