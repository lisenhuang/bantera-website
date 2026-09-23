'use client';

import { useState } from 'react';

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be unavailable (e.g. non-secure context); the text is still selectable.
    }
  }

  return (
    <div className="flex items-stretch gap-2">
      <code aria-label={label}
        className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/30 px-3 py-2.5 text-sm font-mono text-gray-900 dark:text-gray-100">
        {value}
      </code>
      <button type="button" onClick={copy}
        className="shrink-0 rounded-xl border border-gray-300 dark:border-white/15 px-3 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
        {n}
      </span>
      <span className="text-sm text-gray-700 dark:text-gray-300">{children}</span>
    </li>
  );
}

const EXAMPLE_QUESTIONS = [
  'How many people registered this week, compared with last week?',
  'Show me daily, weekly and monthly active users for the last 30 days.',
  'Which native languages do our users speak? Combine the accents.',
  'Which countries are our users in?',
  'Look up the user with email someone@example.com.',
];

/** How to connect an MCP client (Claude) to the Bantera admin MCP server. */
export function ConnectInstructions({ mcpUrl }: { mcpUrl: string }) {
  const claudeCodeCommand = `claude mcp add --transport http bantera-admin ${mcpUrl}`;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Connect an AI assistant</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Bantera runs an MCP server, so an assistant such as Claude can answer questions about your
          users and content — and, if you allow it, make admin changes. It signs in as you, and only
          admin accounts can approve a connection.
        </p>
      </div>

      <div className="space-y-2">
        <p className="label-xs">MCP server URL</p>
        <CopyField value={mcpUrl} label="MCP server URL" />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Use it exactly as shown — without a trailing slash.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Claude on the web, desktop or mobile</h3>
          <ol className="space-y-2.5">
            <Step n={1}>In Claude, open <strong>Customize → Connectors</strong> and choose <strong>Add custom connector</strong>.</Step>
            <Step n={2}>Name it <em>Bantera Admin</em> and paste the URL above. Leave the advanced OAuth fields empty.</Step>
            <Step n={3}>Choose <strong>Connect</strong>. You will be sent to this dashboard to approve it.</Step>
            <Step n={4}>Approve with <strong>read</strong> only, or also tick <strong>make changes</strong> to allow admin actions.</Step>
          </ol>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            On a Team or Enterprise plan, an organisation owner may need to add the connector first.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Claude Code</h3>
          <ol className="space-y-2.5">
            <Step n={1}>Run this in your terminal:</Step>
          </ol>
          <CopyField value={claudeCodeCommand} label="Claude Code command" />
          <ol className="space-y-2.5" start={2}>
            <Step n={2}>Start Claude Code, type <code className="font-mono text-xs">/mcp</code>, select <em>bantera-admin</em> and choose <strong>Authenticate</strong>.</Step>
            <Step n={3}>Approve in the browser window that opens.</Step>
          </ol>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Any other MCP client that supports remote servers over Streamable HTTP with OAuth works the same way.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 dark:bg-white/5 px-4 py-3">
        <p className="label-xs">Try asking</p>
        <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
          {EXAMPLE_QUESTIONS.map((q) => <li key={q}>“{q}”</li>)}
        </ul>
      </div>
    </div>
  );
}
