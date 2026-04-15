import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';

const ALLOWED_COMMANDS = new Set([
  'pwd',
  'ls',
  'cat',
  'echo',
  'whoami',
  'id',
  'uname',
  'df',
  'du',
  'head',
  'tail',
  'find',
  'grep',
  'wc',
  'sort',
  'uniq',
  'cut',
  'tr',
  'awk',
  'sed',
  'xargs',
  'tee',
  'basename',
  'dirname',
  'file',
  'stat',
  'env',
  'printenv',
  'date',
  'uptime',
  'sleep',
  'ps',
  'top',
  'htop',
  'lsof',
  'mount',
  'umount',
  'journalctl',
  'dmesg',
  'ping',
  'traceroute',
  'curl',
  'wget',
  'netstat',
  'ss',
  'ip',
  'ifconfig',
  'nmap',
  'tcpdump',
  'arp',
  'dig',
  'host',
  'nslookup',
  'ssh',
  'scp',
  'git',
  'python',
  'python3',
  'node',
  'npm',
  'bash',
  'sh',
  'perl',
  'ruby',
  'tar',
  'gzip',
  'gunzip',
  'bzip2',
  'bunzip2',
  'zip',
  'unzip',
  'nc',
  'openssl',
  'gdb'
]);

const safePath = (candidate: string) => {
  const root = process.cwd();
  const resolved = path.resolve(root, candidate);
  return resolved.startsWith(root) ? resolved : root;
};

const parseCommand = (command: string) => {
  const matches = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  return matches.map(token => token.replace(/^"|"$/g, '').replace(/^'|'$/g, ''));
};

const runChildProcess = async (command: string, args: string[]) => {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), shell: false });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => {
      stdout += data.toString();
    });
    child.stderr.on('data', data => {
      stderr += data.toString();
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0 && !stderr) {
        stderr = `Command exited with code ${code}.`;
      }
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
};

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const command = String(body.command || '').trim();
  if (!command) {
    return NextResponse.json({ error: 'No command provided.' }, { status: 400 });
  }

  const tokens = parseCommand(command);
  if (tokens.length === 0) {
    return NextResponse.json({ error: 'Unable to parse command.' }, { status: 400 });
  }

  const program = tokens[0];
  const args = tokens.slice(1);
  if (!ALLOWED_COMMANDS.has(program)) {
    return NextResponse.json({ error: `Command not allowed: ${program}` }, { status: 403 });
  }

  const normalizedArgs = args.map(arg => {
    if (arg.startsWith('/') || arg.startsWith('./') || arg.startsWith('../')) {
      return safePath(arg);
    }
    return arg;
  });

  if (normalizedArgs.some(arg => arg.includes('..'))) {
    return NextResponse.json({ error: 'Parent path traversal is not permitted.' }, { status: 403 });
  }

  try {
    const result = await runChildProcess(program, normalizedArgs);
    const output = result.stdout || result.stderr || `Executed ${program} successfully.`;
    return NextResponse.json({ output, error: result.stderr || null });
  } catch (error) {
    return NextResponse.json({ error: `Terminal execution failed: ${String(error)}` }, { status: 500 });
  }
}
