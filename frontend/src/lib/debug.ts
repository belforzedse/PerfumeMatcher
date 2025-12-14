export const isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG === "true";

export function debugLog(...args: unknown[]) {
  if (!isDebugEnabled) return;
  // eslint-disable-next-line no-console
  console.log(...args);
}

export function debugWarn(...args: unknown[]) {
  if (!isDebugEnabled) return;
  // eslint-disable-next-line no-console
  console.warn(...args);
}

