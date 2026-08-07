---
name: SecLists Windows and WSL paths
description: Confirmed SecLists root and the required Windows-to-WSL path conversion for remote terminal commands
---

The confirmed source tree is under the Windows user's HTB folder:

`C:\Users\<username>\Downloads\hack-the-box\SecLists-master`

When a command is prefixed with `wsl`, wordlists from that tree must use the mounted WSL form:

`/mnt/c/Users/<username>/Downloads/hack-the-box/SecLists-master`

The confirmed web wordlist is `Discovery/Web-Content/common.txt`; the confirmed DNS wordlist is `Discovery/DNS/subdomains-top1million-5000.txt`. Do not substitute `directories.txt` or pass a `C:\...` path to a WSL command.

**Why:** The remote Windows machine owns the uploaded SecLists tree, while WSL tools cannot read PowerShell paths directly. Model-generated paths were causing Phase 4 guidance to point at nonexistent files.

**How to apply:** Keep SecLists path completion deterministic and local to the terminal UI. Use AI only for non-path suggestions, and normalize any returned WSL command server-side as a final guard.