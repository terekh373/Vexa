/**
 * Email confirmation (SRS 15.1).
 *
 * Tokens are short-lived and single-use, so Redis is the source of truth. The
 * mail function keeps its existing `(email, token) => void` signature while
 * the transport performs best-effort asynchronous delivery.
 */
import { randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { sendMail } from '../../lib/mailer.js';
import { redis } from '../../lib/redis.js';
import { findActiveByEmail, markEmailVerified } from './auth.repository.js';

const TOKEN_TTL_SECONDS = 24 * 60 * 60;

const verificationKey = (token: string): string => `email-verify:${token}`;

/** 32 random bytes, base64url — safe to place in a URL as-is. */
function generateVerificationToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function createVerificationToken(userId: string): Promise<string> {
  const token = generateVerificationToken();
  await redis.set(verificationKey(token), userId, 'EX', TOKEN_TTL_SECONDS);

  return token;
}

export function sendVerificationEmail(email: string, token: string): void {
  const verificationUrl = `${env.WEB_APP_URL.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;

  void sendMail({
    to: [{ email }],
    subject: 'Vexa — підтвердіть email',
    text: `Вітаємо у Vexa! Підтвердьте вашу email-адресу за посиланням: ${verificationUrl}\n\nПосилання дійсне 24 години.`,
    html: `<p>Вітаємо у Vexa!</p><p>Підтвердьте вашу email-адресу:</p><p><a href="${verificationUrl}">Підтвердити email</a></p><p>Посилання дійсне 24 години.</p>`,
  });
}

/**
 * Resends confirmation without exposing whether an account exists or is
 * already verified. The HTTP controller always returns the same 204 response.
 */
export async function requestVerificationResend(email: string): Promise<void> {
  const user = await findActiveByEmail(email);

  if (user === null || user.emailVerifiedAt !== null) {
    return;
  }

  const token = await createVerificationToken(user.id);
  sendVerificationEmail(user.email, token);
}

/**
 * Consumes a token atomically. Two parallel confirmations cannot both win.
 */
export async function consumeVerificationToken(token: string): Promise<string> {
  const key = verificationKey(token);
  const results = await redis.multi().get(key).del(key).exec();

  if (results === null) {
    throw AppError.notFound('Verification token is invalid or expired');
  }

  const userId = results[0]?.[1];

  if (typeof userId !== 'string') {
    throw AppError.notFound('Verification token is invalid or expired');
  }

  await markEmailVerified(userId);

  return userId;
}
