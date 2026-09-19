import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

interface AccessPayload {
  sub: string;
  type: 'access';
}

function isAccessPayload(value: unknown): value is AccessPayload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.type === 'access' && typeof candidate.sub === 'string';
}

/** Public route: auth is optional, but a supplied token must be valid. */
export const optionalAuth: RequestHandler = (req, res, next) => {
  const header = req.get('authorization');

  if (header === undefined) {
    next();
    return;
  }

  if (!header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Invalid authorization header' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  const secret = process.env.JWT_ACCESS_SECRET;

  if (token.length === 0 || secret === undefined || secret.length === 0) {
    res.status(401).json({ error: 'Invalid or expired access token' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'vexa',
      audience: 'vexa-api',
    });

    if (!isAccessPayload(decoded)) {
      res.status(401).json({ error: 'Invalid or expired access token' });
      return;
    }

    res.locals.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token' });
  }
};
