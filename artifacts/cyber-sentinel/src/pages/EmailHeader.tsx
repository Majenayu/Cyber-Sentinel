import React, { useState, useMemo } from 'react';
import { Mail, AlertTriangle, CheckCircle, Copy, Check, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface ParsedHeader {
  hops: Array<{ from: string; by: string; date: string; delay: string }>;
  to: string;
  from: string;
  subject: string;
  messageId: string;
  date: string;
  xOriginatingIp: string;
  spf: string;
  dkim: string;
  dmarc: string;
  returnPath: string;
  replyTo: string;
  userAgent: string;
  xMailer: string;
  contentType: string;
  raw: Record<string, string[]>;
}

function parseHeaders(raw: string): ParsedHeader {
  const lines = raw.split(/\r?\n/);
  const headers: Record<string, string[]> = {};
  let currentKey = '';

  for (const line of lines) {
    if (/^\s/.test(line) && currentKey) {
      headers[currentKey][headers[currentKey].length - 1] += ' ' + line.trim();
    } else {
      const m = line.match(/^([\w\-]+):\s*(.*)/);
      if (m) {
        currentKey = m[1].toLowerCase();
        if (!headers[currentKey]) headers[currentKey] = [];
        headers[currentKey].push(m[2].trim());
      }
    }
  }

  const received = (headers['received'] ?? []).reverse();
  const hops = received.map((r, i) => {
    const from = r.match(/from\s+([^\s]+)/i)?.[1] ?? '?';
    const by = r.match(/by\s+([^\s]+)/i)?.[1] ?? '?';
    const dateStr = r.match(/;\s*(.+)$/)?.[1]?.trim() ?? '';
    const date = dateStr ? new Date(dateStr) : null;
    const prevDateStr = i > 0 ? received[i - 1].match(/;\s*(.+)$/)?.[1]?.trim() ?? '' : '';
    const prevDate = prevDateStr ? new Date(prevDateStr) : null;
    let delay = '';
    if (date && prevDate && !isNaN(date.getTime()) && !isNaN(prevDate.getTime())) {
      const diff = Math.abs(date.getTime() - prevDate.getTime()) / 1000;
      delay = diff < 60 ? `${diff}s` : `${Math.round(diff / 60)}m`;
    }
    return { from, by, date: date?.toUTCString() ?? dateStr, delay };
  });

  const getFirst = (key: string) => headers[key]?.[0] ?? '';
  const spfRaw = getFirst('received-spf') || getFirst('authentication-results');
  const dkimRaw = getFirst('authentication-results');
  const dmarcRaw = getFirst('authentication-results');

  return {
    hops,
    to: getFirst('to'),
    from: getFirst('from'),
    subject: getFirst('subject'),
    messageId: getFirst('message-id'),
    date: getFirst('date'),
    xOriginatingIp: getFirst('x-originating-ip') || getFirst('x-forwarded-to') || getFirst('x-real-ip'),
    spf: spfRaw.match(/spf=(pass|fail|softfail|neutral|none)/i)?.[1]?.toUpperCase() ?? 'UNKNOWN',
    dkim: dkimRaw.match(/dkim=(pass|fail|none)/i)?.[1]?.toUpperCase() ?? 'UNKNOWN',
    dmarc: dmarcRaw.match(/dmarc=(pass|fail|none)/i)?.[1]?.toUpperCase() ?? 'UNKNOWN',
    returnPath: getFirst('return-path'),
    replyTo: getFirst('reply-to'),
    userAgent: getFirst('user-agent'),
    xMailer: getFirst('x-mailer'),
    contentType: getFirst('content-type'),
    raw: headers,
  };
}

const SAMPLE = `From: attacker@evil.com
To: victim@example.com
Subject: Urgent: Reset your password
Date: Mon, 12 Jun 2023 10:23:45 -0500
Message-ID: <fake12345@evil.com>
Return-Path: <bounce@phish.net>
Reply-To: attacker@phish.net
X-Originating-IP: 185.220.101.47
X-Mailer: PHPMailer 5.2.0
Received: from mail.evil.com (185.220.101.47) by mx.example.com; Mon, 12 Jun 2023 10:24:01 -0500
Received: from localhost (localhost [127.0.0.1]) by mail.evil.com; Mon, 12 Jun 2023 10:23:45 -0500
Authentication-Results: mx.example.com; spf=fail smtp.mailfrom=evil.com; dkim=none; dmarc=fail
Content-Type: text/html; charset=UTF-8`;

const BADGE: Record<string, string> = {
  PASS: 'text-green-400 border-green-500/40 bg-green-950/20',
  FAIL: 'text-red-400 border-red-500/40 bg-red-950/20',
  SOFTFAIL: 'text-yellow-400 border-yellow-500/40 bg-yellow-950/20',
  UNKNOWN: 'text-muted-foreground border-border bg-secondary/30',
  NONE: 'text-muted-foreground border-border bg-secondary/30',
};

function StatusBadge({ val }: { val: string }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold tracking-widest ${BADGE[val] ?? BADGE.UNKNOWN}`}>
      {val === 'PASS' ? '✓ ' : val === 'FAIL' ? '✗ ' : ''}{val}
    </span>
  );
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

export default function EmailHeader() {
  const [raw, setRaw] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const parsed = useMemo(() => raw.trim() ? parseHeaders(raw) : null, [raw]);
  const spoofed = parsed ? (parsed.from !== parsed.returnPath && !!parsed.returnPath) || (!!parsed.replyTo && parsed.replyTo !== parsed.from) : false;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><Mail size={22} /> Email Header Analyzer</h1>
          <p className="text-muted-foreground text-xs">Paste raw email headers to trace routing, detect spoofing, and verify SPF/DKIM/DMARC.</p>
        </header>

        <div className="border border-primary/20 bg-primary/5 rounded-lg overflow-hidden">
          <button onClick={() => setShowGuide(!showGuide)}
            className="w-full flex items-start gap-3 px-4 py-3 text-left">
            <BookOpen size={14} className="text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-foreground font-semibold mb-0.5">What are email headers? How do I get them?</div>
              <div className="text-xs text-muted-foreground">Click to learn what headers reveal and how to extract them from any email client.</div>
            </div>
            {showGuide ? <ChevronUp size={14} className="text-muted-foreground shrink-0 mt-0.5" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0 mt-0.5" />}
          </button>

          {showGuide && (
            <div className="px-4 pb-4 space-y-3 border-t border-primary/10">
              <div className="text-xs text-muted-foreground leading-relaxed pt-3">
                <strong className="text-foreground">What are email headers?</strong> Every email carries invisible metadata called headers — like a package with a shipping label. Headers show: who really sent the email (not just the display name), all the mail servers it passed through, when each hop happened, and whether the email is authentic (SPF/DKIM/DMARC checks). Phishing emails often spoof the "From" field while the Return-Path or X-Originating-IP reveals the real sender.
              </div>
              <div className="text-xs space-y-2">
                <div className="text-foreground font-semibold">How to get raw headers:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    ['Gmail', 'Open email → ⋮ (3 dots) → "Show original"'],
                    ['Outlook', 'Open email → File → Properties → "Internet headers"'],
                    ['Apple Mail', 'View → Message → All Headers'],
                    ['Thunderbird', 'View → Headers → All'],
                    ['Yahoo Mail', 'Open email → ⋮ → "View raw message"'],
                    ['Proton Mail', 'Open email → ⋮ → "View headers"'],
                  ].map(([client, steps]) => (
                    <div key={client} className="bg-black/20 border border-border/50 rounded px-3 py-2">
                      <div className="text-primary font-bold text-[11px]">{client}</div>
                      <div className="text-muted-foreground text-[11px] mt-0.5">{steps}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <strong className="text-foreground">Key things to check:</strong> SPF validates that the sending server is authorized to send for that domain. DKIM adds a cryptographic signature to prove the email wasn't modified. DMARC enforces what happens when SPF/DKIM fail. A phishing email often has SPF=fail, DKIM=none, and a mismatched Return-Path.
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-muted-foreground tracking-widest uppercase">Raw Headers</label>
            <button onClick={() => setRaw(SAMPLE)} className="text-[10px] text-primary/60 hover:text-primary tracking-wider">load phishing sample →</button>
          </div>
          <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={8}
            placeholder="Paste raw email headers here…"
            className="w-full bg-black/50 border border-border rounded p-3 text-xs text-primary font-mono outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40" />
        </div>

        {parsed && (
          <div className="space-y-4">
            {spoofed && (
              <div className="flex items-center gap-3 px-4 py-3 rounded border border-red-500/40 bg-red-950/20 text-red-400 text-xs">
                <AlertTriangle size={16} />
                <span><strong>POSSIBLE SPOOFING DETECTED:</strong> The "From" display address differs from the Return-Path or Reply-To. This is a common phishing indicator — the real sender is different from who the email appears to be from.</span>
              </div>
            )}

            {!spoofed && parsed.spf === 'PASS' && parsed.dkim === 'PASS' && (
              <div className="flex items-center gap-3 px-4 py-3 rounded border border-green-500/40 bg-green-950/20 text-green-400 text-xs">
                <CheckCircle size={16} />
                <span><strong>EMAIL APPEARS LEGITIMATE:</strong> SPF and DKIM both pass. The sending server is authorized and the email wasn't modified in transit.</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                ['SPF', parsed.spf, 'Checks if the sending server is allowed to send for this domain'],
                ['DKIM', parsed.dkim, 'Verifies the email content was not modified after sending'],
                ['DMARC', parsed.dmarc, 'Policy that says what to do when SPF or DKIM fail'],
              ].map(([k, v, explain]) => (
                <div key={k} className="bg-card/50 border border-border rounded-lg p-4 space-y-2">
                  <div className="text-[10px] text-muted-foreground tracking-widest uppercase text-center">{k}</div>
                  <div className="text-center"><StatusBadge val={String(v)} /></div>
                  <div className="text-[10px] text-muted-foreground/60 text-center leading-tight">{explain}</div>
                </div>
              ))}
            </div>

            <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">Message Details</div>
              <div className="px-4 py-2 divide-y divide-border/40">
                {[
                  ['From', parsed.from, spoofed ? 'This display name can be faked easily' : ''],
                  ['To', parsed.to, ''],
                  ['Reply-To', parsed.replyTo, parsed.replyTo && parsed.replyTo !== parsed.from ? '⚠ Differs from From — replies go elsewhere' : ''],
                  ['Return-Path', parsed.returnPath, parsed.returnPath && parsed.returnPath !== parsed.from ? '⚠ Bounces go to a different address' : ''],
                  ['Subject', parsed.subject, ''],
                  ['Date', parsed.date, ''],
                  ['Message-ID', parsed.messageId, ''],
                  ['X-Originating-IP', parsed.xOriginatingIp, 'The real IP address of the sender\'s mail server'],
                  ['X-Mailer', parsed.xMailer, ''],
                  ['User-Agent', parsed.userAgent, ''],
                  ['Content-Type', parsed.contentType, ''],
                ].filter(([, v]) => v).map(([k, v, note]) => (
                  <div key={String(k)} className="flex items-start justify-between py-2 gap-4 text-xs">
                    <div className="shrink-0 w-32">
                      <div className="text-muted-foreground">{k}</div>
                      {note && <div className="text-[10px] text-yellow-400/70 mt-0.5">{note}</div>}
                    </div>
                    <span className={`text-primary text-right break-all ${(k === 'Return-Path' || k === 'Reply-To') && spoofed ? 'text-red-400' : ''}`}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            {parsed.hops.length > 0 && (
              <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">
                  Routing Path ({parsed.hops.length} hops) — read bottom to top = earliest to latest
                </div>
                <div className="divide-y divide-border/40">
                  {parsed.hops.map((hop, i) => (
                    <div key={i} className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-muted-foreground">HOP {i + 1}</span>
                        {hop.delay && <span className={`text-[10px] ${parseInt(hop.delay) > 300 ? 'text-red-400/70' : 'text-yellow-400/60'}`}>{hop.delay} delay{parseInt(hop.delay) > 300 ? ' ⚠ unusually long' : ''}</span>}
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <span><span className="text-muted-foreground">FROM </span><span className="text-primary">{hop.from}</span></span>
                        <span><span className="text-muted-foreground">BY </span><span className="text-primary">{hop.by}</span></span>
                      </div>
                      {hop.date && <div className="text-muted-foreground/60 text-[10px] mt-1">{hop.date}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
