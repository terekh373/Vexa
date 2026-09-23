import { randomBytes } from 'node:crypto';
import type { User } from '@prisma/client';
import type { AuthResponse, AuthUser } from '@vexa/shared';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { redis } from '../../lib/redis.js';
import { findActiveById } from './auth.repository.js';
import { issueTokens, type SessionContext } from './auth.service.js';
import {
  createGoogleUser,
  findActiveByGoogleId,
  findActiveGoogleUserByEmail,
  linkGoogleAccount,
} from './googleOAuth.repository.js';

const STATE_TTL_SECONDS = 10 * 60;
const EXCHANGE_TTL_SECONDS = 60;
const stateKey = (state: string): string => `google-oauth-state:${state}`;
const exchangeKey = (code: string): string => `google-oauth-exchange:${code}`;

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
}

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

function googleConfig(): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const redirectUri = env.GOOGLE_REDIRECT_URI;

  if (clientId === undefined || clientSecret === undefined || redirectUri === undefined) {
    throw AppError.serviceUnavailable('Google sign-in is not configured');
  }

  return { clientId, clientSecret, redirectUri };
}

async function consumeSingleUseValue(key: string): Promise<string | null> {
  const results = await redis.multi().get(key).del(key).exec();
  if (results === null) return null;
  const value = results[0]?.[1];
  return typeof value === 'string' ? value : null;
}

export async function createGoogleAuthorizationUrl(): Promise<string> {
  const { clientId, redirectUri } = googleConfig();
  const state = randomBytes(32).toString('base64url');
  await redis.set(stateKey(state), '1', 'EX', STATE_TTL_SECONDS);

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');

  return url.toString();
}

async function exchangeAuthorizationCode(code: string): Promise<string> {
  const { clientId, clientSecret, redirectUri } = googleConfig();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  const payload = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || typeof payload.access_token !== 'string') {
    throw AppError.unauthorized('Google authorization code is invalid');
  }

  return payload.access_token;
}

async function loadGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw AppError.unauthorized('Google profile could not be loaded');
  }

  const profile = (await response.json()) as Partial<GoogleUserInfo>;
  if (
    typeof profile.sub !== 'string' ||
    typeof profile.email !== 'string' ||
    typeof profile.email_verified !== 'boolean'
  ) {
    throw AppError.unauthorized('Google profile is incomplete');
  }

  return {
    sub: profile.sub,
    email: profile.email.trim().toLowerCase(),
    email_verified: profile.email_verified,
    name: typeof profile.name === 'string' ? profile.name.trim() : undefined,
  };
}

/**
 * Public for integration tests: this is the account-linking rule, independent
 * from Google's network endpoints.
 */
export async function resolveGoogleUser(profile: GoogleUserInfo): Promise<User> {
  if (!profile.email_verified) {
    throw AppError.forbidden('Google email is not verified');
  }

  const byGoogleId = await findActiveByGoogleId(profile.sub);
  if (byGoogleId !== null) {
    if (byGoogleId.status === 'BLOCKED') throw AppError.forbidden('Account is blocked');
    return byGoogleId;
  }

  const email = profile.email.trim().toLowerCase();
  const byEmail = await findActiveGoogleUserByEmail(email);
  if (byEmail !== null) {
    if (byEmail.status === 'BLOCKED') throw AppError.forbidden('Account is blocked');
    if (byEmail.googleId !== null && byEmail.googleId !== profile.sub) {
      throw AppError.conflict('This email is already linked to another Google account');
    }
    return linkGoogleAccount(byEmail.id, profile.sub);
  }

  const fallbackName = email.split('@')[0] ?? 'Google user';
  return createGoogleUser({
    sub: profile.sub,
    email,
    name: profile.name?.trim() || fallbackName,
  });
}

export async function completeGoogleCallback(code: string, state: string): Promise<string> {
  const stateMarker = await consumeSingleUseValue(stateKey(state));
  if (stateMarker === null) {
    throw AppError.unauthorized('Google OAuth state is invalid or expired');
  }

  const googleAccessToken = await exchangeAuthorizationCode(code);
  const profile = await loadGoogleUserInfo(googleAccessToken);
  const user = await resolveGoogleUser(profile);

  const exchangeCode = randomBytes(32).toString('base64url');
  await redis.set(exchangeKey(exchangeCode), user.id, 'EX', EXCHANGE_TTL_SECONDS);
  return exchangeCode;
}

export async function exchangeGoogleLoginCode(
  code: string,
  context: SessionContext,
): Promise<AuthResponse> {
  const userId = await consumeSingleUseValue(exchangeKey(code));
  if (userId === null) {
    throw AppError.notFound('Google exchange code is invalid or expired');
  }

  const user = await findActiveById(userId);
  if (user === null) {
    throw AppError.notFound('Google account no longer exists');
  }
  if (user.status === 'BLOCKED') {
    throw AppError.forbidden('Account is blocked');
  }

  const tokens = await issueTokens(user, context);
  return { user: toAuthUser(user), tokens };
}

/** Test helper: creates exactly the same one-time exchange code as callback. */
export async function createGoogleExchangeCodeForUser(userId: string): Promise<string> {
  const code = randomBytes(32).toString('base64url');
  await redis.set(exchangeKey(code), userId, 'EX', EXCHANGE_TTL_SECONDS);
  return code;
}
