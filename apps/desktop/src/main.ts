import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { spawn } from 'node:child_process';
import type {
  ChatRequest,
  ChatResponse,
  ChatErrorResponse,
} from '@gritpus-stela/shared';

const PORT = parseInt(process.env.PORT || '50004', 10);
const CLAUDE_TIMEOUT = 120_000;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function runClaude(
  prompt: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['-p'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: CLAUDE_TIMEOUT,
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    proc.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
    proc.stderr.on('data', (chunk) => stderrChunks.push(chunk));

    proc.on('close', (code) => {
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
        stderr: Buffer.concat(stderrChunks).toString('utf-8'),
        exitCode: code ?? 1,
      });
    });

    proc.on('error', (err) => reject(err));

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
    return;
  }

  if (req.method === 'POST' && req.url === '/chat') {
    try {
      const raw = await readBody(req);
      const body: ChatRequest = JSON.parse(raw);

      if (!body.prompt || typeof body.prompt !== 'string') {
        sendJson(res, 400, {
          error: 'Missing or invalid "prompt" field',
        } satisfies ChatErrorResponse);
        return;
      }

      const start = Date.now();
      const result = await runClaude(body.prompt.trim());
      const durationMs = Date.now() - start;

      if (result.exitCode !== 0) {
        sendJson(res, 502, {
          error: 'Claude CLI returned non-zero exit code',
          details: result.stderr || result.stdout,
        } satisfies ChatErrorResponse);
        return;
      }

      sendJson(res, 200, {
        response: result.stdout.trim(),
        durationMs,
      } satisfies ChatResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      sendJson(res, 500, { error: message } satisfies ChatErrorResponse);
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Desktop Claude service running on port ${PORT}`);
});
