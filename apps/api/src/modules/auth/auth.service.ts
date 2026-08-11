/**
 * Authentication business logic. HTTP details stay in the controller,
 * persistence in the repositories.
 */
import type { User } from '@prisma/client';
import type { AuthResponse, AuthTokens, AuthUser, LoginInput, RegisterInput } from '@vexa/shared';
import { AppError } from '../../lib/errors.js';
import { createRefreshToken } from './refreshToken.repository.js';
import { createUser, emailExists, findActiveByEmail } from './auth.repository.js';
import { createVerificationToken, sendVerificationEmail } from './emailVerification.service.js';
import { hashPassword, verifyPassword } from './password.service.js';
import { issueRefreshToken, signAccessToken } from './token.service.js';

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