'use server';

import { assertDevActionEnabled } from '@/app/dev/_lib/dev-only';

export type AlignResult =
  | { success: true;  json: string; logs: string[] }
  | { success: false; error: string; logs: string[] };

export async function alignWithRevAIAction(opts: {
  audioUrl: string;
  text: string;
  language?: string;
}): Promise<AlignResult> {
  assertDevActionEnabled();

  const logs: string[] = [];
  const log = (msg: string) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log('[revai]', line);
    logs.push(line);
  };

  const apiToken = process.env.REVAI_ACCESS_TOKEN;
  if (!apiToken) return { success: false, error: 'REVAI_ACCESS_TOKEN is not configured in .env.local', logs };

  const { audioUrl, text, language = 'en' } = opts;
  const revaiLang = language.split('-')[0];

  // 1. Submit alignment job
  log(`Submitting job — language: ${revaiLang}, audio: ${audioUrl}`);
  let jobId: string;
  try {
    const res = await fetch('https://api.rev.ai/alignment/v1/jobs', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_config: { url: audioUrl },
        transcript_text: text,
        language: revaiLang,
      }),
    });
    const body = await res.text();
    log(`Submit response ${res.status}: ${body}`);
    if (!res.ok) return { success: false, error: `Rev.ai submit error ${res.status}: ${body}`, logs };
    ({ id: jobId } = JSON.parse(body) as { id: string });
    log(`Job created: ${jobId}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Submit threw: ${msg}`);
    return { success: false, error: `Rev.ai submit failed: ${msg}`, logs };
  }

  // 2. Poll until transcribed (max ~5 min, every 3 s)
  type RevJob = { id: string; status: 'in_progress' | 'completed' | 'failed'; failure_detail?: string };
  for (let attempt = 0; attempt < 100; attempt++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 3000));
    try {
      const res = await fetch(`https://api.rev.ai/alignment/v1/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (!res.ok) {
        log(`Poll ${attempt + 1}: status check HTTP ${res.status}`);
        continue;
      }
      const job = await res.json() as RevJob;
      log(`Poll ${attempt + 1}: job status = ${job.status}`);

      if (job.status === 'failed') {
        return { success: false, error: `Rev.ai job failed: ${job.failure_detail ?? 'unknown'}`, logs };
      }
      if (job.status !== 'completed') continue;

      // 3. Fetch transcript
      log('Job transcribed — fetching transcript…');
      const tRes = await fetch(`https://api.rev.ai/alignment/v1/jobs/${jobId}/transcript`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: 'application/vnd.rev.transcript.v1.0+json',
        },
      });
      log(`Transcript fetch response: ${tRes.status}`);
      if (!tRes.ok) {
        return { success: false, error: `Rev.ai transcript fetch error ${tRes.status}`, logs };
      }

      const data = await tRes.json();
      return { success: true, json: JSON.stringify(data, null, 2), logs };
    } catch (err: unknown) {
      log(`Poll ${attempt + 1} threw: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { success: false, error: 'Rev.ai alignment timed out after ~5 minutes.', logs };
}
