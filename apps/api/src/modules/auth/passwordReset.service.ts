/**
 * Password recovery (SRS 15.1 / issue #65).
 *
 * Reset tokens are short-lived, single-use secrets, so Redis is the right
 * store. Email delivery is best-effort through the shared Brevo transport.
 */
import { randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { sendMail } from '../../lib/mailer.js';
import { redis } from '../../lib/redis.js';
import { findActiveByEmail, updatePasswordHash } from './auth.repository.js';
import { revokeAllSessions } from './auth.service.js';
import { hashPassword } from './password.service.js';

const TOKEN_TTL_SECONDS = 60 * 60;
const MISSING_USER_SENTINEL = '__missing__';

const passwordResetKey = (token: string): string => `password-reset:${token}`;

function generatePasswordResetToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await findActiveByEmail(email);
  const token = generatePasswordResetToken();

  await redis.set(
    passwordResetKey(token),
    user?.id ?? MISSING_USER_SENTINEL,
    'EX',
    TOKEN_TTL_SECONDS,
  );

  if (user !== null) {
    sendPasswordResetEmail(user.email, token);
  }
}

/** Keeps the existing `(email, token) => void` signature used by auth flows. */
export function sendPasswordResetEmail(email: string, token: string): void {
  const resetPasswordUrl = `${env.WEB_APP_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

  void sendMail({
    to: [{ email }],
    subject: 'Vexa — відновлення пароля',
    text: `Ви запросили зміну пароля у Vexa. Встановіть новий пароль за посиланням: ${resetPasswordUrl}\n\nПосилання дійсне 1 годину. Якщо це були не ви, проігноруйте лист.`,
    html: `<p>Ви запросили зміну пароля у Vexa.</p><p><a href="${resetPasswordUrl}">Встановити новий пароль</a></p><p>Посилання дійсне 1 годину. Якщо це були не ви, проігноруйте лист.</p>`,
  });
}

/** Atomically reads and deletes a reset token. */
async function consumePasswordResetToken(token: string): Promise<string> {
  const key = passwordResetKey(token);
  const results = await redis.multi().get(key).del(key).exec();

  if (results === null) {
    throw AppError.notFound('Password reset token is invalid or expired');
  }

  const userId = results[0]?.[1];

  if (typeof userId !== 'string' || userId === MISSING_USER_SENTINEL) {
    throw AppError.notFound('Password reset token is invalid or expired');
  }

  return userId;
}

/** Changes the password and invalidates every refresh session for the user. */
export async function resetPassword(token: string, password: string): Promise<void> {
  const userId = await consumePasswordResetToken(token);
  const passwordHash = await hashPassword(password);
  const updated = await updatePasswordHash(userId, passwordHash);

  if (!updated) {
    throw AppError.notFound('Password reset token is invalid or expired');
  }

  await revokeAllSessions(userId);
}
