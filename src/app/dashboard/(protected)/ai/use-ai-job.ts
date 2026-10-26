'use client';

import { useEffect, useState } from 'react';
import { startAiJob, getAiJob, type AiJobKind } from './job-actions';

// Only a random job ID is stored in this tab. Results remain owner-authorized on the server.
export function useAiJob<T>(kind: AiJobKind) {
  const [jobId, setJobId] = useState<string>();
  const [result, setResult] = useState<T>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [starting, setStarting] = useState(false);
  const storage = `bantera-ai-job:${kind}`;
  useEffect(() => {
    const id = sessionStorage.getItem(storage);
    if (id) setJobId(id);
  }, [storage]);
  useEffect(() => {
    if (!jobId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const started = Date.now();
    async function poll() {
      try {
        const state = await getAiJob(jobId!);
        if (stopped) return;
        if (state.kind !== kind) throw new Error('This job is unavailable.');
        if (state.status === 'done' || state.status === 'failed' || state.status === 'cancelled') {
          sessionStorage.removeItem(storage); setJobId(undefined); setNotice('');
          if (state.status === 'done') setResult(state.result as T);
          else setError(typeof state.result?.message === 'string' ? state.result.message : 'Generation could not finish. Please try again.');
          return;
        }
        setNotice(state.status === 'queued' ? 'Queued. You can leave this page and return later.' : 'Generating. You can leave this page and return later.');
      } catch (error) {
        if (stopped) return;
        const message = error instanceof Error ? error.message : '';
        if (/unavailable|expired|sign in|authorized/.test(message)) {
          sessionStorage.removeItem(storage); setJobId(undefined); setError(message); return;
        }
        setNotice('Reconnecting to your existing generation…');
      }
      if (!stopped && Date.now() - started < 15 * 60 * 1000) timer = setTimeout(poll, 3000);
      else if (!stopped) { setJobId(undefined); setNotice('Still waiting. Reopen this page to check the saved job.'); }
    }
    timer = setTimeout(poll, 1000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [jobId, kind, storage]);
  async function start(body: Record<string, unknown>) {
    if (starting || jobId) return;
    const id = crypto.randomUUID();
    setStarting(true); setError(''); setResult(undefined); setNotice('Starting…');
    sessionStorage.setItem(storage, id);
    try {
      // Retry only with the same ID; a lost acknowledgment must not duplicate provider work.
      try { await startAiJob(kind, id, body); }
      catch { await startAiJob(kind, id, body); }
      setJobId(id);
    } catch {
      setNotice('Checking whether generation started…'); setJobId(id);
    } finally { setStarting(false); }
  }
  return { start, result, error, notice, pending: starting || !!jobId };
}
