/**
 * Terminal command database used for:
 *  - Suggestion overlay (desc + usage shown as you type)
 *  - Post-run summary panel (summary shown after command finishes)
 *  - OS translation map (Windows / macOS → Linux equivalents)
 */

export interface CommandInfo {
  desc: string;       // One-line: what it does (shown in suggestion list)
  summary: string;    // Two sentences: what just happened (shown after running)
  category: string;
  usage?: string;     // Example usage shown in suggestion
}

export const COMMANDS: Record<string, CommandInfo> = {
  // ── File & Directory ──────────────────────────────────────────────────
  ls: {
    desc: 'List files and folders in a directory',
    summary: 'Showed all files and folders at the current location. Add -la to also see hidden files with sizes and permissions.',
    category: 'file', usage: 'ls -la /etc',
  },
  ll: {
    desc: 'Long list of files with permissions and sizes',
    summary: 'Displayed files in detailed view including owner, permissions, and modification date. Useful for checking who can read/write each file.',
    category: 'file', usage: 'll',
  },
  cd: {
    desc: 'Change to a different directory',
    summary: 'Moved into the specified folder. Use cd .. to go one level up, or cd ~ to return home.',
    category: 'file', usage: 'cd /var/log',
  },
  pwd: {
    desc: 'Print the full path of the current directory',
    summary: 'Showed exactly where you are in the filesystem right now. Useful when you\'re deep inside nested folders.',
    category: 'file', usage: 'pwd',
  },
  cat: {
    desc: 'Display the contents of a file',
    summary: 'Printed the full file contents to the screen. For large files, pipe through less (cat file | less) to scroll.',
    category: 'file', usage: 'cat /etc/passwd',
  },
  less: {
    desc: 'View a file with scrolling (press q to quit)',
    summary: 'Opened the file in a scrollable viewer. Use arrow keys to scroll, / to search, and q to quit.',
    category: 'file', usage: 'less /var/log/syslog',
  },
  head: {
    desc: 'Show the first lines of a file',
    summary: 'Printed the first 10 lines of the file. Use -n 20 to show more or fewer lines as needed.',
    category: 'file', usage: 'head -n 20 file.log',
  },
  tail: {
    desc: 'Show the last lines of a file (use -f to follow live)',
    summary: 'Printed the last 10 lines of the file. Use tail -f to watch a log file update in real time.',
    category: 'file', usage: 'tail -f /var/log/syslog',
  },
  cp: {
    desc: 'Copy a file or directory',
    summary: 'Copied the file to the new location. Use -r to copy entire directories recursively.',
    category: 'file', usage: 'cp file.txt backup.txt',
  },
  mv: {
    desc: 'Move or rename a file',
    summary: 'Moved (or renamed) the file to the new path. The original is gone — it wasn\'t duplicated.',
    category: 'file', usage: 'mv old.txt new.txt',
  },
  rm: {
    desc: 'Remove/delete a file permanently',
    summary: 'Deleted the file with no recycle bin — it\'s gone. Use rm -rf directory/ to remove an entire folder and contents.',
    category: 'file', usage: 'rm -rf /tmp/junk',
  },
  mkdir: {
    desc: 'Create a new directory',
    summary: 'Created the new folder at the specified path. Use -p to create all parent folders in one go.',
    category: 'file', usage: 'mkdir -p ~/projects/new',
  },
  touch: {
    desc: 'Create an empty file or update its timestamp',
    summary: 'Created an empty file if it didn\'t exist, or updated the last-modified time if it did.',
    category: 'file', usage: 'touch notes.txt',
  },
  chmod: {
    desc: 'Change file permissions (read/write/execute)',
    summary: 'Changed who can read, write, or execute the file. Use 755 for executables, 644 for regular files.',
    category: 'file', usage: 'chmod 755 script.sh',
  },
  chown: {
    desc: 'Change who owns a file',
    summary: 'Transferred ownership of the file to the specified user and group. Requires sudo for system files.',
    category: 'file', usage: 'chown user:group file',
  },
  find: {
    desc: 'Search for files matching a pattern',
    summary: 'Recursively searched the filesystem for matching files. Use -name for filenames, -type f for files only, -mtime for by date.',
    category: 'file', usage: 'find /etc -name "*.conf"',
  },
  stat: {
    desc: 'Show detailed info about a file (size, permissions, timestamps)',
    summary: 'Displayed full metadata for the file including exact size, permissions, owner, and three timestamps (access, modify, change).',
    category: 'file', usage: 'stat /etc/passwd',
  },
  ln: {
    desc: 'Create a link (shortcut) to a file',
    summary: 'Created a link pointing to the target file. Use -s for a symbolic link (shortcut), without -s for a hard link.',
    category: 'file', usage: 'ln -s /etc/nginx/sites-enabled/app app',
  },

  // ── Search & Text ──────────────────────────────────────────────────────
  grep: {
    desc: 'Search for text patterns inside files',
    summary: 'Searched through the file(s) and printed lines matching the pattern. Use -r for recursive search, -i for case-insensitive, -n to show line numbers.',
    category: 'search', usage: 'grep -r "password" /var/www',
  },
  awk: {
    desc: 'Process text line by line, extract and transform columns',
    summary: 'Ran an awk program on each line of input, extracting or transforming specific columns. Common for parsing log files and structured text.',
    category: 'text', usage: "awk '{print $1, $4}' access.log",
  },
  sed: {
    desc: 'Find and replace text in a stream or file',
    summary: 'Replaced all matching patterns in the text with the replacement. Use -i to edit files in place.',
    category: 'text', usage: "sed 's/old/new/g' file.txt",
  },
  cut: {
    desc: 'Extract specific columns or characters from text',
    summary: 'Extracted the specified fields from each line. Use -d to set the delimiter and -f to pick which column(s).',
    category: 'text', usage: 'cut -d: -f1 /etc/passwd',
  },
  sort: {
    desc: 'Sort lines of text alphabetically or numerically',
    summary: 'Sorted all input lines. Use -n for numeric sort, -r to reverse, -u to remove duplicates.',
    category: 'text', usage: 'sort -u list.txt',
  },
  uniq: {
    desc: 'Remove or count duplicate consecutive lines',
    summary: 'Filtered out repeated lines from the input. Pipe sort | uniq to deduplicate any file, or uniq -c to count occurrences.',
    category: 'text', usage: 'sort file.txt | uniq -c | sort -rn',
  },
  wc: {
    desc: 'Count lines, words, or bytes in a file',
    summary: 'Counted the lines, words, and bytes in the input. Use -l for just line count, -w for words, -c for bytes.',
    category: 'text', usage: 'wc -l access.log',
  },
  echo: {
    desc: 'Print text to the terminal',
    summary: 'Printed the text to standard output. Use echo "text" >> file to append to a file instead.',
    category: 'text', usage: 'echo "Hello World"',
  },
  diff: {
    desc: 'Show differences between two files',
    summary: 'Compared the two files line by line and showed what changed. Lines with + are new, - are removed.',
    category: 'text', usage: 'diff old.conf new.conf',
  },
  xargs: {
    desc: 'Pass output of one command as arguments to another',
    summary: 'Took each line of input and passed it as arguments to the given command. Often used with find to act on search results.',
    category: 'text', usage: 'find . -name "*.log" | xargs rm',
  },

  // ── Networking ──────────────────────────────────────────────────────────
  ping: {
    desc: 'Test if a host is reachable over the network',
    summary: 'Sent ICMP echo packets to the host and measured response time. High latency or packet loss indicates network issues.',
    category: 'network', usage: 'ping -c 4 google.com',
  },
  traceroute: {
    desc: 'Show every hop a packet takes to reach a destination',
    summary: 'Mapped the path your traffic takes through the internet to reach the destination. Each line is a router or network hop.',
    category: 'network', usage: 'traceroute google.com',
  },
  dig: {
    desc: 'DNS lookup — find IP address for a domain',
    summary: 'Queried DNS servers to resolve the domain name into IP addresses. Also shows TTL, nameservers, and DNS record types.',
    category: 'network', usage: 'dig +short google.com A',
  },
  nslookup: {
    desc: 'Look up DNS records for a domain or IP',
    summary: 'Queried a DNS server to get records for the given domain. Use to verify DNS is configured correctly or find mail servers.',
    category: 'network', usage: 'nslookup google.com',
  },
  curl: {
    desc: 'Make HTTP requests and transfer data over URLs',
    summary: 'Sent an HTTP request to the URL and showed the response. Use -I for headers only, -o to save to a file, -X POST for POST requests.',
    category: 'network', usage: 'curl -I https://example.com',
  },
  wget: {
    desc: 'Download files from the web',
    summary: 'Downloaded the file from the given URL and saved it to disk. Use -O to specify a filename, -r for recursive site download.',
    category: 'network', usage: 'wget https://example.com/file.zip',
  },
  nc: {
    desc: 'Netcat — raw TCP/UDP connections, port scanning, data transfer',
    summary: 'Opened a raw TCP/UDP connection to the host and port. Useful for testing if a port is open, banner grabbing, or file transfer.',
    category: 'network', usage: 'nc -zv host.com 80 443',
  },
  ss: {
    desc: 'Show active network connections and listening ports',
    summary: 'Listed all current socket connections and open ports. Use -tulnp to see which processes are listening on which ports.',
    category: 'network', usage: 'ss -tulnp',
  },
  'ip addr': {
    desc: 'Show network interface IP addresses',
    summary: 'Listed all network interfaces and their assigned IP addresses. Also shows MAC addresses, subnet masks, and interface state.',
    category: 'network', usage: 'ip addr show eth0',
  },
  'ip route': {
    desc: 'Show or modify the IP routing table',
    summary: 'Displayed the system routing table showing how traffic is directed to different networks. The default route (0.0.0.0) is the gateway.',
    category: 'network', usage: 'ip route show',
  },
  'ip a': {
    desc: 'Short form of ip addr — list network interfaces',
    summary: 'Listed all network interfaces and their IP addresses. This is the Linux replacement for ifconfig/ipconfig.',
    category: 'network', usage: 'ip a',
  },
  whois: {
    desc: 'Look up domain or IP registration info',
    summary: 'Fetched registration data for the domain or IP including owner, registrar, and expiry date. Useful for OSINT reconnaissance.',
    category: 'network', usage: 'whois google.com',
  },
  nmap: {
    desc: 'Network scanner — discover open ports and services',
    summary: 'Scanned the target for open ports, running services, and OS fingerprint. Use responsibly and only on systems you own or have permission to scan.',
    category: 'security', usage: 'nmap -sV -p 1-1000 192.168.1.1',
  },
  tcpdump: {
    desc: 'Capture and inspect live network traffic',
    summary: 'Captured network packets on the specified interface and printed them. Use -w to save to a pcap file for analysis in Wireshark.',
    category: 'network', usage: 'tcpdump -i eth0 -n port 80',
  },
  openssl: {
    desc: 'Crypto toolkit — certs, TLS, encryption, hashing',
    summary: 'Ran an OpenSSL operation on the input. Useful for inspecting TLS certificates, generating keys, or verifying file integrity with hashes.',
    category: 'security', usage: 'openssl s_client -connect host:443',
  },
  'openssl s_client': {
    desc: 'Inspect TLS/SSL certificate of a remote host',
    summary: 'Connected to the host and displayed the full TLS certificate chain. Use to verify expiry dates, issuer, and cipher strength.',
    category: 'security', usage: 'openssl s_client -connect example.com:443',
  },
  ssh: {
    desc: 'Securely connect to a remote machine',
    summary: 'Opened an encrypted shell session on the remote host. Use -i keyfile.pem for key-based auth, -p PORT for non-standard ports.',
    category: 'network', usage: 'ssh user@192.168.1.1',
  },
  scp: {
    desc: 'Securely copy files over SSH',
    summary: 'Transferred files between your machine and a remote host using SSH encryption. Useful for secure file transfers without FTP.',
    category: 'network', usage: 'scp file.txt user@host:/path/',
  },
  rsync: {
    desc: 'Efficiently sync files between directories or hosts',
    summary: 'Synchronized files from source to destination, only transferring changed data. Much faster than cp for large directories.',
    category: 'file', usage: 'rsync -avz src/ user@host:/dest/',
  },

  // ── Process & System ───────────────────────────────────────────────────
  ps: {
    desc: 'List currently running processes',
    summary: 'Showed a snapshot of running processes including PID, CPU/memory usage, and command name. Use ps aux for all users\' processes.',
    category: 'process', usage: 'ps aux | grep nginx',
  },
  top: {
    desc: 'Live view of CPU/memory usage by process',
    summary: 'Opened a live dashboard showing processes sorted by CPU usage. Press q to quit, M to sort by memory, k to kill a process.',
    category: 'process', usage: 'top',
  },
  htop: {
    desc: 'Interactive process viewer with colors (better top)',
    summary: 'Showed a colorful interactive process monitor. Use F5 for tree view, F9 to kill processes, and F10 to quit.',
    category: 'process', usage: 'htop',
  },
  kill: {
    desc: 'Stop a running process by its PID',
    summary: 'Sent a signal to the process to terminate it. Use kill -9 PID to force-kill a process that won\'t respond to normal kill.',
    category: 'process', usage: 'kill -9 1234',
  },
  killall: {
    desc: 'Stop all processes with a given name',
    summary: 'Terminated all running processes with the given name. Useful when you don\'t know the PID but know the program name.',
    category: 'process', usage: 'killall nginx',
  },
  jobs: {
    desc: 'List background jobs in current shell',
    summary: 'Listed all background and stopped jobs running in this shell session. Use fg %1 to bring a job to foreground.',
    category: 'process', usage: 'jobs',
  },
  nohup: {
    desc: 'Run a command that keeps running after logout',
    summary: 'Started the command immune to hangup signals — it keeps running even if you close the terminal. Output goes to nohup.out.',
    category: 'process', usage: 'nohup python server.py &',
  },
  uname: {
    desc: 'Show system and kernel information',
    summary: 'Printed system information including OS type, kernel version, and hardware architecture. Use -a for all info.',
    category: 'system', usage: 'uname -a',
  },
  df: {
    desc: 'Show disk space usage for all mounted filesystems',
    summary: 'Showed how much disk space is used and available on each mounted drive. Use -h for human-readable sizes (GB/MB).',
    category: 'system', usage: 'df -h',
  },
  du: {
    desc: 'Show how much space a folder or file is using',
    summary: 'Measured the disk space used by the specified directory tree. Use --max-depth=1 to see top-level folder sizes only.',
    category: 'system', usage: 'du -sh /*',
  },
  free: {
    desc: 'Show RAM and swap memory usage',
    summary: 'Displayed total, used, and free RAM and swap space. Use -h for human-readable sizes. "Available" is what programs can actually use.',
    category: 'system', usage: 'free -h',
  },
  uptime: {
    desc: 'Show how long the system has been running',
    summary: 'Showed how long the machine has been on, the number of users, and the CPU load average over 1, 5, and 15 minutes.',
    category: 'system', usage: 'uptime',
  },
  who: {
    desc: 'Show who is currently logged in',
    summary: 'Listed all users currently logged into the system with their terminal, login time, and IP address.',
    category: 'system', usage: 'who',
  },
  last: {
    desc: 'Show history of user logins',
    summary: 'Displayed recent login and logout history for all users. Useful for auditing who has been on the system.',
    category: 'system', usage: 'last | head -20',
  },
  history: {
    desc: 'Show previous commands you\'ve typed',
    summary: 'Listed previously executed commands with their index numbers. Use !123 to re-run command number 123.',
    category: 'system', usage: 'history | tail -20',
  },
  env: {
    desc: 'Show all environment variables',
    summary: 'Listed all environment variables set in the current shell. Use echo $VARIABLE to read a specific one.',
    category: 'system', usage: 'env | grep PATH',
  },
  export: {
    desc: 'Set or export an environment variable',
    summary: 'Created or updated an environment variable that\'s also visible to child processes. Changes are only for this session.',
    category: 'system', usage: 'export API_KEY=abc123',
  },
  sudo: {
    desc: 'Run a command as root (administrator)',
    summary: 'Executed the command with full root privileges. Use carefully — root can modify or delete any file on the system.',
    category: 'system', usage: 'sudo systemctl restart nginx',
  },
  crontab: {
    desc: 'View or edit scheduled tasks',
    summary: 'Opened the cron job scheduler for the current user. Use -l to list existing jobs, -e to edit them.',
    category: 'system', usage: 'crontab -l',
  },
  systemctl: {
    desc: 'Start, stop, or check system services',
    summary: 'Managed a systemd service. Common actions: start, stop, restart, status, enable (auto-start), disable.',
    category: 'system', usage: 'systemctl status nginx',
  },

  // ── Archive & Compression ─────────────────────────────────────────────
  tar: {
    desc: 'Create or extract .tar / .tar.gz archives',
    summary: 'Handled a tar archive operation. Use -czf to create a .tar.gz, -xzf to extract it, -tvf to list contents without extracting.',
    category: 'archive', usage: 'tar -czf backup.tar.gz /etc',
  },
  zip: {
    desc: 'Compress files into a .zip archive',
    summary: 'Compressed the specified files into a .zip archive. Use -r to include entire directories recursively.',
    category: 'archive', usage: 'zip -r archive.zip folder/',
  },
  unzip: {
    desc: 'Extract files from a .zip archive',
    summary: 'Unpacked all files from the .zip archive. Use -l to list contents first, -d to specify the output folder.',
    category: 'archive', usage: 'unzip archive.zip -d output/',
  },
  gzip: {
    desc: 'Compress a file with gzip (.gz)',
    summary: 'Compressed the file using gzip compression, replacing it with a .gz version. Use gunzip to decompress.',
    category: 'archive', usage: 'gzip large-file.txt',
  },

  // ── Security Tools ────────────────────────────────────────────────────
  hashcat: {
    desc: 'GPU-accelerated password hash cracker',
    summary: 'Ran a password hash cracking job using hashcat. Use -m to set hash type (0=MD5, 1000=NTLM), -a for attack mode (0=dictionary, 3=brute force).',
    category: 'security', usage: 'hashcat -m 0 hash.txt wordlist.txt',
  },
  hydra: {
    desc: 'Brute-force login credentials for many protocols',
    summary: 'Attempted to crack login credentials against the target service. Use responsibly — only on systems you own or have written permission to test.',
    category: 'security', usage: 'hydra -l admin -P wordlist.txt ssh://target',
  },
  sqlmap: {
    desc: 'Automated SQL injection detection and exploitation',
    summary: 'Tested the URL for SQL injection vulnerabilities automatically. Use only on applications you own or have permission to test.',
    category: 'security', usage: 'sqlmap -u "http://site.com/?id=1" --dbs',
  },
  john: {
    desc: 'John the Ripper — crack password hashes',
    summary: 'Ran John the Ripper against the hash file to attempt password recovery. Use --wordlist for dictionary attack, --show to display cracked passwords.',
    category: 'security', usage: 'john --wordlist=rockyou.txt hash.txt',
  },
  gobuster: {
    desc: 'Brute-force web directories and DNS subdomains',
    summary: 'Enumerated hidden directories or subdomains on the target using a wordlist. Found paths may reveal hidden admin panels or sensitive files.',
    category: 'security', usage: 'gobuster dir -u http://target.com -w wordlist.txt',
  },
  nikto: {
    desc: 'Web server vulnerability scanner',
    summary: 'Scanned the web server for known vulnerabilities, misconfigurations, and outdated software. Only use on servers you own or have permission to test.',
    category: 'security', usage: 'nikto -h http://target.com',
  },
  metasploit: {
    desc: 'Launch Metasploit Framework (msfconsole)',
    summary: 'Started the Metasploit exploitation framework. Type use <module> to select an exploit, show options to see required settings.',
    category: 'security', usage: 'msfconsole',
  },
  msfconsole: {
    desc: 'Metasploit Framework interactive console',
    summary: 'Opened the Metasploit console for penetration testing. Only use against systems you own or have explicit permission to test.',
    category: 'security', usage: 'msfconsole',
  },
  burpsuite: {
    desc: 'Web application security testing proxy (GUI)',
    summary: 'Launched Burp Suite for intercepting and modifying HTTP/HTTPS traffic. Requires a graphical display to run.',
    category: 'security', usage: 'burpsuite &',
  },
  certutil: {
    desc: 'Display or verify SSL certificate details',
    summary: 'Showed the SSL certificate chain information for the target. Useful for checking expiry dates and certificate authorities.',
    category: 'security', usage: 'openssl s_client -connect host:443 | openssl x509 -noout -dates',
  },

  // ── Pipeline & Misc ───────────────────────────────────────────────────
  man: {
    desc: 'Open the manual page for a command',
    summary: 'Opened the official manual for the command with full documentation. Press q to exit, / to search, arrow keys to scroll.',
    category: 'help', usage: 'man grep',
  },
  which: {
    desc: 'Show where a command\'s binary is located',
    summary: 'Found the full filesystem path of the executable being run when you type that command. Useful for debugging PATH issues.',
    category: 'system', usage: 'which python3',
  },
  type: {
    desc: 'Show how the shell resolves a command (builtin, alias, file)',
    summary: 'Revealed whether the command is a shell builtin, an alias, or an external executable and where it lives.',
    category: 'system', usage: 'type ls',
  },
  alias: {
    desc: 'Create or list command shortcuts',
    summary: 'Defined a shortcut alias for a longer command. Without arguments, lists all active aliases in this session.',
    category: 'system', usage: "alias ll='ls -la'",
  },
  clear: {
    desc: 'Clear the terminal screen',
    summary: 'Cleared all text from the terminal display. Your command history is still accessible with the up arrow key.',
    category: 'system', usage: 'clear',
  },
  exit: {
    desc: 'Close the current shell session',
    summary: 'Exited the current shell. If this was the only shell in the terminal, the session will close.',
    category: 'system', usage: 'exit',
  },
  date: {
    desc: 'Show the current date and time',
    summary: 'Printed the current system date and time. Use date +"%Y-%m-%d %H:%M:%S" to format it differently.',
    category: 'system', usage: 'date',
  },
  base64: {
    desc: 'Encode or decode data in Base64 format',
    summary: 'Converted the input to or from Base64 encoding. Use -d to decode. Often used in CTF challenges and web security.',
    category: 'security', usage: 'echo "hello" | base64',
  },
  xxd: {
    desc: 'Hex dump of a file or data',
    summary: 'Displayed the file as a hex dump alongside ASCII representation. Useful for inspecting binary files or looking for hidden data.',
    category: 'security', usage: 'xxd file.bin | head -20',
  },
  strings: {
    desc: 'Extract readable text from a binary file',
    summary: 'Found all printable character sequences in the binary. Useful for reversing executables and finding embedded credentials or URLs.',
    category: 'security', usage: 'strings binary.exe | grep -i pass',
  },
  file: {
    desc: 'Identify the type of a file',
    summary: 'Detected the true file format by examining its content, not just the extension. Useful when filenames are misleading.',
    category: 'file', usage: 'file suspicious.exe',
  },
};

// ── OS Command Translation Map ──────────────────────────────────────────
export interface TranslationEntry {
  linux: string;
  note: string;    // Short: what was auto-translated
}

export const OS_TRANSLATIONS: Record<string, TranslationEntry> = {
  // Windows
  'ipconfig':              { linux: 'ip addr show',                          note: 'ipconfig → ip addr show' },
  'ipconfig /all':         { linux: 'ip addr show',                          note: 'ipconfig /all → ip addr show' },
  'ipconfig/all':          { linux: 'ip addr show',                          note: 'ipconfig/all → ip addr show' },
  'ipconfig /flushdns':    { linux: 'resolvectl flush-caches 2>/dev/null || echo "DNS cache flush not available"', note: 'ipconfig /flushdns → resolvectl flush-caches' },
  'ipconfig/flushdns':     { linux: 'resolvectl flush-caches 2>/dev/null || echo "DNS cache flush not available"', note: 'ipconfig/flushdns → resolvectl flush-caches' },
  'cls':                   { linux: 'clear',                                  note: 'cls → clear' },
  'dir':                   { linux: 'ls -la',                                 note: 'dir → ls -la' },
  'dir /s':                { linux: 'ls -laR',                                note: 'dir /s → ls -laR' },
  'del':                   { linux: 'rm',                                     note: 'del → rm' },
  'copy':                  { linux: 'cp',                                     note: 'copy → cp' },
  'move':                  { linux: 'mv',                                     note: 'move → mv' },
  'md':                    { linux: 'mkdir',                                  note: 'md → mkdir' },
  'rd':                    { linux: 'rmdir',                                  note: 'rd → rmdir' },
  'rd /s':                 { linux: 'rm -r',                                  note: 'rd /s → rm -r' },
  'tasklist':              { linux: 'ps aux',                                 note: 'tasklist → ps aux' },
  'tasklist /v':           { linux: 'ps auxf',                                note: 'tasklist /v → ps auxf' },
  'taskkill /f /pid':      { linux: 'kill -9',                                note: 'taskkill → kill -9' },
  'tracert':               { linux: 'traceroute',                             note: 'tracert → traceroute' },
  'netstat':               { linux: 'ss -tulnp',                              note: 'netstat → ss -tulnp' },
  'netstat -an':           { linux: 'ss -an',                                 note: 'netstat -an → ss -an' },
  'netstat -b':            { linux: 'ss -tulnp',                              note: 'netstat -b → ss -tulnp' },
  'systeminfo':            { linux: 'uname -a && cat /etc/os-release',        note: 'systeminfo → uname -a + /etc/os-release' },
  'type':                  { linux: 'cat',                                    note: 'type → cat' },
  'findstr':               { linux: 'grep',                                   note: 'findstr → grep' },
  'attrib':                { linux: 'ls -la',                                 note: 'attrib → ls -la' },
  'shutdown /s':           { linux: 'sudo shutdown now',                      note: 'shutdown /s → sudo shutdown now' },
  'shutdown /r':           { linux: 'sudo reboot',                            note: 'shutdown /r → sudo reboot' },
  'set':                   { linux: 'env',                                    note: 'set → env' },
  'where':                 { linux: 'which',                                  note: 'where → which' },
  'fc':                    { linux: 'diff',                                   note: 'fc → diff' },
  'more':                  { linux: 'less',                                   note: 'more → less' },
  'icacls':                { linux: 'ls -la',                                 note: 'icacls → ls -la' },
  'whoami':                { linux: 'whoami',                                 note: 'whoami (same on Linux)' },
  'hostname':              { linux: 'hostname',                               note: 'hostname (same on Linux)' },
  'nbtstat':               { linux: 'nmblookup',                              note: 'nbtstat → nmblookup' },
  'reg query':             { linux: 'cat /etc/ ... (no registry on Linux)',   note: 'reg query → no direct equivalent on Linux' },
  // macOS
  'brew install':          { linux: 'nix-env -i',                             note: 'brew install → nix-env -i (Nix)' },
  'brew list':             { linux: 'nix-env -q',                             note: 'brew list → nix-env -q' },
  'open .':                { linux: 'ls -la',                                 note: 'open . → ls -la (no GUI file manager here)' },
  'pbcopy':                { linux: 'xclip -selection clipboard',             note: 'pbcopy → xclip' },
  'pbpaste':               { linux: 'xclip -selection clipboard -o',          note: 'pbpaste → xclip -o' },
  'caffeinate':            { linux: 'systemd-inhibit sleep',                  note: 'caffeinate → systemd-inhibit' },
  'say':                   { linux: 'espeak',                                  note: 'say → espeak (if installed)' },
  'sw_vers':               { linux: 'cat /etc/os-release',                    note: 'sw_vers → cat /etc/os-release' },
  'diskutil list':         { linux: 'lsblk',                                  note: 'diskutil list → lsblk' },
  'launchctl list':        { linux: 'systemctl list-units',                   note: 'launchctl → systemctl' },
  'ifconfig':              { linux: 'ip addr show',                           note: 'ifconfig → ip addr show' },
};

/**
 * Get translation for a full command line.
 * Matches the longest prefix found in OS_TRANSLATIONS.
 */
export function getTranslation(input: string): TranslationEntry | null {
  const lower = input.trim().toLowerCase();
  // Try longest match first
  let bestKey = '';
  for (const key of Object.keys(OS_TRANSLATIONS)) {
    if (lower === key || lower.startsWith(key + ' ')) {
      if (key.length > bestKey.length) bestKey = key;
    }
  }
  if (!bestKey) return null;
  const entry = OS_TRANSLATIONS[bestKey];
  // Rebuild command: replace the matched prefix with linux equivalent, keep the rest
  const rest = input.trim().slice(bestKey.length).trimStart();
  const linux = rest ? entry.linux + ' ' + rest : entry.linux;
  return { linux, note: entry.note };
}

/**
 * Get command info for a typed command (first word).
 */
export function getCommandInfo(input: string): CommandInfo | null {
  const cmd = input.trim().split(/\s+/)[0].toLowerCase();
  return COMMANDS[cmd] ?? null;
}

/**
 * Get top-N suggestions matching the current input.
 */
export function getSuggestions(input: string, max = 6): Array<{ name: string } & CommandInfo> {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const lower = trimmed.toLowerCase();
  const firstWord = lower.split(/\s+/)[0];

  const results: Array<{ name: string; score: number } & CommandInfo> = [];

  for (const [name, info] of Object.entries(COMMANDS)) {
    if (name === lower || name === firstWord) {
      results.push({ name, ...info, score: 10 });
    } else if (name.startsWith(firstWord)) {
      results.push({ name, ...info, score: 5 });
    } else if (firstWord.length >= 2 && name.includes(firstWord)) {
      results.push({ name, ...info, score: 2 });
    } else if (firstWord.length >= 3 && info.desc.toLowerCase().includes(firstWord)) {
      results.push({ name, ...info, score: 1 });
    }
  }

  return results
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, max)
    .map(({ score: _s, ...rest }) => rest);
}

// Category label map for display
export const CATEGORY_LABELS: Record<string, string> = {
  file: '📁 File',
  directory: '📂 Dir',
  search: '🔍 Search',
  text: '📝 Text',
  network: '🌐 Network',
  process: '⚙️ Process',
  system: '🖥 System',
  security: '🔐 Security',
  archive: '📦 Archive',
  help: '📖 Help',
};
