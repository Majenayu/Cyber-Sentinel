---
name: Bash scripts embedded in JS template literals
description: Rules for writing bash heredocs inside TypeScript/JS backtick strings compiled by esbuild
---

## The Problem
esbuild parses the entire backtick string as a JS template literal before writing to disk. Any `${...}` that appears inside the string is treated as a JS template expression — even if it's bash syntax like `${1:-}`, `${_ms}`, `${cmd,,}`.

## The Rules

**1. Escape every bash `${...}` with `\${...}`**
```ts
// WRONG — esbuild errors: "Expected } but found :"
const script = `local arg="${1:-}"`;

// CORRECT
const script = `local arg="\${1:-}"`;
```

Common bash patterns that need escaping:
- Default params: `${1:-}` → `\${1:-}`
- Variable expansion with ops: `${var,,}` (lowercase), `${var^^}` (uppercase), `${#var}` (length)
- Any `${varname}` form → `\${varname}`
- Plain `$varname` (no braces) is fine — JS only substitutes `${...}`

**2. Bash alias names cannot contain slashes**
```bash
# WRONG — bash rejects this
alias ipconfig/all='ip addr show'

# CORRECT — use a function instead
ipconfig() {
  local arg="\${1:-}"
  case "$arg" in /all) ip addr show ;; *) ip addr show ;; esac
}
```

**3. ICMP/ping is blocked in this Replit container**
- `ping` with `SOCK_RAW` → "Operation not permitted" (missing cap_net_raw)
- `ping` with `SOCK_DGRAM` → "Address family not supported"
- Workaround: override `ping` as a bash function that falls back to `nc -z` (TCP probe) + `dig` (DNS)

**Why:** esbuild processes the source file as TypeScript/JS first, expanding template literals syntactically, before the string content ever reaches the filesystem. There is no "raw string" mode in JS template literals for this purpose.

**How to apply:** Any time you write a bash script as a backtick string in terminal.ts (or any TS file compiled by esbuild), scan every line for `${` and prepend a backslash.
