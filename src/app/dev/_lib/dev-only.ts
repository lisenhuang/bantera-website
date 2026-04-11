export function assertDevActionEnabled() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Dev-only actions are disabled in production.');
  }
}
