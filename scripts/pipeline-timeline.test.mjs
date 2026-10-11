import test from 'node:test';
import assert from 'node:assert/strict';
import { timelineSteps, callOutcome, eventFacts, eventData, eventTitle } from '../src/lib/pipeline-timeline.ts';
const event = (id, code, detail = {}, second = 0) => ({ id, code, stage: 'dialogue', model: 'chatgpt/gpt-6-luna', severity: 'info', createdAt: new Date(1000 * second).toISOString(), detailJson: JSON.stringify(detail) });
test('a failed request and successful retry stay separate and keep their milestones', () => {
  const steps = timelineSteps([
    event('1', 'model_call_started', { callId: 'a', attempt: 1 }),
    event('2', 'provider_response_failed', { callId: 'a', providerCode: 'server_error' }, 2),
    event('3', 'model_call_started', { callId: 'b', attempt: 2 }, 3),
    event('4', 'model_call_progress', { callId: 'b', stage: 'reasoning' }, 4),
    event('5', 'model_call_succeeded', { callId: 'b' }, 5),
    event('6', 'model_attempt_succeeded', {}, 6),
  ]);
  assert.equal(steps.length, 3);
  assert.equal(callOutcome(steps[0], false), 'Failed');
  assert.equal(callOutcome(steps[1], false), 'Response received');
  assert.equal(steps[1].events.length, 3);
  assert.equal(eventTitle(steps[1].events[1]), 'Reasoning started');
});
test('old histories do not invent calls or turn fallback selection into success', () => {
  const steps = timelineSteps([event('1', 'response_timeout', { seconds: 180 }), event('2', 'model_fallback_attempted', { primaryModel: 'chatgpt/gpt-6-luna', fallbackModel: 'gemini-flash-latest' })]);
  assert.ok(steps.every(s => !s.call));
  assert.match(eventFacts(steps[1].events[0])[0], /→ gemini-flash-latest/);
});
test('missing terminal records remain unknown after a job has ended', () => {
  const [step] = timelineSteps([event('1', 'model_call_started', { callId: 'a' })]);
  assert.equal(callOutcome(step, false), 'Outcome not recorded');
  assert.equal(callOutcome(step, true), 'In progress');
});
test('malformed details and empty answer counts are handled honestly', () => {
  assert.deepEqual(eventData({ detailJson: 'invalid' }), {});
  assert.deepEqual(eventData({ detailJson: 'null' }), {});
  assert.deepEqual(eventData({ detailJson: '[]' }), {});
  assert.ok(eventFacts(event('a', 'model_call_failed', { answerCharacters: 0, searchCompleted: false })).includes('Answer characters: 0'));
});
