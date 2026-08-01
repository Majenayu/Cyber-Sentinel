{pkgs}: {
  deps = [
    pkgs.cloudflared
    pkgs.traceroute
    pkgs.netcat-gnu
    pkgs.whois
    pkgs.dnsutils
    pkgs.tcpdump
    pkgs.sqlmap
    pkgs.nikto
    pkgs.gobuster
    pkgs.hashcat
    pkgs.john
    pkgs.thc-hydra
    pkgs.nmap
  ];
}
