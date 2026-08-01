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
import { spawn, exec } from "child_process";
import { writeFileSync } from "fs";
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
    // Custom bashrc giving the terminal proper PATH and Windows command aliases
    const bashrc = `
# ── PATH: add iproute2 so 'ip' works ─────────────────────────────────
export PATH="/nix/store/30yhi8slm1993fabx0052whmsv86x3zm-iproute2-6.11.0/sbin:/nix/store/30yhi8slm1993fabx0052whmsv86x3zm-iproute2-6.11.0/bin:$PATH"

# ── Prompt ────────────────────────────────────────────────────────────
export PS1="\\[\\033[01;32m\\][CS]\\[\\033[00m\\] \\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ "

# ── Windows / macOS command aliases ──────────────────────────────────
# NOTE: ipconfig is defined as a function below (alias + function same name = syntax error)
alias ifconfig='ip addr show'
alias cls='clear'
alias dir='ls -la'
alias del='rm'
alias copy='cp'
alias move='mv'
alias md='mkdir'
alias rd='rmdir'
alias nslookup='dig'
alias where='which'
alias tasklist='ps aux'
alias set='env'

# ipconfig /all and /flushdns handled via function (slash in alias name is invalid)
ipconfig() {
  local arg="\${1:-}"
  local lower
  lower=$(echo "$arg" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    /all|//all)  ip addr show ;;
    /flushdns)   resolvectl flush-caches 2>/dev/null && echo "DNS cache flushed" || echo "DNS flush not available" ;;
    *)           ip addr show ;;
  esac
}
export -f ipconfig 2>/dev/null || true

netstat() { ss "$@"; }
export -f netstat 2>/dev/null || true

# ── ping: ICMP raw sockets are blocked in this container ─────────────
# Falls back to TCP reachability check + DNS resolution
ping() {
  # Find the target host (first non-flag argument)
  local host=""
  for _arg in "$@"; do
    case "$_arg" in -*) ;; *) host="$_arg"; break ;; esac
  done

  if [ -z "$host" ]; then
    echo "Usage: ping [options] <host>"
    return 1
  fi

  # Quick check: does native ping actually work?
  if command ping -c1 -W1 "$host" >/dev/null 2>&1; then
    command ping "$@"
    return $?
  fi

  # Fallback — container blocks raw/ICMP sockets
  echo -e "\\033[33m[CS] ICMP ping blocked (container lacks cap_net_raw).\\033[0m"
  echo -e "\\033[33m[CS] Running TCP reachability check instead...\\033[0m\\n"

  # DNS resolve
  local ip
  ip=$(dig +short "$host" A 2>/dev/null | head -1)
  if [ -n "$ip" ]; then
    echo -e "\\033[32mDNS  $host  →  $ip\\033[0m"
  else
    echo -e "\\033[31mDNS  could not resolve $host\\033[0m"
  fi

  # TCP probe ports 80 and 443
  for _port in 80 443; do
    local _t0 _t1 _ms
    _t0=$(date +%s%3N)
    if nc -z -w 3 "$host" "$_port" 2>/dev/null; then
      _t1=$(date +%s%3N)
      _ms=$(( _t1 - _t0 ))
      echo -e "\\033[32mTCP  $host:$_port  open  (\${_ms} ms)\\033[0m"
    else
      echo -e "\\033[31mTCP  $host:$_port  unreachable\\033[0m"
    fi
  done
}
export -f ping 2>/dev/null || true

# ── command_not_found_handle ──────────────────────────────────────────
command_not_found_handle() {
  local cmd="$1"
  echo -e "\\033[31mbash: $cmd: command not found\\033[0m"
  local lower
  lower=$(echo "$cmd" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    tracert*)  echo -e "\\033[33mHint: use 'traceroute <host>'\\033[0m" ;;
    nmap*)     echo -e "\\033[33mHint: nmap may not be installed. Try 'nc -zv <host> <port>'\\033[0m" ;;
    ping-*)    echo -e "\\033[33mHint: use 'ping <host>' — the CS ping wrapper handles fallback\\033[0m" ;;
  esac
  return 127
}
export -f command_not_found_handle 2>/dev/null || true
`;

    const rcFile = `/tmp/cs-terminal-${Date.now()}.bashrc`;
    writeFileSync(rcFile, bashrc);

    const shell = spawn(
      "script",
      ["-q", "-c", `bash --rcfile ${rcFile} -i`, "/dev/null"],
      {
        env: {
          ...process.env,
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
          HOME: process.env.HOME ?? "/root",
          SHELL: "/bin/bash",
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

      // JSON control messages
      try {
        const ctrl = JSON.parse(data.toString("utf8"));

        if (ctrl.type === "resize") {
          // node-pty not available; resize is a no-op but we ack it silently
          return;
        }

        if (ctrl.type === "get_commands") {
          // Return every executable visible on $PATH — used by the frontend
          // for universal command suggestions beyond the hardcoded database.
          exec(
            "compgen -c 2>/dev/null | sort -u",
            { shell: "/bin/bash" },
            (_err, stdout) => {
              if (ws.readyState === WebSocket.OPEN) {
                const commands = stdout
                  .split("\n")
                  .map((c) => c.trim())
                  .filter((c) => c.length > 0 && c.length < 64);
                ws.send(
                  JSON.stringify({ type: "commands_list", commands })
                );
              }
            }
          );
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
