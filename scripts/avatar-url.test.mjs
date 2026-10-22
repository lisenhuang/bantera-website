import test from 'node:test';
import assert from 'node:assert/strict';
import { avatarUrlForBrowser } from '../src/lib/avatar-url.ts';

// Each test file runs in its own process. Fix the public-origin fixture so CI's
// deliberately unreachable build origin does not change these assertions.
process.env.NEXT_PUBLIC_BANTERA_API_BASE_URL = 'https://api.bantera.app';

const path = '/api/users/00000000-0000-0000-0000-000000000001/avatar?v=123';
test('private server URLs become public HTTPS URLs and retain image revision', () => {
  for (const host of ['http://bantera-api-20261021-9:8080', 'http://127.0.0.1:18152', 'https://api.bantera.app']) {
    assert.equal(avatarUrlForBrowser(host + path), 'https://api.bantera.app' + path);
  }
  assert.equal(avatarUrlForBrowser(path), 'https://api.bantera.app' + path);
});
test('missing and unsafe avatar URLs use the initials fallback', () => {
  for (const src of [null, '', 'javascript:alert(1)', 'data:text/html,abc', 'http://private:8080/unknown']) {
    assert.equal(avatarUrlForBrowser(src), null);
  }
});
