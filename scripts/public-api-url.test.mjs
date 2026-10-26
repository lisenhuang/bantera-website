import test from 'node:test';
import assert from 'node:assert/strict';
import { getApiBaseUrl, getPublicApiBaseUrl } from '../src/lib/bantera-api.ts';

test('external MCP URLs stay public when server requests use a deployment container', (t) => {
  const original = { ...process.env };
  t.after(() => { process.env = original; });
  delete process.env.NEXT_PUBLIC_BANTERA_API_BASE_URL;
  process.env.BANTERA_API_BASE_URL = 'http://bantera-api-20261026-2:8080';

  assert.equal(getApiBaseUrl(), 'http://bantera-api-20261026-2:8080');
  assert.equal(`${getPublicApiBaseUrl()}/mcp`, 'https://api.bantera.app/mcp');

  process.env.NEXT_PUBLIC_BANTERA_API_BASE_URL = '   ';
  assert.equal(getPublicApiBaseUrl(), 'https://api.bantera.app');

  process.env.NEXT_PUBLIC_BANTERA_API_BASE_URL = ' https://api.staging.bantera.app/// ';
  assert.equal(`${getPublicApiBaseUrl()}/mcp`, 'https://api.staging.bantera.app/mcp');
});
