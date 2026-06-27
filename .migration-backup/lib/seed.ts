import mongoose from 'mongoose';
import connectToDatabase from '../lib/mongodb';
import Knowledge from '../lib/models/Knowledge';

async function seed() {
  await connectToDatabase();
  
  const initialKnowledge = [
    {
      title: 'Web Enumeration - Gobuster',
      category: 'tool',
      content: 'GoBuster is a versatile tool that allows for performing DNS, vhost, and directory brute-forcing. Switch "dir" for directory/file brute-forcing. Example: gobuster dir -u http://10.10.10.121/ -w /usr/share/seclists/Discovery/Web-Content/common.txt',
      tags: ['gobuster', 'enum', 'htb']
    },
    {
      title: 'Web Enumeration - Whatweb',
      category: 'tool',
      content: 'Extract the version of web servers, supporting frameworks, and applications using the command-line tool whatweb. Example: whatweb 10.10.10.121',
      tags: ['whatweb', 'recon', 'htb']
    },
    {
      title: 'DNS Subdomain Enumeration',
      category: 'technique',
      content: 'Enumerate available subdomains using GoBuster with the dns flag. First, add a DNS Server such as 1.1.1.1 to /etc/resolv.conf. Example: gobuster dns -d inlanefreight.com -w /usr/share/SecLists/Discovery/DNS/namelist.txt',
      tags: ['dns', 'subdomain', 'gobuster']
    }
  ];

  for (const k of initialKnowledge) {
    await Knowledge.findOneAndUpdate({ title: k.title }, k, { uppercase: true, new: true });
    console.log(`Seeded: ${k.title}`);
  }

  console.log('Seeding complete.');
  process.exit(0);
}

seed();
