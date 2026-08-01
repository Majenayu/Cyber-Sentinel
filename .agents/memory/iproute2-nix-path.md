---
name: iproute2 nix path
description: Correct x86_64 iproute2 binary path in the Nix store for this Replit environment
---

The working x86_64 `ip` binary is at:
```
/nix/store/30yhi8slm1993fabx0052whmsv86x3zm-iproute2-6.11.0/sbin/ip
```

**Why:** The nix store has many iproute2 builds. The one at `0db032vcny2wsigan7y93abkvrx97453-iproute2-6.11.0` is an ELF 32-bit binary (Intel 80386) and cannot execute on this x86_64 runtime — it fails with "cannot execute binary file: Exec format error". Only `30yhi8slm1993fabx0052whmsv86x3zm-iproute2-6.11.0` is the actual x86_64 build.

**How to apply:** Any terminal `.bashrc` or PATH injection that needs `ip addr`, `ip route`, etc. must use the `30yhi8slm1993fabx0052whmsv86x3zm` hash, not the other iproute2 hashes in the store.
