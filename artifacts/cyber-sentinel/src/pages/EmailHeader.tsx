import React, { useState, useMemo } from 'react';
import { Mail, AlertTriangle, CheckCircle, Copy, Check } from 'lucide-react';

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
  const parsed = useMemo(() => raw.trim() ? parseHeaders(raw) : null, [raw]);
  const spoofed = parsed ? (parsed.from !== parsed.returnPath && parsed.returnPath) || parsed.replyTo !== parsed.from : false;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><Mail size={22} /> Email Header Analyzer</h1>
          <p className="text-muted-foreground text-xs">Paste raw email headers to trace routing, detect spoofing, and verify SPF/DKIM/DMARC.</p>
        </header>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-muted-foreground tracking-widest uppercase">Raw Headers</label>
            <button onClick={() => setRaw(SAMPLE)} className="text-[10px] text-primary/60 hover:text-primary tracking-wider">load sample →</button>
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
                <span><strong>POSSIBLE SPOOFING DETECTED:</strong> From address differs from Return-Path or Reply-To. Treat as suspicious.</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[['SPF', parsed.spf], ['DKIM', parsed.dkim], ['DMARC', parsed.dmarc]].map(([k, v]) => (
                <div key={k} className="bg-card/50 border border-border rounded-lg p-4 text-center space-y-1">
                  <div className="text-[10px] text-muted-foreground tracking-widest uppercase">{k}</div>
                  <StatusBadge val={v} />
                </div>
              ))}
            </div>

            <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">Message Details</div>
              <div className="px-4 py-2 divide-y divide-border/40">
                {[
                  ['From', parsed.from],
                  ['To', parsed.to],
                  ['Reply-To', parsed.replyTo],
                  ['Return-Path', parsed.returnPath],
                  ['Subject', parsed.subject],
                  ['Date', parsed.date],
                  ['Message-ID', parsed.messageId],
                  ['X-Originating-IP', parsed.xOriginatingIp],
                  ['X-Mailer', parsed.xMailer],
                  ['User-Agent', parsed.userAgent],
                  ['Content-Type', parsed.contentType],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between py-2 gap-4 text-xs">
                    <span className="text-muted-foreground shrink-0 w-36">{k}</span>
                    <span className={`text-primary text-right break-all ${k === 'Return-Path' && spoofed ? 'text-red-400' : ''}`}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {parsed.hops.length > 0 && (
              <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">
                  Routing Path ({parsed.hops.length} hops)
                </div>
                <div className="divide-y divide-border/40">
                  {parsed.hops.map((hop, i) => (
                    <div key={i} className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-muted-foreground">HOP {i + 1}</span>
                        {hop.delay && <span className="text-[10px] text-yellow-400/60">{hop.delay} delay</span>}
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
