export type InstallCommandEntry = {
  names: string[];
  packageName: string;
  command: string;
  description: string;
};

export const installCommandEntries: InstallCommandEntry[] = [
  {
    names: ['nmap'],
    packageName: 'nmap',
    command: 'sudo apt update && sudo apt install -y nmap',
    description: 'Network scanner and host discovery tool.'
  },
  {
    names: ['tcpdump'],
    packageName: 'tcpdump',
    command: 'sudo apt update && sudo apt install -y tcpdump',
    description: 'Packet capture utility.'
  },
  {
    names: ['curl'],
    packageName: 'curl',
    command: 'sudo apt update && sudo apt install -y curl',
    description: 'Command-line data transfer tool.'
  },
  {
    names: ['wget'],
    packageName: 'wget',
    command: 'sudo apt update && sudo apt install -y wget',
    description: 'Non-interactive network downloader.'
  },
  {
    names: ['netstat'],
    packageName: 'net-tools',
    command: 'sudo apt update && sudo apt install -y net-tools',
    description: 'Legacy networking utilities including netstat.'
  },
  {
    names: ['ss'],
    packageName: 'iproute2',
    command: 'sudo apt update && sudo apt install -y iproute2',
    description: 'Socket statistics utility from iproute2.'
  },
  {
    names: ['ip', 'ifconfig'],
    packageName: 'iproute2',
    command: 'sudo apt update && sudo apt install -y iproute2',
    description: 'IP routing and network device configuration utilities.'
  },
  {
    names: ['git'],
    packageName: 'git',
    command: 'sudo apt update && sudo apt install -y git',
    description: 'Distributed version control system.'
  },
  {
    names: ['python', 'python3'],
    packageName: 'python3',
    command: 'sudo apt update && sudo apt install -y python3 python3-pip',
    description: 'Python 3 interpreter and package manager.'
  },
  {
    names: ['node', 'npm'],
    packageName: 'nodejs npm',
    command: 'sudo apt update && sudo apt install -y nodejs npm',
    description: 'Node.js runtime and npm package manager.'
  },
  {
    names: ['bash', 'sh'],
    packageName: 'bash',
    command: 'sudo apt update && sudo apt install -y bash',
    description: 'Bourne Again Shell.'
  },
  {
    names: ['htop'],
    packageName: 'htop',
    command: 'sudo apt update && sudo apt install -y htop',
    description: 'Interactive process viewer.'
  },
  {
    names: ['lsof'],
    packageName: 'lsof',
    command: 'sudo apt update && sudo apt install -y lsof',
    description: 'List open files and network sockets.'
  },
  {
    names: ['ping'],
    packageName: 'iputils-ping',
    command: 'sudo apt update && sudo apt install -y iputils-ping',
    description: 'Ping utility for network debugging.'
  },
  {
    names: ['traceroute'],
    packageName: 'traceroute',
    command: 'sudo apt update && sudo apt install -y traceroute',
    description: 'Network route tracing utility.'
  },
  {
    names: ['nc', 'ncat', 'netcat'],
    packageName: 'netcat-openbsd',
    command: 'sudo apt update && sudo apt install -y netcat-openbsd',
    description: 'Network debugging and exploration tool.'
  },
  {
    names: ['openssl'],
    packageName: 'openssl',
    command: 'sudo apt update && sudo apt install -y openssl',
    description: 'Cryptography toolkit.'
  },
  {
    names: ['gdb'],
    packageName: 'gdb',
    command: 'sudo apt update && sudo apt install -y gdb',
    description: 'GNU debugger for native programs.'
  },
  {
    names: ['tar'],
    packageName: 'tar',
    command: 'sudo apt update && sudo apt install -y tar',
    description: 'Tape archive utility.'
  },
  {
    names: ['gzip'],
    packageName: 'gzip',
    command: 'sudo apt update && sudo apt install -y gzip',
    description: 'Compression utility.'
  },
  {
    names: ['unzip'],
    packageName: 'unzip',
    command: 'sudo apt update && sudo apt install -y unzip',
    description: 'Zip archive extractor.'
  },
  {
    names: ['john', 'johntheripper'],
    packageName: 'john',
    command: 'sudo apt update && sudo apt install -y john',
    description: 'Password cracking tool.'
  },
  {
    names: ['sqlmap'],
    packageName: 'sqlmap',
    command: 'sudo apt update && sudo apt install -y sqlmap',
    description: 'Automated SQL injection testing tool.'
  },
  {
    names: ['hydra'],
    packageName: 'hydra',
    command: 'sudo apt update && sudo apt install -y hydra',
    description: 'Online password cracking tool.'
  },
  {
    names: ['aircrack-ng'],
    packageName: 'aircrack-ng',
    command: 'sudo apt update && sudo apt install -y aircrack-ng',
    description: 'Wireless network security toolkit.'
  },
  {
    names: ['hashcat'],
    packageName: 'hashcat',
    command: 'sudo apt update && sudo apt install -y hashcat',
    description: 'High-performance password recovery tool.'
  },
  {
    names: ['nikto'],
    packageName: 'nikto',
    command: 'sudo apt update && sudo apt install -y nikto',
    description: 'Web server security scanner.'
  },
  {
    names: ['metasploit'],
    packageName: 'metasploit-framework',
    command: 'sudo apt update && sudo apt install -y metasploit-framework',
    description: 'Metasploit penetration testing framework.'
  }
];

export const getInstallCommand = (query: string) => {
  const lower = query.toLowerCase();
  const found = installCommandEntries.find(entry =>
    entry.names.some(name => lower.includes(name))
  );
  return found ? found : null;
};

export const getInstallHelp = (tool: string) => {
  const entry = getInstallCommand(tool);
  if (!entry) {
    return {
      names: [tool],
      packageName: tool,
      command: `sudo apt update && sudo apt install -y ${tool}`,
      description: `Install ${tool} using apt. Replace ${tool} with the package if needed.`
    };
  }
  return entry;
};
