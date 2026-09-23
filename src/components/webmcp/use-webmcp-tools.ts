'use client';

import { useEffect, useRef } from 'react';
import { registerWebMcpTools, type WebMcpTool } from '@/lib/webmcp';

/**
 * Registers WebMCP tools for as long as the calling component is mounted.
 *
 * Tools are registered once (per set of names), and each call is forwarded to the latest
 * definition through a ref — so `execute` always sees current component state, without
 * unregistering and re-registering on every render.
 */
export function useWebMcpTools(tools: readonly WebMcpTool[]) {
  const latest = useRef(tools);

  useEffect(() => {
    latest.current = tools;
  });

  const names = tools.map((t) => t.name).join('|');

  useEffect(() => {
    const controller = new AbortController();

    const proxies: WebMcpTool[] = latest.current.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
      execute: async (input) => {
        const current = latest.current.find((t) => t.name === tool.name);
        if (!current) return 'This tool is no longer available on this page.';
        try {
          return await current.execute(input ?? {});
        } catch (err) {
          // Agents read the message; never leak a stack trace.
          return `Error: ${err instanceof Error ? err.message : 'the action failed.'}`;
        }
      },
    }));

    registerWebMcpTools(proxies, controller.signal);
    return () => controller.abort();
    // Re-register only when the set of tools changes, not when their state does.
  }, [names]);
}
