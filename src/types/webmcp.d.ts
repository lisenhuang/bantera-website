// Declarative WebMCP attributes (https://github.com/webmachinelearning/webmcp —
// declarative-api-explainer.md). A browser that supports WebMCP turns a form carrying
// these into a tool an agent can call; other browsers ignore them.
/* eslint-disable @typescript-eslint/no-unused-vars -- `T` must match React's own
   declarations for interface merging to apply. */
import 'react';

declare module 'react' {
  interface FormHTMLAttributes<T> {
    /** Tool name the agent sees for this form. */
    toolname?: string;
    /** What the tool does, in natural language. */
    tooldescription?: string;
    /** Present (as "") to let the agent submit the form without a separate user click. */
    toolautosubmit?: '';
  }

  interface InputHTMLAttributes<T> {
    /** Describes this field as a tool parameter. */
    toolparamdescription?: string;
  }

  interface SelectHTMLAttributes<T> {
    toolparamdescription?: string;
  }
}
