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
  // noServer: true — we route upgrade events manually in index.ts so that multiple
  // WebSocketServer instances on the same http.Server don't each send their own
  // HTTP response (101 + 400) to a single upgrade request, which corrupts the stream.
  // perMessageDeflate: false — prevents RSV1 mismatch when Vite's proxy forwards
  // compressed frames from the browser to this server.
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    if (sessionCount >= MAX_SESSIONS) {
      ws.send("\r\n\x1b[31m[CyberSentinel] Max terminal sessions reached.\x1b[0m\r\n");
      ws.close();
      return;
    }

    sessionCount++;
    logger.info({ sessions: sessionCount }, "Terminal session opened");

    // Shell is spawned lazily on first resize message so COLUMNS/LINES match
    // the actual xterm viewport from the start.
    let shell: ReturnType<typeof spawn> | null = null;
    let shellStarted = false;
    let sessionDecremented = false;

    function decrementOnce() {
      if (!sessionDecremented) {
        sessionDecremented = true;
        sessionCount = Math.max(0, sessionCount - 1);
      }
    }

    // Use 'script' as a PTY shim so colours, readline, history all work
    // Custom bashrc giving the terminal proper PATH and Windows command aliases
    const sizeFile = `/tmp/cs-size-${Date.now()}.txt`;
    let shellSizeFile = sizeFile;

    const bashrc = `
# ── PATH: add iproute2 so 'ip' works ─────────────────────────────────
export PATH="/nix/store/30yhi8slm1993fabx0052whmsv86x3zm-iproute2-6.11.0/sbin:/nix/store/30yhi8slm1993fabx0052whmsv86x3zm-iproute2-6.11.0/bin:$PATH"

# ── Silent resize: apply pending size from file on each prompt ────────
# The server writes "cols N rows M" to _CS_SIZE_FILE on window resize.
# PROMPT_COMMAND picks it up silently — no stty lines appear in the terminal.
_CS_SIZE_FILE="${sizeFile}"
_cs_apply_size() {
  local _sz
  _sz=$(cat "$_CS_SIZE_FILE" 2>/dev/null)
  if [ -n "$_sz" ]; then
    stty \$_sz 2>/dev/null
    : > "$_CS_SIZE_FILE"
  fi
}
PROMPT_COMMAND="_cs_apply_size"

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
    tracert*)     echo -e "\\033[33m[CS] Hint: Windows tracert → use 'traceroute <host>' on Linux\\033[0m" ;;
    ping-*)       echo -e "\\033[33m[CS] Hint: use 'ping <host>' — the CS ping wrapper handles fallback\\033[0m" ;;
    ipconfig*)    echo -e "\\033[33m[CS] Hint: Windows ipconfig → use 'ip addr show' or 'ifconfig' here\\033[0m" ;;
    ifconfig*)    echo -e "\\033[33m[CS] Hint: use 'ip addr show' — ifconfig is aliased to it\\033[0m" ;;
    netstat*)     echo -e "\\033[33m[CS] Hint: use 'ss -tulnp' — netstat is aliased to ss here\\033[0m" ;;
    metasploit*)  echo -e "\\033[33m[CS] Hint: run 'msfconsole' to launch the Metasploit Framework\\033[0m" ;;
    burpsuite*)   echo -e "\\033[33m[CS] Hint: Burp Suite needs a graphical display (GUI) — not available in this terminal\\033[0m" ;;
    wireshark*)   echo -e "\\033[33m[CS] Hint: Wireshark needs a GUI — use 'tcpdump' for packet capture here\\033[0m" ;;
    python*)      echo -e "\\033[33m[CS] Hint: try 'python3 --version' — Python 3 is available\\033[0m" ;;
    apt*|apt-get*)echo -e "\\033[33m[CS] Hint: this system uses Nix. Try 'nix-env -i <package>' to install software\\033[0m" ;;
    docker*)      echo -e "\\033[33m[CS] Hint: Docker is not available in this container environment\\033[0m" ;;
    git*)         echo -e "\\033[33m[CS] Hint: try 'which git' — git may be available\\033[0m" ;;
  esac
  return 127
}
export -f command_not_found_handle 2>/dev/null || true
`;

    const rcFile = `/tmp/cs-terminal-${Date.now()}.bashrc`;
    writeFileSync(rcFile, bashrc);

    // ── Lazy shell spawn — called on first resize message so COLUMNS/LINES
    //    match the actual xterm viewport, fixing the "same-line" wrapping bug.
    function spawnShell(cols: number, rows: number) {
      shellStarted = true;
      const s = spawn(
        "script",
        ["-q", "-c", `bash --rcfile ${rcFile} -i`, "/dev/null"],
        {
          env: {
            ...process.env,
            TERM: "xterm-256color",
            COLORTERM: "truecolor",
            HOME: process.env.HOME ?? "/root",
            SHELL: "/bin/bash",
            COLUMNS: String(cols),
            LINES: String(rows),
            _CS_SIZE_FILE: sizeFile,
          },
          cwd: process.env.HOME ?? "/",
        }
      );

      // ── shell → client ────────────────────────────────────────────
      s.stdout.on("data", (data: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(data);
      });
      s.stderr.on("data", (data: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(data);
      });

      s.on("exit", (code) => {
        logger.info({ code }, "Terminal shell exited");
        decrementOnce();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(`\r\n\x1b[33m[CyberSentinel] Session ended (exit ${code ?? 0}).\x1b[0m\r\n`);
          ws.close();
        }
      });

      s.on("error", (err) => {
        logger.error({ err }, "Terminal shell error");
        decrementOnce();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(`\r\n\x1b[31m[CyberSentinel] Shell error: ${err.message}\x1b[0m\r\n`);
          ws.close();
        }
      });

      shell = s;
    }

    // ── client → shell ──────────────────────────────────────────────
    ws.on("message", (msg: Buffer | string) => {
      const data = Buffer.isBuffer(msg) ? msg : Buffer.from(msg as string);

      // JSON control messages
      try {
        const ctrl = JSON.parse(data.toString("utf8"));

        if (ctrl.type === "resize") {
          const cols = Math.max(40, Math.min(500, Number(ctrl.cols) || 220));
          const rows = Math.max(10, Math.min(200, Number(ctrl.rows) || 50));

          if (!shellStarted) {
            // First resize — spawn shell with the real terminal dimensions
            spawnShell(cols, rows);
          } else {
            // Subsequent resize — write to size file; PROMPT_COMMAND picks it
            // up silently on the next prompt (no stty lines in the terminal).
            try { writeFileSync(shellSizeFile, `cols ${cols} rows ${rows}`); } catch { /* ignore */ }
          }
          return;
        }

        if (ctrl.type === "get_commands") {
          // Return every executable visible on $PATH for universal suggestions.
          exec(
            "compgen -c 2>/dev/null | sort -u",
            { shell: "/bin/bash" },
            (_err, stdout) => {
              if (ws.readyState === WebSocket.OPEN) {
                const commands = stdout
                  .split("\n")
                  .map((c) => c.trim())
                  .filter((c) => c.length > 0 && c.length < 64);
                ws.send(JSON.stringify({ type: "commands_list", commands }));
              }
            }
          );
          return;
        }
      } catch {
        // Not JSON — raw keystroke, pass through
      }

      if (shell?.stdin.writable) {
        shell.stdin.write(data);
      }
    });

    // ── cleanup ──────────────────────────────────────────────────────
    ws.on("close", () => {
      logger.info("Terminal WebSocket closed");
      decrementOnce();
      if (shell && !shell.killed) shell.kill("SIGHUP");
    });

    ws.on("error", (err) => {
      logger.warn({ err }, "Terminal WebSocket error");
      if (shell && !shell.killed) shell.kill("SIGHUP");
    });
  });

  logger.info("Terminal WebSocket server ready (noServer mode)");
  return wss;
}
