import type { ServerResponse } from 'node:http';

const jsonReplacer = (_key: string, value: unknown): unknown =>
  typeof value === 'bigint' ? value.toString() : value;

export const sendJson = (
  response: ServerResponse,
  statusCode: number,
  body: unknown,
): void => {
  const payload = JSON.stringify(body, jsonReplacer);

  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  response.end(payload);
};
