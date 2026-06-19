const WebSocket = require("ws");

/**
 * Real-time notification service to alert the dashboard 
 * when New Jobs are found by the scraper.
 */
class Notifier {
  constructor() {
    this.wss = null;
  }

  /**
   * Initialize WebSocket server sharing the same HTTP port
   */
  init(server) {
    this.wss = new WebSocket.Server({ server });
    this.wss.on("connection", (ws) => {
      console.log("📱 Dashboard connected via WebSocket");
      ws.send(JSON.stringify({ type: "SYNC", message: "Connected to Sunday Mac 47" }));
    });
  }

  /**
   * Broadcast shift to all connected dashboards
   */
  notifyNewJobs(count, matches) {
    if (!this.wss) return;
    const payload = JSON.stringify({
      type: "NEW_JOBS",
      count,
      matches,
      timestamp: new Date()
    });
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
    console.log(`🔔 Broadcasted ${count} new matches to dashboard.`);
  }

  /**
   * Send a general system alert
   */
  sendAlert(message) {
    if (!this.wss) return;
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "ALERT", message }));
      }
    });
  }
}

module.exports = new Notifier();
