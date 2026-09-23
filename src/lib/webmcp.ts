// WebMCP: lets an AI agent running in the user's browser discover and call tools this page
// provides, instead of scraping the DOM. Spec: https://github.com/webmachinelearning/webmcp
//
// Availability (as of Chrome 149): an origin trial in Chrome and Edge, a flag for local
// development (about:flags#enable-webmcp-testing), and support in some agent browsers.
// Everything here feature-detects, so it is a no-op wherever the API does not exist.

export type JsonSchema = {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

export type WebMcpAnnotations = {
  /** The tool only reads; it changes nothing. */
  readOnlyHint?: boolean;
  /** The result contains user-generated text the agent must treat as data, not instructions. */
  untrustedContentHint?: boolean;
  /** The tool has significant, hard-to-reverse real-world effects. */
  consequentialHint?: boolean;
};

export type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: WebMcpAnnotations;
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>;
};

type ModelContext = {
  registerTool(tool: WebMcpTool, options?: { signal?: AbortSignal }): unknown;
};

export const NO_INPUT: JsonSchema = { type: 'object', properties: {} };

export function getModelContext(): ModelContext | null {
  if (typeof document === 'undefined') return null;
  const ctx = (document as Document & { modelContext?: ModelContext }).modelContext;
  return ctx && typeof ctx.registerTool === 'function' ? ctx : null;
}

/**
 * Registers tools until `signal` aborts. A tool that fails to register is logged and
 * skipped rather than breaking the page.
 */
export function registerWebMcpTools(tools: readonly WebMcpTool[], signal: AbortSignal) {
  const ctx = getModelContext();
  if (!ctx) return;

  for (const tool of tools) {
    try {
      const result = ctx.registerTool(tool, { signal });
      if (result instanceof Promise) {
        result.catch((err: unknown) => {
          if (!signal.aborted) console.warn(`[webmcp] could not register ${tool.name}`, err);
        });
      }
    } catch (err) {
      console.warn(`[webmcp] could not register ${tool.name}`, err);
    }
  }
}

/** Rejects tool calls with a clear, agent-readable message. */
export class ToolInputError extends Error {}

export function requireString(input: Record<string, unknown>, key: string, maxLength = 200): string {
  const value = input[key];
  if (typeof value !== 'string' || !value.trim()) throw new ToolInputError(`"${key}" is required.`);
  if (value.length > maxLength) throw new ToolInputError(`"${key}" is too long.`);
  return value.trim();
}

export function optionalString(input: Record<string, unknown>, key: string, maxLength = 200): string | undefined {
  const value = input[key];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new ToolInputError(`"${key}" must be a string.`);
  return value.trim().slice(0, maxLength);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireId(input: Record<string, unknown>, key: string): string {
  const value = requireString(input, key, 64);
  if (!UUID.test(value)) throw new ToolInputError(`"${key}" must be a lesson id (a UUID).`);
  return value;
}
