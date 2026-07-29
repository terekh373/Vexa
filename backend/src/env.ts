import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const unquote = (value: string): string => {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
};

/**
 * Minimal .env loader to keep the API runtime dependency-free.
 * Existing process variables always win over values from backend/.env.
 */
export const loadEnvFile = (): void => {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquote(trimmed.slice(separatorIndex + 1).trim());
    if (/^[A-Z_][A-Z0-9_]*$/i.test(key) && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

loadEnvFile();
