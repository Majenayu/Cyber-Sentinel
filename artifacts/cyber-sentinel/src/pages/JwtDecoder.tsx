import React, { useState, useMemo } from 'react';
import { Key, Copy, Check, AlertTriangle, CheckCircle } from 'lucide-react';

function b64decode(str: string) {
  try {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
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

const SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ikphbi4gRG9lIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

export default function JwtDecoder() {
  const [jwt, setJwt] = useState('');
  const [secret, setSecret] = useState('');

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
    return {
      expired: now > exp,
      expDate: new Date(exp * 1000).toISOString(),
      iatDate: iat ? new Date(iat * 1000).toISOString() : null,
      timeLeft: exp - now,
    };
  }, [parts]);

  const JsonBlock = ({ data, label }: { data: any; label: string }) => (
    <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-black/20">
        <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{label}</span>
        <CopyBtn text={JSON.stringify(data, null, 2)} />
      </div>
      <pre className="p-4 text-xs text-primary/90 overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><Key size={22} /> JWT Decoder</h1>
          <p className="text-muted-foreground text-xs">Paste a JWT token to decode header, payload, and expiry instantly.</p>
        </header>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-muted-foreground tracking-widest uppercase">JWT Token</label>
            <button onClick={() => setJwt(SAMPLE)} className="text-[10px] text-primary/60 hover:text-primary tracking-wider">load sample →</button>
          </div>
          <textarea
            value={jwt}
            onChange={e => setJwt(e.target.value)}
            rows={4}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="w-full bg-black/50 border border-border rounded p-3 text-xs text-primary font-mono outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40"
          />
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

            <JsonBlock data={parts.header} label="Header" />
            <JsonBlock data={parts.payload} label="Payload" />

            <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-black/20">
                <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Signature (raw)</span>
                <CopyBtn text={parts.sig} />
              </div>
              <div className="p-4 text-xs text-muted-foreground break-all">{parts.sig}</div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-4 space-y-2 text-xs">
              <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Token Metadata</div>
              {[
                ['Algorithm', parts.header.alg],
                ['Type', parts.header.typ],
                ['Subject', parts.payload.sub],
                ['Issuer', parts.payload.iss],
                ['Audience', parts.payload.aud],
                ['Issued At', expStatus?.iatDate ? new Date(expStatus.iatDate).toLocaleString() : null],
                ['Expires', expStatus?.expDate ? new Date(expStatus.expDate).toLocaleString() : null],
              ].filter(([, v]) => v != null).map(([k, v]) => (
                <div key={String(k)} className="flex justify-between border-b border-border/40 pb-2 last:border-0">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-primary font-mono">{String(v)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground tracking-widest uppercase">Verify Signature (HMAC Secret)</label>
              <div className="flex gap-2">
                <input value={secret} onChange={e => setSecret(e.target.value)} placeholder="your-secret-key"
                  className="flex-1 bg-black/50 border border-border rounded px-3 py-2 text-xs text-primary font-mono outline-none focus:border-primary/50" />
                <span className="text-[10px] text-muted-foreground/60 self-center">Client-side verify coming soon</span>
              </div>
            </div>
          </div>
        ) : jwt.trim() ? (
          <div className="text-center py-8 text-red-400 text-xs">
            <AlertTriangle className="mx-auto mb-2" size={20} />
            Invalid JWT format — must have 3 base64url segments separated by dots.
          </div>
        ) : null}
      </div>
    </div>
  );
}
