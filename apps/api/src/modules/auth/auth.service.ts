/**
 * Authentication business logic. HTTP details stay in the controller,
 * persistence in the repositories.
 */
import type { User } from '@prisma/client';
import type { AuthResponse, AuthTokens, AuthUser, LoginInput, RegisterInput } from '@vexa/shared';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { createUser, emailExists, findActiveByEmail, findActiveById } from './auth.repository.js';
import { createVerificationToken, sendVerificationEmail } from './emailVerification.service.js';
import { hashPassword, verifyPassword } from './password.service.js';
import {
  createRefreshToken,
  findByJti,
  revokeAllByUserId,
  revokeByJti,
} from './refreshToken.repository.js';
import {
  consumeRefreshToken,
  issueRefreshToken,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  signAccessToken,
  verifyRefreshToken,
} from './token.service.js';

/** Access token lifetime in seconds, mirrored to the client in `expiresIn`. */
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/** Request metadata recorded on the session row. */
export interface SessionContext {
  userAgent: string | null;
  ipAddress: string | null;
}

/** Strips passwordHash and internal columns before anything leaves the API. */
function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    roles: user.roles,
    emailVerified: user.emailVerifiedAt !== null,
    locale: user.locale,
  };
}

/**
 * Signs an access token and opens a session: allowlist entry in Redis plus a
 * journal row in refresh_tokens.
 */
async function issueTokens(user: User, context: SessionContext): Promise<AuthTokens> {
  const accessToken = signAccessToken(user.id, user.roles);
  const refresh = await issueRefreshToken(user.id);

  await createRefreshToken({
    userId: user.id,
    jti: refresh.jti,
    expiresAt: refresh.expiresAt,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
  });

  return {
    accessToken,
    refreshToken: refresh.token,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

export async function register(
  input: RegisterInput,
  context: SessionContext,
): Promise<AuthResponse> {
  if (await emailExists(input.email)) {
    throw AppError.conflict('Email is already registered');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createUser({
    email: input.email,
    passwordHash,
    fullName: input.fullName,
  });

  const verificationToken = await createVerificationToken(user.id);
  sendVerificationEmail(user.email, verificationToken);

  // Signing in immediately: email confirmation is not a gate on login at MVP,
  // it is enforced later on author-side actions (see the SRS discussion).
  const tokens = await issueTokens(user, context);

  return { user: toAuthUser(user), tokens };
}

export async function login(input: LoginInput, context: SessionContext): Promise<AuthResponse> {
  const user = await findActiveByEmail(input.email);

  // verifyPassword handles a null hash by comparing against a dummy value, so
  // an unknown email costs the same time as a known one.
  const passwordValid = await verifyPassword(input.password, user?.passwordHash ?? null);

  if (user === null || !passwordValid) {
    // One message for both cases: telling the client which half was wrong
    // turns the endpoint into an account-existence oracle.
    throw AppError.unauthorized('Invalid email or password');
  }

  if (user.status === 'BLOCKED') {
    throw AppError.forbidden('Account is blocked');
  }

  const tokens = await issueTokens(user, context);

  return { user: toAuthUser(user), tokens };
}

/**
 * Rotates a refresh token: the presented one dies, a fresh pair is issued.
 *
 * Rotation is what makes a 30-day token acceptable. A stolen token is usable
 * only until the legitimate client refreshes next — at that point one of the
 * two parties presents a dead token and the whole session chain is burned.
 */
export async function refresh(refreshToken: string, context: SessionContext): Promise<AuthResponse> {
  // Signature, expiry, issuer and audience. Throws 401 on any of them.
  const payload = verifyRefreshToken(refreshToken);

  const consumed = await consumeRefreshToken(payload.jti, payload.sub);

  if (!consumed) {
    await handleRefreshMiss(payload.sub, payload.jti);
    throw AppError.unauthorized('Refresh token is no longer valid');
  }

  // Mark the journal row: Redis is the authority on validity, Postgres keeps
  // the audit trail of when each session ended.
  await revokeByJti(payload.jti);

  // Roles are re-read from the database on every rotation, so a role granted
  // by an admin reaches the client within one refresh cycle at most.
  const user = await findActiveById(payload.sub);

  if (user === null) {
    throw AppError.unauthorized('Refresh token is no longer valid');
  }

  if (user.status === 'BLOCKED') {
    // Without this check a blocked account would keep refreshing for 30 days.
    await revokeAllSessions(user.id);
    throw AppError.forbidden('Account is blocked');
  }

  const tokens = await issueTokens(user, context);

  return { user: toAuthUser(user), tokens };
}

/**
 * A signature-valid token that is absent from the allowlist means one of two
 * things: it was already rotated or logged out (reuse — treat as theft), or
 * Redis lost the key. Only the first case is distinguishable, via the journal.
 */
async function handleRefreshMiss(userId: string, jti: string): Promise<void> {
  const journalRow = await findByJti(jti);

  if (journalRow !== null && journalRow.revokedAt !== null) {
    logger.warn(
      { userId, jti, revokedAt: journalRow.revokedAt },
      'Refresh token reuse detected, revoking all sessions',
    );

    // Either the attacker or the legitimate client holds a live token and we
    // cannot tell which. Killing every session forces a password login and
    // ends the attack.
    await revokeAllSessions(userId);
  }
}

/** Revokes every session of a user in both stores. */
async function revokeAllSessions(userId: string): Promise<void> {
  await revokeAllUserRefreshTokens(userId);
  await revokeAllByUserId(userId);
}

/**
 * Ends one session. Deliberately never fails: an expired or already-revoked
 * token still means "the user wants out", and an error here would leave the
 * client holding credentials it believes are live.
 */
export async function logout(refreshToken: string): Promise<void> {
  try {
    const payload = verifyRefreshToken(refreshToken);

    await revokeRefreshToken(payload.jti, payload.sub);
    await revokeByJti(payload.jti);
  } catch {
    logger.debug('Logout called with an unusable refresh token');
  }
}

/** Ends every session of the token owner — "sign out on all devices". */
export async function logoutAll(refreshToken: string): Promise<number> {
  const payload = verifyRefreshToken(refreshToken);

  await revokeAllUserRefreshTokens(payload.sub);

  return revokeAllByUserId(payload.sub);
}