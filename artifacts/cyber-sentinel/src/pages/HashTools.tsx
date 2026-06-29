import React, { useState } from 'react';
import { Hash, Copy, Check, Search } from 'lucide-react';

const HASH_PATTERNS: Array<{ name: string; regex: RegExp; len: number; desc: string }> = [
  { name: 'MD5', regex: /^[a-f0-9]{32}$/i, len: 32, desc: 'Message Digest 5 — obsolete, collision-prone' },
  { name: 'SHA-1', regex: /^[a-f0-9]{40}$/i, len: 40, desc: 'SHA-1 — broken, avoid for security' },
  { name: 'SHA-224', regex: /^[a-f0-9]{56}$/i, len: 56, desc: 'SHA-2 family, 224-bit' },
  { name: 'SHA-256', regex: /^[a-f0-9]{64}$/i, len: 64, desc: 'SHA-2 family, 256-bit — widely used' },
  { name: 'SHA-384', regex: /^[a-f0-9]{96}$/i, len: 96, desc: 'SHA-2 family, 384-bit' },
  { name: 'SHA-512', regex: /^[a-f0-9]{128}$/i, len: 128, desc: 'SHA-2 family, 512-bit' },
  { name: 'bcrypt', regex: /^\$2[aby]?\$\d{2}\$.{53}$/, len: 0, desc: 'bcrypt password hash — adaptive, salted' },
  { name: 'scrypt', regex: /^\$scrypt\$/, len: 0, desc: 'scrypt — memory-hard key derivation' },
  { name: 'Argon2', regex: /^\$argon2/, len: 0, desc: 'Argon2 — winner of PHC, recommended' },
  { name: 'MD4', regex: /^[a-f0-9]{32}$/i, len: 32, desc: 'MD4 — obsolete predecessor of MD5' },
  { name: 'NTLM', regex: /^[a-f0-9]{32}$/i, len: 32, desc: 'Windows NTLM hash' },
  { name: 'LM', regex: /^[a-f0-9]{32}$/i, len: 32, desc: 'LAN Manager hash — very weak' },
  { name: 'MySQL 4.1+', regex: /^\*[A-F0-9]{40}$/, len: 0, desc: 'MySQL password hash' },
  { name: 'SHA3-256', regex: /^[a-f0-9]{64}$/i, len: 64, desc: 'SHA-3 family, 256-bit (Keccak)' },
  { name: 'SHA3-512', regex: /^[a-f0-9]{128}$/i, len: 128, desc: 'SHA-3 family, 512-bit (Keccak)' },
  { name: 'RIPEMD-160', regex: /^[a-f0-9]{40}$/i, len: 40, desc: 'RIPEMD-160 — used in Bitcoin' },
  { name: 'Whirlpool', regex: /^[a-f0-9]{128}$/i, len: 128, desc: 'Whirlpool — 512-bit block cipher based' },
  { name: 'CRC32', regex: /^[a-f0-9]{8}$/i, len: 8, desc: 'CRC-32 — checksum, not cryptographic' },
  { name: 'BLAKE2', regex: /^[a-f0-9]{64}$/i, len: 64, desc: 'BLAKE2b — fast, secure, modern' },
];

function identifyHash(input: string): typeof HASH_PATTERNS {
  const t = input.trim();
  if (!t) return [];
  return HASH_PATTERNS.filter(p => p.regex.test(t));
}

async function hashText(text: string, algo: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest(algo, buf);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function CopyBtn({ text }: { text: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1500); }}
      className="p-1 text-muted-foreground hover:text-primary transition-colors">
      {c ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

export default function HashTools() {
  const [input, setInput] = useState('');
  const [hashInput, setHashInput] = useState('');
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const identified = identifyHash(input);

  async function computeHashes() {
    if (!hashInput) return;
    setLoading(true);
    const algos: Array<[string, string]> = [
      ['SHA-1', 'SHA-1'], ['SHA-256', 'SHA-256'], ['SHA-384', 'SHA-384'], ['SHA-512', 'SHA-512'],
    ];
    const results: Record<string, string> = {};
    for (const [label, algo] of algos) {
      results[label] = await hashText(hashInput, algo);
    }
    setHashes(results);
    setLoading(false);
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><Hash size={22} /> Hash Tools</h1>
          <p className="text-muted-foreground text-xs">Identify hash types and compute SHA hashes in-browser via Web Crypto API.</p>
        </header>

        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase flex items-center gap-2">
            <Search size={13} /> Hash Identifier
          </div>
          <div className="p-4 space-y-4">
            <textarea value={input} onChange={e => setInput(e.target.value)} rows={3}
              placeholder="Paste a hash here to identify its type…"
              className="w-full bg-black/50 border border-border rounded p-3 text-xs text-primary font-mono outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40" />

            {input.trim() && (
              identified.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Possible matches ({identified.length})</div>
                  {identified.map(h => (
                    <div key={h.name} className="flex items-center justify-between px-3 py-2 bg-secondary/30 border border-border rounded">
                      <div>
                        <span className="text-primary font-bold text-sm">{h.name}</span>
                        <span className="ml-3 text-xs text-muted-foreground">{h.desc}</span>
                      </div>
                      {h.len > 0 && <span className="text-[10px] text-muted-foreground">{h.len} chars</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No known hash pattern matched. Input may be salted, encoded, or custom.</div>
              )
            )}
          </div>
        </div>

        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase flex items-center gap-2">
            <Hash size={13} /> Hash Generator (SHA family — Web Crypto)
          </div>
          <div className="p-4 space-y-4">
            <textarea value={hashInput} onChange={e => setHashInput(e.target.value)} rows={3}
              placeholder="Enter plaintext to hash…"
              className="w-full bg-black/50 border border-border rounded p-3 text-xs text-primary font-mono outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40" />
            <button onClick={computeHashes} disabled={!hashInput || loading}
              className="px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-xs rounded transition-colors disabled:opacity-50">
              {loading ? 'Computing…' : 'Compute Hashes'}
            </button>

            {Object.keys(hashes).length > 0 && (
              <div className="space-y-2">
                {Object.entries(hashes).map(([algo, hash]) => (
                  <div key={algo} className="bg-black/40 border border-border rounded p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-primary font-bold tracking-widest uppercase">{algo}</span>
                      <CopyBtn text={hash} />
                    </div>
                    <code className="text-xs text-muted-foreground break-all">{hash}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">
            Quick Reference
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-black/20">
                  <th className="text-left px-4 py-2 text-muted-foreground font-normal">Algorithm</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-normal">Bits</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-normal">Hex Chars</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['MD5', '128', '32', '❌ Broken'],
                  ['SHA-1', '160', '40', '⚠️ Deprecated'],
                  ['SHA-256', '256', '64', '✅ Secure'],
                  ['SHA-512', '512', '128', '✅ Secure'],
                  ['SHA3-256', '256', '64', '✅ Secure'],
                  ['bcrypt', '-', '60', '✅ For passwords'],
                  ['Argon2', '-', 'var', '✅ Recommended'],
                ].map(([alg, bits, chars, status]) => (
                  <tr key={alg} className="border-b border-border/40 hover:bg-secondary/10">
                    <td className="px-4 py-2 text-primary font-mono">{alg}</td>
                    <td className="px-4 py-2 text-muted-foreground">{bits}</td>
                    <td className="px-4 py-2 text-muted-foreground">{chars}</td>
                    <td className="px-4 py-2">{status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
