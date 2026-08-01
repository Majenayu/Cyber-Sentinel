/**
 * Remote Windows Terminal — SSH over Cloudflare Tunnel via WebSocket.
 *
 * Flow:
 *   Browser  ──WS──►  /ws/remote-terminal  ──ssh2──►  cloudflared proxy  ──►  Windows SSH
 *
 * First message from client must be JSON:
 *   { type:"connect", hostname, username, password, cols, rows }
 *
 * After that:
 *   Client→Server: { type:"data", data:"<keystrokes>" }
 *                  { type:"resize", cols:N, rows:N }
 *   Server→Client: raw PTY bytes (string)
 *                  { type:"connected" }   (JSON, once session ready)
 *                  { type:"error", message:"..." }
 */
import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Client as SshClient } from "ssh2";
import { spawn } from "child_process";
import { Duplex } from "stream";
import { logger } from "../lib/logger";

const CF_PATH =
  process.env.CLOUDFLARED_PATH ||
  "/home/runner/.local/bin/cloudflared";

const MAX_SESSIONS = 5;
let sessionCount = 0;

export function attachRemoteTerminalWs(server: Server) {
  // noServer + perMessageDeflate: false — same pattern as terminal.ts (see comments there)
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false });

  wss.on("connection", (ws: WebSocket) => {
    if (sessionCount >= MAX_SESSIONS) {
      ws.send(JSON.stringify({ type: "error", message: "Max remote sessions reached." }));
      ws.close();
      return;
    }

    sessionCount++;
    logger.info({ sessions: sessionCount }, "Remote terminal session opened");

    let ssh: SshClient | null = null;
    let stream: Duplex | null = null;
    let cfProc: ReturnType<typeof spawn> | null = null;
    let closed = false;

    function cleanup() {
      if (closed) return;
      closed = true;
      sessionCount = Math.max(0, sessionCount - 1);
      try { stream?.end(); } catch {}
      try { ssh?.end(); } catch {}
      try { cfProc?.kill(); } catch {}
      logger.info({ sessions: sessionCount }, "Remote terminal session closed");
    }

    ws.on("close", cleanup);
    ws.on("error", cleanup);

    // ── Wait for first message: the connect config ──────────────────────
    ws.once("message", (raw) => {
      let cfg: { type: string; hostname: string; username: string; password: string; cols: number; rows: number };
      try {
        cfg = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "Invalid connect message." }));
        ws.close();
        cleanup();
        return;
      }

      if (cfg.type !== "connect" || !cfg.hostname || !cfg.username || !cfg.password) {
        ws.send(JSON.stringify({ type: "error", message: "Missing hostname, username or password." }));
        ws.close();
        cleanup();
        return;
      }

      const { hostname, username, password, cols = 80, rows = 24 } = cfg;
      logger.info({ hostname, username }, "Remote terminal: connecting via Cloudflare tunnel");

      // Helper: send a status line to the xterm without it being raw PTY data
      function statusLine(msg: string) {
        if (ws.readyState === WebSocket.OPEN)
          ws.send(`\r\n\x1b[33m[→] ${msg}\x1b[0m\r\n`);
      }

      statusLine(`Launching Cloudflare Tunnel proxy to ${hostname}…`);

      // ── Spawn cloudflared as a ProxyCommand (stdio = SSH transport) ───
      cfProc = spawn(CF_PATH, ["access", "ssh", "--hostname", hostname], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      cfProc.on("error", (err) => {
        logger.error({ err }, "cloudflared spawn error");
        ws.send(JSON.stringify({ type: "error", message: `cloudflared error: ${err.message}. Make sure the tunnel is running on Windows.` }));
        cleanup();
        ws.close();
      });

      cfProc.stderr?.on("data", (d: Buffer) => {
        const txt = d.toString();
        logger.debug({ txt }, "cloudflared stderr");
        // Surface critical errors to the client
        if (txt.toLowerCase().includes("error") || txt.toLowerCase().includes("failed")) {
          ws.send(JSON.stringify({ type: "error", message: `Tunnel error: ${txt.trim()}` }));
        }
      });

      // Build a Duplex from the child process stdio to hand to ssh2
      const proxySocket = new Duplex({
        read() {},
        write(chunk, _enc, cb) {
          cfProc?.stdin?.write(chunk, cb);
        },
      });
      cfProc.stdout?.on("data", (d: Buffer) => proxySocket.push(d));
      cfProc.on("close", () => proxySocket.push(null));

      // ── Connect via ssh2 ──────────────────────────────────────────────
      ssh = new SshClient();

      ssh.on("ready", () => {
        logger.info({ hostname, username }, "SSH ready — opening PTY shell");
        statusLine("Tunnel established — opening shell…");
        ssh!.shell({ term: "xterm-256color", cols, rows }, (err, sh) => {
          if (err) {
            ws.send(JSON.stringify({ type: "error", message: `Shell error: ${err.message}` }));
            cleanup();
            ws.close();
            return;
          }
          stream = sh;

          // Tell the client we're connected
          ws.send(JSON.stringify({ type: "connected" }));

          // Stream PTY output → WebSocket
          sh.on("data", (d: Buffer) => {
            if (ws.readyState === WebSocket.OPEN) ws.send(d.toString("binary"));
          });
          sh.stderr?.on("data", (d: Buffer) => {
            if (ws.readyState === WebSocket.OPEN) ws.send(d.toString("binary"));
          });

          sh.on("close", () => {
            if (ws.readyState === WebSocket.OPEN) ws.close();
            cleanup();
          });

          // ── Forward client messages to SSH stream ────────────────────
          ws.on("message", (msg) => {
            try {
              const m = JSON.parse(msg.toString());
              if (m.type === "data") {
                sh.write(m.data);
              } else if (m.type === "resize") {
                sh.setWindow(m.rows, m.cols, 0, 0);
              }
            } catch {
              // Not JSON — treat as raw data
              sh.write(msg.toString());
            }
          });
        });
      });

      ssh.on("error", (err) => {
        logger.error({ err }, "SSH connection error");
        let msg = err.message;
        if (msg.includes("Authentication")) msg = "Authentication failed — check your username and password.";
        else if (msg.includes("ECONNREFUSED")) msg = "Connection refused — is the tunnel still running on Windows?";
        ws.send(JSON.stringify({ type: "error", message: msg }));
        cleanup();
        ws.close();
      });

      ssh.connect({
        sock: proxySocket as unknown as import("net").Socket,
        username,
        password,
        // Generous timeouts for tunnel setup
        readyTimeout: 30_000,
        keepaliveInterval: 10_000,
        keepaliveCountMax: 3,
        // Accept any host key — tunnel hostname is ephemeral
        hostVerifier: () => true,
      });
    });
  });

  logger.info("Remote terminal WebSocket server ready (noServer mode)");
  return wss;
}
