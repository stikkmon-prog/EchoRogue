import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const TEMP_CODE_DIR = path.join(process.cwd(), 'tmp_code_tools');

const safeFileName = (language: string) => {
  const suffix = language === 'javascript' ? '.js' : '.py';
  return `code_tool_${Date.now()}${Math.random().toString(36).slice(2, 8)}${suffix}`;
};

const runProgram = async (command: string, args: string[], cwd: string) => {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timeoutMs = 8000;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill('SIGKILL');
        reject(new Error('Execution timed out.'));
      }
    }, timeoutMs);

    child.stdout.on('data', data => { stdout += data.toString(); });
    child.stderr.on('data', data => { stderr += data.toString(); });
    child.on('error', err => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
    child.on('close', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      }
    });
  });
};

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = String(body.code || '');
  const language = String(body.language || 'python').trim().toLowerCase();
  const action = String(body.action || 'debug').trim().toLowerCase();

  if (!code.trim()) {
    return NextResponse.json({ error: 'No code provided.' }, { status: 400 });
  }

  await fs.mkdir(TEMP_CODE_DIR, { recursive: true });
  const filename = safeFileName(language);
  const filePath = path.join(TEMP_CODE_DIR, filename);

  if (action === 'clean') {
    const cleaned = code
      .replace(/\s+$/gm, '')
      .replace(/\r\n/g, '\n')
      .replace(/[\t ]+$/gm, '')
      .trimEnd() + '\n';
    return NextResponse.json({ result: cleaned });
  }

  await fs.writeFile(filePath, code, 'utf8');

  try {
    if (action === 'debug') {
      if (language === 'python') {
        const result = await runProgram('python', ['-m', 'py_compile', filePath], TEMP_CODE_DIR);
        return NextResponse.json({ result: result.stderr || 'No Python syntax issues found.' });
      }
      if (language === 'javascript') {
        const result = await runProgram('node', ['--check', filePath], TEMP_CODE_DIR);
        return NextResponse.json({ result: result.stderr || 'No JavaScript syntax issues found.' });
      }
      return NextResponse.json({ result: 'Debug mode is available for Python and JavaScript only.' });
    }

    if (action === 'analyze') {
      const lineCount = code.split(/\r?\n/).length;
      return NextResponse.json({
        result: `Analysis summary:\n- Language: ${language}\n- Lines: ${lineCount}\n- Characters: ${code.length}\n- First 200 chars:\n${code.slice(0, 200)}`
      });
    }

    return NextResponse.json({ error: `Unsupported code action: ${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: `Code tool failed: ${String(error)}` }, { status: 500 });
  } finally {
    await fs.rm(filePath, { force: true });
  }
}
