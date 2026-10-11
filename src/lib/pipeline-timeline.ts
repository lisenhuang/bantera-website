import type { AiPipelineEvent } from './dashboard-api';

export function eventData(event: AiPipelineEvent): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(event.detailJson ?? '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch { return {}; }
}

export const stageNames: Record<string, string> = {
  generation: 'Generation', dialogue: 'Dialogue', dialogue_web_search: 'Dialogue with web search',
  tts: 'Speech synthesis', transcription: 'Transcription', transcript_correction: 'Transcript correction',
  word_alignment: 'Word alignment', timing: 'Timing', alignment: 'Alignment', save: 'Save',
  upload: 'Upload', mp3: 'Audio encoding', chatgpt_response: 'GPT response', cue_timing: 'Cue timing',
};
export function stageName(stage: string) { return stageNames[stage] ?? stage.replaceAll('_', ' '); }
export function duration(ms: number | null) {
  if (ms == null || !Number.isFinite(ms)) return 'Not recorded';
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}
export function timestamp(value: string | null) {
  return value ? new Date(value).toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC' }) + ' UTC' : 'Not recorded';
}

const progressNames: Record<string, string> = {
  accepted: 'Request accepted', created: 'Response created', reasoning: 'Reasoning started',
  searching: 'Searching the web', search_completed: 'Web search completed',
  answer_started: 'Answer started', answer_streaming: 'Answer text arriving',
};
const eventNames: Record<string, string> = {
  model_attempt_started: 'Model operation started', model_attempt_succeeded: 'Model output validated',
  model_attempt_failed: 'Model operation failed', model_fallback_attempted: 'Switching to fallback model',
  model_fallback_succeeded: 'Fallback succeeded', model_call_started: 'Request started',
  model_call_succeeded: 'Response received', model_call_failed: 'Request failed',
  provider_response_failed: 'Provider response failed', response_timeout: 'Response timed out',
  key_failed: 'Model attempt failed', generation_started: 'Generation started',
  generation_completed: 'Generation completed', timing_fallback: 'Using fallback timing',
  transcription_timing_rejected: 'Transcription timing rejected', script_duration_checked: 'Dialogue length checked',
};
export function eventTitle(event: AiPipelineEvent) {
  const data = eventData(event);
  if (event.code === 'model_call_progress' && typeof data.stage === 'string') return progressNames[data.stage] ?? data.stage.replaceAll('_', ' ');
  return eventNames[event.code] ?? event.code.replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
}
export function eventFacts(event: AiPipelineEvent) {
  const d = eventData(event);
  const facts: string[] = [];
  const fields: [string, string][] = [
    ['reasoning', 'Reasoning'], ['attempt', 'Attempt'], ['httpStatus', 'HTTP'], ['providerCode', 'Provider code'],
    ['reason', 'Reason'], ['seconds', 'Deadline (seconds)'], ['timeoutSeconds', 'GPT deadline (seconds)'],
    ['answerCharacters', 'Answer characters'], ['sourceCount', 'Sources'], ['stage', 'Last response stage'],
  ];
  for (const [key, label] of fields) {
    const value = d[key];
    if (typeof value === 'string' || typeof value === 'number') facts.push(`${label}: ${value}`);
  }
  if (typeof d.webSearch === 'boolean') facts.push(`Web search: ${d.webSearch ? 'on' : 'off'}`);
  if (typeof d.searchCompleted === 'boolean') facts.push(`Search completed: ${d.searchCompleted ? 'yes' : 'no'}`);
  if (typeof d.primaryModel === 'string' && typeof d.fallbackModel === 'string') facts.unshift(`${d.primaryModel} → ${d.fallbackModel}`);
  return facts;
}

export type TimelineStep = { id: string; call: boolean; events: AiPipelineEvent[] };
export function timelineSteps(events: AiPipelineEvent[]) {
  const steps: TimelineStep[] = [];
  const calls = new Map<string, TimelineStep>();
  // Preserve backend ordering for ties. Never infer old calls from today's model settings.
  for (const event of [...events].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))) {
    const callId = eventData(event).callId;
    if (typeof callId !== 'string') { steps.push({ id: event.id, call: false, events: [event] }); continue; }
    const existing = calls.get(callId);
    if (existing) existing.events.push(event);
    else { const step = { id: callId, call: true, events: [event] }; calls.set(callId, step); steps.push(step); }
  }
  return steps;
}

export function callOutcome(step: TimelineStep, processing: boolean) {
  if (step.events.some(e => ['model_call_failed', 'provider_response_failed'].includes(e.code))) return 'Failed';
  if (step.events.some(e => e.code === 'model_call_succeeded')) return 'Response received';
  return processing ? 'In progress' : 'Outcome not recorded';
}
