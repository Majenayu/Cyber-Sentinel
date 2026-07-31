/**
 * WebSocket terminal — spawns a real bash session per connection.
 * Uses the system `script` command as a PTY wrapper so interactive
 * programs (arrow-key history, tab completion, colours) all work
 * without needing native node-pty binaries.
 *
 * Attach to the http.Server in index.ts:
 *   attachTerminalWs(server);
 */
import { IncomingMessage, Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { spawn } from "child_process";
import { logger } from "../lib/logger";

const MAX_SESSIONS = 10;
let sessionCount = 0;

export function attachTerminalWs(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws/terminal" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    if (sessionCount >= MAX_SESSIONS) {
      ws.send("\r\n\x1b[31m[CyberSentinel] Max terminal sessions reached.\x1b[0m\r\n");
      ws.close();
      return;
    }

    sessionCount++;
    logger.info({ sessions: sessionCount }, "Terminal session opened");

    // Use 'script' as a PTY shim so colours, readline, history all work
    const shell = spawn(
      "script",
      ["-q", "-c", "bash -i", "/dev/null"],
      {
        env: {
          ...process.env,
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
          HOME: process.env.HOME ?? "/root",
          SHELL: "/bin/bash",
          PS1: "\\[\\033[01;32m\\][CS]\\[\\033[00m\\] \\[\\033[01;34m\\]\\w\\[\\033[00m\\]$ ",
        },
        cwd: process.env.HOME ?? "/",
      }
    );

    // ── shell → client ──────────────────────────────────────────────
    shell.stdout.on("data", (data: Buffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    shell.stderr.on("data", (data: Buffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // ── client → shell ──────────────────────────────────────────────
    ws.on("message", (msg: Buffer | string) => {
      const data = Buffer.isBuffer(msg) ? msg : Buffer.from(msg as string);

      // JSON control messages: { type: "resize", cols, rows }
      try {
        const ctrl = JSON.parse(data.toString("utf8"));
        if (ctrl.type === "resize") {
          // node-pty not available; resize is a no-op but we ack it silently
          return;
        }
      } catch {
        // Not JSON — raw keystroke, pass through
      }

      if (shell.stdin.writable) {
        shell.stdin.write(data);
      }
    });

    // ── cleanup ──────────────────────────────────────────────────────
    shell.on("exit", (code) => {
      logger.info({ code }, "Terminal shell exited");
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(`\r\n\x1b[33m[CyberSentinel] Session ended (exit ${code ?? 0}).\x1b[0m\r\n`);
        ws.close();
      }
      sessionCount = Math.max(0, sessionCount - 1);
    });

    shell.on("error", (err) => {
      logger.error({ err }, "Terminal shell error");
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(`\r\n\x1b[31m[CyberSentinel] Shell error: ${err.message}\x1b[0m\r\n`);
        ws.close();
      }
      sessionCount = Math.max(0, sessionCount - 1);
    });

    ws.on("close", () => {
      logger.info("Terminal WebSocket closed");
      if (!shell.killed) shell.kill("SIGHUP");
      sessionCount = Math.max(0, sessionCount - 1);
    });

    ws.on("error", (err) => {
      logger.warn({ err }, "Terminal WebSocket error");
      if (!shell.killed) shell.kill("SIGHUP");
    });
  });

  logger.info("Terminal WebSocket server attached at /ws/terminal");
}
