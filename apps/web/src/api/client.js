import axios from 'axios';
import { routes } from '@vexa/shared';

import { API } from './config.js';

const ACCESS_TOKEN_KEY = 'vexa.accessToken';
const REFRESH_TOKEN_KEY = 'vexa.refreshToken';

let refreshPromise = null;
let onSessionRefresh = null;
let onSessionFailure = null;

const storage = {
  get(key) {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  set(key, value) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  },
  remove(key) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },
};

export const getStoredTokens = () => ({
  accessToken: storage.get(ACCESS_TOKEN_KEY),
  refreshToken: storage.get(REFRESH_TOKEN_KEY),
});

export const setStoredTokens = (tokens) => {
  if (!tokens?.accessToken || !tokens?.refreshToken) return;
  storage.set(ACCESS_TOKEN_KEY, tokens.accessToken);
  storage.set(REFRESH_TOKEN_KEY, tokens.refreshToken);
};

export const clearStoredTokens = () => {
  storage.remove(ACCESS_TOKEN_KEY);
  storage.remove(REFRESH_TOKEN_KEY);
};

export const setAuthSessionHandlers = ({ onRefresh, onFailure } = {}) => {
  onSessionRefresh = typeof onRefresh === 'function' ? onRefresh : null;
  onSessionFailure = typeof onFailure === 'function' ? onFailure : null;

  return () => {
    onSessionRefresh = null;
    onSessionFailure = null;
  };
};

const redirectToLogin = () => {
  if (typeof window === 'undefined') return;

  const loginPath = routes.login();
  if (window.location.pathname !== loginPath) {
    window.location.assign(loginPath);
  }
};

const failSession = () => {
  clearStoredTokens();
  onSessionFailure?.();
  redirectToLogin();
};

export const apiClient = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const { accessToken } = getStoredTokens();

  if (accessToken && !config.skipAuthHeader) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

const refreshSession = async () => {
  if (refreshPromise) return refreshPromise;

  const { refreshToken } = getStoredTokens();
  if (!refreshToken) {
    throw new Error('Missing refresh token');
  }

  refreshPromise = apiClient
    .post(
      '/auth/refresh',
      { refreshToken },
      {
        skipAuthRefresh: true,
        skipAuthHeader: true,
      },
    )
    .then(({ data }) => {
      // Logout may happen while the refresh request is in flight. In that case
      // do not recreate a session the user has already ended.
      if (getStoredTokens().refreshToken !== refreshToken) {
        throw new Error('Authentication session changed during refresh');
      }

      setStoredTokens(data.tokens);
      onSessionRefresh?.(data.user);
      return data.tokens;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

const bearerFromConfig = (config) => {
  const authorization =
    config?.headers?.get?.('Authorization') ??
    config?.headers?.Authorization ??
    config?.headers?.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length);
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config;

    // 403 means the identity is known but lacks rights. Refresh cannot change
    // that request's permissions, so it must never trigger token rotation.
    if (status !== 401 || originalRequest?.skipAuthRefresh) {
      return Promise.reject(error);
    }

    // A retried request returning 401 is the "second 401": end the session.
    if (originalRequest?._authRetried) {
      failSession();
      return Promise.reject(error);
    }

    const { accessToken, refreshToken } = getStoredTokens();
    if (!refreshToken) {
      failSession();
      return Promise.reject(error);
    }

    originalRequest._authRetried = true;

    // If another request already refreshed the session while this 401 was in
    // flight, retry with the new access token instead of rotating again.
    const tokenUsedByFailedRequest = bearerFromConfig(originalRequest);
    if (accessToken && tokenUsedByFailedRequest && tokenUsedByFailedRequest !== accessToken) {
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    }

    try {
      const tokens = await refreshSession();
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      failSession();
      return Promise.reject(refreshError);
    }
  },
);

export default apiClient;
