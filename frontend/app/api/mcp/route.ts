import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { readMcpState, writeMcpState, McpRepoState } from '../../../lib/persistence';

const MCP_REPO_DIR = path.join(process.cwd(), 'frontend', 'data', 'mcp_repos');
const GITHUB_URL_RE = /^(https?:\/\/github\.com\/[^/]+\/[^/]+)(?:\.git)?$/i;

const runCommand = async (command: string, args: string[], cwd: string) => {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => { stdout += data.toString(); });
    child.stderr.on('data', data => { stderr += data.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
};

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || 'status').trim().toLowerCase();
  const target = String(body.target || '').trim();

  await fs.mkdir(MCP_REPO_DIR, { recursive: true });
  const state = await readMcpState();

  if (action === 'status') {
    return NextResponse.json({
      message: 'MCP server is active. Use clone, inspect, or status to manage repositories and tools.',
      repos: state.repos
    });
  }

  if (action === 'clone') {
    const match = target.match(GITHUB_URL_RE);
    if (!match) {
      return NextResponse.json({ error: 'Target must be a GitHub repository URL.' }, { status: 400 });
    }

    const repoSlug = match[1].replace(/^https?:\/\//, '').replace(/\.git$/, '');
    const repoName = repoSlug.replace(/\//g, '_');
    const repoPath = path.join(MCP_REPO_DIR, repoName);
    try {
      await fs.access(repoPath);
      return NextResponse.json({ message: `Repository already cloned at ${repoPath}.`, repoPath });
    } catch {
      // continue to clone
    }

    try {
      const result = await runCommand('git', ['clone', target, repoPath], MCP_REPO_DIR);
      const summary = result.stderr || result.stdout || 'Clone completed successfully.';
      const repoState: McpRepoState = {
        slug: repoName,
        url: target,
        path: repoPath,
        clonedAt: new Date().toISOString(),
        status: 'cloned'
      };
      const nextState = { repos: [repoState, ...state.repos.filter(repo => repo.slug !== repoName)] };
      await writeMcpState(nextState);
      return NextResponse.json({ message: summary, repo: repoState });
    } catch (error) {
      return NextResponse.json({ error: `Git clone failed: ${String(error)}` }, { status: 500 });
    }
  }

  if (action === 'inspect') {
    if (!target) {
      return NextResponse.json({ error: 'Target repo path or URL is required for inspect.' }, { status: 400 });
    }

    const match = target.match(GITHUB_URL_RE);
    let repoPath = target;
    if (match) {
      const repoSlug = match[1].replace(/^https?:\/\//, '').replace(/\.git$/, '');
      const repoName = repoSlug.replace(/\//g, '_');
      repoPath = path.join(MCP_REPO_DIR, repoName);
    }

    try {
      const entries = await fs.readdir(repoPath, { withFileTypes: true });
      const files = entries.slice(0, 40).map(entry => `${entry.isDirectory() ? '📁' : '📄'} ${entry.name}`);
      return NextResponse.json({ message: `Inspecting ${repoPath}`, files, repoPath });
    } catch (error) {
      return NextResponse.json({ error: `Inspect failed: ${String(error)}` }, { status: 404 });
    }
  }

  return NextResponse.json({ error: `Unsupported MCP action: ${action}` }, { status: 400 });
}
