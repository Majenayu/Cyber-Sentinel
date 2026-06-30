import React, { useState, useMemo } from 'react';
import { Key, Copy, Check, AlertTriangle, CheckCircle, Binary, Link2, FileJson, Code2, FileCode2, BookOpen } from 'lucide-react';

type Tool = 'jwt' | 'base64' | 'url' | 'json' | 'hex' | 'xml';

function CopyBtn({ text }: { text: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1500); }}
      className="p-1 text-muted-foreground hover:text-primary transition-colors">
      {c ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

function ResultBox({ label, value, mono = true }: { label?: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-black/20">
          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{label}</span>
          <CopyBtn text={value} />
        </div>
      )}
      {!label && (
        <div className="absolute top-2 right-2"><CopyBtn text={value} /></div>
      )}
      <div className="relative">
        {label && null}
        {!label && <div className="absolute top-2 right-2"><CopyBtn text={value} /></div>}
        <pre className={`p-4 text-xs overflow-x-auto whitespace-pre-wrap break-all ${mono ? 'font-mono text-primary/90' : 'text-muted-foreground'}`}>
          {value}
        </pre>
      </div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded border border-primary/20 bg-primary/5 text-xs text-muted-foreground leading-relaxed">
      <BookOpen size={14} className="text-primary shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// ─── JWT ────────────────────────────────────────────────────────────────────
const JWT_SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIFVzZXIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6OTk5OTk5OTk5OX0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

function b64decode(str: string) {
  try {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch { return null; }
}

function JwtTool() {
  const [jwt, setJwt] = useState('');

  const parts = useMemo(() => {
    const t = jwt.trim();
    if (!t) return null;
    const segs = t.split('.');
    if (segs.length !== 3) return null;
    const header = b64decode(segs[0]);
    const payload = b64decode(segs[1]);
    const sig = segs[2];
    if (!header || !payload) return null;
    return { header, payload, sig, raw: segs };
  }, [jwt]);

  const expStatus = useMemo(() => {
    if (!parts?.payload) return null;
    const exp = parts.payload.exp;
    const iat = parts.payload.iat;
    if (!exp) return null;
    const now = Math.floor(Date.now() / 1000);
    return { expired: now > exp, expDate: new Date(exp * 1000).toISOString(), iatDate: iat ? new Date(iat * 1000).toISOString() : null, timeLeft: exp - now };
  }, [parts]);

  return (
    <div className="space-y-4">
      <InfoBox>
        <strong className="text-foreground">What is a JWT?</strong> A JSON Web Token (JWT) is a small "ticket" passed between a web browser and a server to prove who you are. It has 3 parts joined by dots: <code className="bg-black/30 px-1 rounded text-primary">header.payload.signature</code>. The header says which algorithm was used, the payload contains your data (username, role, expiry), and the signature proves it wasn't tampered with. You can safely decode the header and payload — they're just base64-encoded JSON. The signature verifies authenticity.
      </InfoBox>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-muted-foreground tracking-widest uppercase">JWT Token</label>
          <button onClick={() => setJwt(JWT_SAMPLE)} className="text-[10px] text-primary/60 hover:text-primary tracking-wider">load sample →</button>
        </div>
        <textarea value={jwt} onChange={e => setJwt(e.target.value)} rows={4}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          className="w-full bg-black/50 border border-border rounded p-3 text-xs text-primary font-mono outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40" />
      </div>

      {parts ? (
        <div className="space-y-4">
          {expStatus && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded border ${expStatus.expired ? 'border-red-500/40 bg-red-950/20 text-red-400' : 'border-green-500/40 bg-green-950/20 text-green-400'}`}>
              {expStatus.expired ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
              <div className="text-xs">
                <span className="font-bold">{expStatus.expired ? 'TOKEN EXPIRED' : 'TOKEN VALID'}</span>
                <span className="ml-3 text-muted-foreground">
                  {expStatus.expired
                    ? `Expired ${new Date(expStatus.expDate).toLocaleString()}`
                    : `Expires ${new Date(expStatus.expDate).toLocaleString()} (${Math.floor(expStatus.timeLeft / 3600)}h ${Math.floor((expStatus.timeLeft % 3600) / 60)}m remaining)`}
                </span>
              </div>
            </div>
          )}

          <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-black/20">
              <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Header — algorithm &amp; type</span>
              <CopyBtn text={JSON.stringify(parts.header, null, 2)} />
            </div>
            <pre className="p-4 text-xs text-primary/90 overflow-x-auto font-mono">{JSON.stringify(parts.header, null, 2)}</pre>
          </div>

          <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-black/20">
              <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Payload — your data (not encrypted!)</span>
              <CopyBtn text={JSON.stringify(parts.payload, null, 2)} />
            </div>
            <pre className="p-4 text-xs text-primary/90 overflow-x-auto font-mono">{JSON.stringify(parts.payload, null, 2)}</pre>
          </div>

          <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-black/20">
              <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Signature — raw (base64url)</span>
              <CopyBtn text={parts.sig} />
            </div>
            <div className="p-4 text-xs text-muted-foreground break-all font-mono">{parts.sig}</div>
          </div>

          <div className="bg-card/50 border border-border rounded-lg p-4 space-y-2 text-xs">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Token Metadata</div>
            {[
              ['Algorithm', parts.header.alg],
              ['Type', parts.header.typ],
              ['Subject (sub)', parts.payload.sub],
              ['Issuer (iss)', parts.payload.iss],
              ['Audience (aud)', parts.payload.aud],
              ['Issued At', expStatus?.iatDate ? new Date(expStatus.iatDate).toLocaleString() : null],
              ['Expires', expStatus?.expDate ? new Date(expStatus.expDate).toLocaleString() : null],
            ].filter(([, v]) => v != null).map(([k, v]) => (
              <div key={String(k)} className="flex justify-between border-b border-border/40 pb-2 last:border-0">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-primary font-mono">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : jwt.trim() ? (
        <div className="text-center py-8 text-red-400 text-xs">
          <AlertTriangle className="mx-auto mb-2" size={20} />
          Invalid JWT — must be 3 base64url segments joined by dots.
        </div>
      ) : null}
    </div>
  );
}

// ─── Base64 ─────────────────────────────────────────────────────────────────
const B64_SAMPLE = 'SGVsbG8sIFdvcmxkISBUaGlzIGlzIGEgQmFzZTY0IGVuY29kZWQgc3RyaW5nLg==';

function Base64Tool() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'decode' | 'encode'>('decode');

  const output = useMemo(() => {
    const t = input.trim();
    if (!t) return '';
    try {
      if (mode === 'decode') return atob(t);
      return btoa(unescape(encodeURIComponent(t)));
    } catch { return '⚠ Invalid base64 string'; }
  }, [input, mode]);

  return (
    <div className="space-y-4">
      <InfoBox>
        <strong className="text-foreground">What is Base64?</strong> Base64 is a way to turn any binary data (images, files, random bytes) into safe text that can travel through email or URLs without getting corrupted. It uses only letters A-Z, a-z, numbers 0-9, and <code className="bg-black/30 px-1 rounded text-primary">+</code> <code className="bg-black/30 px-1 rounded text-primary">/</code> <code className="bg-black/30 px-1 rounded text-primary">=</code>. The string gets about 33% longer. You'll see it in JWTs, data URIs (<code className="bg-black/30 px-1 rounded text-primary">data:image/png;base64,...</code>), and Basic Auth headers (<code className="bg-black/30 px-1 rounded text-primary">Authorization: Basic dXNlcjpwYXNz</code>).
      </InfoBox>

      <div className="flex gap-2 items-center">
        <div className="flex rounded border border-border overflow-hidden text-xs">
          {(['decode', 'encode'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-4 py-2 capitalize transition-colors ${mode === m ? 'bg-primary/10 text-primary border-r border-primary/30' : 'text-muted-foreground hover:text-foreground'}`}>
              {m}
            </button>
          ))}
        </div>
        <button onClick={() => setInput(B64_SAMPLE)} className="text-[10px] text-primary/60 hover:text-primary tracking-wider ml-auto">load sample →</button>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground tracking-widest uppercase">{mode === 'decode' ? 'Base64 Input' : 'Plain Text Input'}</label>
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={4}
          placeholder={mode === 'decode' ? 'SGVsbG8gV29ybGQ=' : 'Hello World'}
          className="w-full bg-black/50 border border-border rounded p-3 text-xs text-primary font-mono outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40" />
      </div>

      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-muted-foreground tracking-widest uppercase">{mode === 'decode' ? 'Decoded Text' : 'Base64 Encoded'}</label>
            <CopyBtn text={output} />
          </div>
          <div className="bg-black/50 border border-primary/20 rounded p-3 text-xs text-primary font-mono break-all whitespace-pre-wrap">{output}</div>
        </div>
      )}
    </div>
  );
}

// ─── URL Decode ─────────────────────────────────────────────────────────────
const URL_SAMPLE = 'https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world%26category%3Dcyber%20security%26sort%3Ddesc';

function UrlTool() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'decode' | 'encode'>('decode');

  const output = useMemo(() => {
    const t = input.trim();
    if (!t) return '';
    try {
      if (mode === 'decode') return decodeURIComponent(t.replace(/\+/g, ' '));
      return encodeURIComponent(t);
    } catch { return '⚠ Invalid URL-encoded string'; }
  }, [input, mode]);

  return (
    <div className="space-y-4">
      <InfoBox>
        <strong className="text-foreground">What is URL Encoding?</strong> URLs can only contain certain characters. Special characters like spaces, <code className="bg-black/30 px-1 rounded text-primary">/</code>, <code className="bg-black/30 px-1 rounded text-primary">?</code>, <code className="bg-black/30 px-1 rounded text-primary">&amp;</code>, and others get replaced with a percent sign followed by their hex code. For example a space becomes <code className="bg-black/30 px-1 rounded text-primary">%20</code>, <code className="bg-black/30 px-1 rounded text-primary">/</code> becomes <code className="bg-black/30 px-1 rounded text-primary">%2F</code>. Attackers often URL-encode payloads multiple times to bypass WAFs and input filters.
      </InfoBox>

      <div className="flex gap-2 items-center">
        <div className="flex rounded border border-border overflow-hidden text-xs">
          {(['decode', 'encode'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-4 py-2 capitalize transition-colors ${mode === m ? 'bg-primary/10 text-primary border-r border-primary/30' : 'text-muted-foreground hover:text-foreground'}`}>
              {m}
            </button>
          ))}
        </div>
        <button onClick={() => setInput(URL_SAMPLE)} className="text-[10px] text-primary/60 hover:text-primary tracking-wider ml-auto">load sample →</button>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground tracking-widest uppercase">{mode === 'decode' ? 'URL-Encoded Input' : 'Plain Text Input'}</label>
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={4}
          placeholder={mode === 'decode' ? 'hello%20world%21' : 'hello world!'}
          className="w-full bg-black/50 border border-border rounded p-3 text-xs text-primary font-mono outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40" />
      </div>

      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-muted-foreground tracking-widest uppercase">{mode === 'decode' ? 'Decoded URL' : 'URL Encoded'}</label>
            <CopyBtn text={output} />
          </div>
          <div className="bg-black/50 border border-primary/20 rounded p-3 text-xs text-primary font-mono break-all whitespace-pre-wrap">{output}</div>
        </div>
      )}
    </div>
  );
}

// ─── JSON Viewer ─────────────────────────────────────────────────────────────
const JSON_SAMPLE = '{"user":{"id":1337,"name":"Admin User","role":"superuser","email":"admin@corp.com","permissions":["read","write","delete","admin"],"last_login":"2024-01-15T10:30:00Z","api_key":"sk-prod-abc123xyz","mfa_enabled":false}}';

function JsonTool() {
  const [input, setInput] = useState('');

  const { output, error } = useMemo(() => {
    const t = input.trim();
    if (!t) return { output: '', error: '' };
    try {
      const parsed = JSON.parse(t);
      return { output: JSON.stringify(parsed, null, 2), error: '' };
    } catch (e: any) {
      return { output: '', error: e.message };
    }
  }, [input]);

  const minify = () => {
    if (!output) return;
    setInput(JSON.stringify(JSON.parse(output)));
  };

  return (
    <div className="space-y-4">
      <InfoBox>
        <strong className="text-foreground">What is JSON?</strong> JSON (JavaScript Object Notation) is the most common data format used by web APIs and configuration files. It uses key-value pairs: <code className="bg-black/30 px-1 rounded text-primary">{'{'}&#34;name&#34;: &#34;Alice&#34;, &#34;age&#34;: 30{'}'}</code>. This tool parses and pretty-prints JSON so it's easier to read. Useful for reading API responses, JWT payloads, config files, and request/response bodies during pentesting.
      </InfoBox>

      <div className="flex items-center justify-between">
        <label className="text-[10px] text-muted-foreground tracking-widest uppercase">JSON Input (paste raw or minified)</label>
        <div className="flex gap-2">
          {output && <button onClick={minify} className="text-[10px] text-muted-foreground hover:text-primary tracking-wider">minify</button>}
          <button onClick={() => setInput(JSON_SAMPLE)} className="text-[10px] text-primary/60 hover:text-primary tracking-wider">load sample →</button>
        </div>
      </div>

      <textarea value={input} onChange={e => setInput(e.target.value)} rows={5}
        placeholder={'{"key": "value", "number": 42}'}
        className="w-full bg-black/50 border border-border rounded p-3 text-xs text-primary font-mono outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40" />

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs border border-red-500/30 bg-red-950/20 rounded px-4 py-3">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-muted-foreground tracking-widest uppercase">Pretty-Printed JSON</label>
            <CopyBtn text={output} />
          </div>
          <pre className="bg-black/50 border border-primary/20 rounded p-3 text-xs text-primary font-mono overflow-x-auto whitespace-pre">{output}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Hex Decoder ─────────────────────────────────────────────────────────────
const HEX_SAMPLE = '48 65 6c 6c 6f 2c 20 57 6f 72 6c 64 21 0a 54 68 69 73 20 69 73 20 68 65 78 20 64 65 63 6f 64 65 64 20 74 65 78 74 2e';

function HexTool() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'decode' | 'encode'>('decode');

  const output = useMemo(() => {
    const t = input.trim();
    if (!t) return '';
    if (mode === 'encode') {
      return Array.from(t).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
    }
    try {
      const clean = t.replace(/\s+/g, '').replace(/0x/gi, '');
      if (!/^[0-9a-f]*$/i.test(clean)) return '⚠ Invalid hex — use characters 0-9 and a-f only';
      if (clean.length % 2 !== 0) return '⚠ Odd number of hex chars — must be even';
      const bytes = clean.match(/.{2}/g)?.map(h => parseInt(h, 16)) ?? [];
      return bytes.map(b => String.fromCharCode(b)).join('');
    } catch { return '⚠ Invalid hex string'; }
  }, [input, mode]);

  return (
    <div className="space-y-4">
      <InfoBox>
        <strong className="text-foreground">What is Hex?</strong> Hexadecimal (base-16) is a compact way to show binary data using digits 0-9 and letters A-F. Each byte of data is shown as 2 hex characters: <code className="bg-black/30 px-1 rounded text-primary">41</code> = letter A, <code className="bg-black/30 px-1 rounded text-primary">48 65 6c 6c 6f</code> = "Hello". You'll see hex in shellcode, binary file headers (magic bytes), memory dumps, hash values, MAC addresses, and network packet captures.
      </InfoBox>

      <div className="flex gap-2 items-center">
        <div className="flex rounded border border-border overflow-hidden text-xs">
          {(['decode', 'encode'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-4 py-2 capitalize transition-colors ${mode === m ? 'bg-primary/10 text-primary border-r border-primary/30' : 'text-muted-foreground hover:text-foreground'}`}>
              {m === 'decode' ? 'Hex → Text' : 'Text → Hex'}
            </button>
          ))}
        </div>
        <button onClick={() => setInput(HEX_SAMPLE)} className="text-[10px] text-primary/60 hover:text-primary tracking-wider ml-auto">load sample →</button>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground tracking-widest uppercase">{mode === 'decode' ? 'Hex Input (spaces optional)' : 'Plain Text Input'}</label>
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={4}
          placeholder={mode === 'decode' ? '48 65 6c 6c 6f  or  48656c6c6f' : 'Hello World'}
          className="w-full bg-black/50 border border-border rounded p-3 text-xs text-primary font-mono outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40" />
      </div>

      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-muted-foreground tracking-widest uppercase">{mode === 'decode' ? 'Decoded Text' : 'Hex Output'}</label>
            <CopyBtn text={output} />
          </div>
          <div className={`bg-black/50 border rounded p-3 text-xs font-mono break-all whitespace-pre-wrap ${output.startsWith('⚠') ? 'border-red-500/30 text-red-400' : 'border-primary/20 text-primary'}`}>{output}</div>
        </div>
      )}

      <div className="bg-card/50 border border-border rounded-lg p-3">
        <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2">Common File Signatures (Magic Bytes)</div>
        <div className="space-y-1 text-xs">
          {[
            ['PDF', 'hex', '25 50 44 46'],
            ['PNG', 'hex', '89 50 4E 47 0D 0A 1A 0A'],
            ['JPEG', 'hex', 'FF D8 FF'],
            ['ZIP', 'hex', '50 4B 03 04'],
            ['ELF (Linux binary)', 'hex', '7F 45 4C 46'],
            ['MZ (Windows .exe)', 'hex', '4D 5A'],
          ].map(([name, , hex]) => (
            <div key={String(name)} className="flex justify-between border-b border-border/30 pb-1 last:border-0">
              <span className="text-muted-foreground">{name}</span>
              <code className="text-primary/70">{hex}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── XML Viewer ──────────────────────────────────────────────────────────────
const XML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?><users><user id="1"><name>Admin</name><email>admin@corp.com</email><role>superuser</role><active>true</active></user><user id="2"><name>Bob</name><email>bob@corp.com</email><role>viewer</role><active>false</active></user></users>`;

function formatXml(xml: string): string {
  try {
    let indent = 0;
    const result: string[] = [];
    const tags = xml.match(/<\/?[^>]+>|[^<]+/g) ?? [];
    for (const token of tags) {
      const trimmed = token.trim();
      if (!trimmed) continue;
      if (/^<\//.test(trimmed)) {
        indent = Math.max(0, indent - 1);
        result.push('  '.repeat(indent) + trimmed);
      } else if (/^<[^!?]/.test(trimmed) && !/>$/.test(trimmed.slice(0, -1))) {
        result.push('  '.repeat(indent) + trimmed);
        indent++;
      } else if (/^<[^\/!?][^>]*\/>/.test(trimmed) || /^<[!?]/.test(trimmed)) {
        result.push('  '.repeat(indent) + trimmed);
      } else if (/^</.test(trimmed)) {
        result.push('  '.repeat(indent) + trimmed);
        indent++;
      } else {
        if (result.length > 0 && result[result.length - 1].trimEnd().endsWith('>')) {
          result[result.length - 1] += trimmed;
        } else {
          result.push('  '.repeat(indent) + trimmed);
        }
      }
    }
    return result.join('\n');
  } catch {
    return xml;
  }
}

function validateXml(xml: string): string | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const err = doc.querySelector('parsererror');
    if (err) return err.textContent ?? 'Parse error';
    return null;
  } catch { return 'Parse failed'; }
}

function XmlTool() {
  const [input, setInput] = useState('');

  const { output, error } = useMemo(() => {
    const t = input.trim();
    if (!t) return { output: '', error: '' };
    const err = validateXml(t);
    if (err) return { output: '', error: err };
    return { output: formatXml(t), error: '' };
  }, [input]);

  return (
    <div className="space-y-4">
      <InfoBox>
        <strong className="text-foreground">What is XML?</strong> XML (Extensible Markup Language) organizes data using tags, similar to HTML. It's used by APIs, config files, SOAP web services, and document formats like DOCX and SVG. In security, XML is interesting because of XXE (XML External Entity) attacks — a malicious XML document can trick a server into reading local files or making internal network requests. This tool formats and validates XML so you can read it clearly.
      </InfoBox>

      <div className="flex items-center justify-between">
        <label className="text-[10px] text-muted-foreground tracking-widest uppercase">XML Input</label>
        <button onClick={() => setInput(XML_SAMPLE)} className="text-[10px] text-primary/60 hover:text-primary tracking-wider">load sample →</button>
      </div>

      <textarea value={input} onChange={e => setInput(e.target.value)} rows={5}
        placeholder="<root><element>value</element></root>"
        className="w-full bg-black/50 border border-border rounded p-3 text-xs text-primary font-mono outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40" />

      {error && (
        <div className="flex items-start gap-2 text-red-400 text-xs border border-red-500/30 bg-red-950/20 rounded px-4 py-3">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}

      {!error && output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground tracking-widest uppercase">Formatted XML</label>
              <span className="text-[10px] text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded">✓ Valid</span>
            </div>
            <CopyBtn text={output} />
          </div>
          <pre className="bg-black/50 border border-primary/20 rounded p-3 text-xs text-primary font-mono overflow-x-auto whitespace-pre max-h-96">{output}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
const TOOLS: Array<{ id: Tool; label: string; icon: React.ElementType; desc: string }> = [
  { id: 'jwt', label: 'JWT Decoder', icon: Key, desc: 'Decode JSON Web Tokens — header, payload, expiry' },
  { id: 'base64', label: 'Base64', icon: Binary, desc: 'Encode or decode base64 strings' },
  { id: 'url', label: 'URL Decode', icon: Link2, desc: 'Decode/encode URL-percent-encoded strings' },
  { id: 'json', label: 'JSON Viewer', icon: FileJson, desc: 'Parse and pretty-print JSON data' },
  { id: 'hex', label: 'Hex Decode', icon: Code2, desc: 'Convert hex bytes to readable text' },
  { id: 'xml', label: 'XML Viewer', icon: FileCode2, desc: 'Format and validate XML documents' },
];

export default function JwtDecoder() {
  const [tool, setTool] = useState<Tool>('jwt');

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><Key size={22} /> Token &amp; Decoder Tools</h1>
          <p className="text-muted-foreground text-xs">JWT, Base64, URL, JSON, Hex, XML — decode and inspect anything, all in-browser.</p>
        </header>

        <div className="flex flex-wrap gap-1 border-b border-border pb-3">
          {TOOLS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTool(t.id)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors ${tool === t.id ? 'border-primary/50 text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'}`}>
                <Icon size={11} /> {t.label}
              </button>
            );
          })}
        </div>

        {tool === 'jwt' && <JwtTool />}
        {tool === 'base64' && <Base64Tool />}
        {tool === 'url' && <UrlTool />}
        {tool === 'json' && <JsonTool />}
        {tool === 'hex' && <HexTool />}
        {tool === 'xml' && <XmlTool />}
      </div>
    </div>
  );
}
