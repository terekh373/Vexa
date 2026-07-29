import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { HttpError } from '../http/errors.js';

export interface AuthUser {
  id: string;
  roles: string[];
}

interface JwtHeader {
  alg?: unknown;
  typ?: unknown;
}

interface JwtPayload {
  sub?: unknown;
  userId?: unknown;
  id?: unknown;
  roles?: unknown;
  exp?: unknown;
  nbf?: unknown;
}

const decodeBase64Url = (value: string): Buffer =>
  Buffer.from(value, 'base64url');

const parseJsonObject = <T>(part: string): T => {
  try {
    const parsed: unknown = JSON.parse(decodeBase64Url(part).toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('JWT part is not an object');
    }
    return parsed as T;
  } catch {
    throw new HttpError(401, 'INVALID_TOKEN', 'Токен доступу має некоректний формат.');
  }
};

const parseNumericDate = (value: unknown, field: 'exp' | 'nbf'): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new HttpError(401, 'INVALID_TOKEN', `Поле ${field} у токені некоректне.`);
  }
  return value;
};

const normalizeRoles = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((role): role is string => typeof role === 'string');
};

const verifyHs256Token = (token: string, secret: string): AuthUser => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Токен доступу має некоректний формат.');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Токен доступу має некоректний формат.');
  }

  const header = parseJsonObject<JwtHeader>(encodedHeader);
  if (header.alg !== 'HS256') {
    throw new HttpError(401, 'INVALID_TOKEN', 'Підтримується лише алгоритм HS256.');
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();

  let actualSignature: Buffer;
  try {
    actualSignature = decodeBase64Url(encodedSignature);
  } catch {
    throw new HttpError(401, 'INVALID_TOKEN', 'Підпис токена некоректний.');
  }

  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Підпис токена не пройшов перевірку.');
  }

  const payload = parseJsonObject<JwtPayload>(encodedPayload);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = parseNumericDate(payload.exp, 'exp');
  const notBefore = parseNumericDate(payload.nbf, 'nbf');

  if (expiresAt !== undefined && now >= expiresAt) {
    throw new HttpError(401, 'TOKEN_EXPIRED', 'Термін дії токена завершився.');
  }
  if (notBefore !== undefined && now < notBefore) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Токен ще не набув чинності.');
  }

  const userId = [payload.sub, payload.userId, payload.id].find(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );

  if (!userId) {
    throw new HttpError(401, 'INVALID_TOKEN', 'У токені відсутній ідентифікатор користувача.');
  }

  return { id: userId, roles: normalizeRoles(payload.roles) };
};

export const getOptionalAuthUser = (request: IncomingMessage): AuthUser | undefined => {
  const authorization = request.headers.authorization;
  if (!authorization) {
    return undefined;
  }

  const [scheme, token, extra] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
    throw new HttpError(
      401,
      'INVALID_AUTH_HEADER',
      'Заголовок Authorization має формат Bearer <token>.',
    );
  }

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new HttpError(
      500,
      'AUTH_NOT_CONFIGURED',
      'На сервері не налаштовано JWT_ACCESS_SECRET.',
    );
  }

  return verifyHs256Token(token, secret);
};
