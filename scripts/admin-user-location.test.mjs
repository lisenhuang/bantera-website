import test from 'node:test';
import assert from 'node:assert/strict';
import { locationCountry, locationActivityDate } from '../src/lib/admin-user-location.ts';

test('country names are readable and unknown headers do not invent a location', () => {
  assert.equal(locationCountry('nz'), '🇳🇿 New Zealand');
  for (const code of [null, undefined, '', 'XX', 'T1', '123', '<script>']) assert.equal(locationCountry(code), 'Not available');
});
test('activity date preserves the server UTC day regardless of browser timezone', () => {
  assert.equal(locationActivityDate('2026-10-27'), 'Oct 27, 2026');
  assert.equal(locationActivityDate('invalid'), 'Not available');
});
