/**
 * Escapes the LIKE wildcards so user input is matched literally: without it
 * `%` would match every title. Backslash goes first, otherwise the escapes
 * added for `%` and `_` would be escaped again.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
