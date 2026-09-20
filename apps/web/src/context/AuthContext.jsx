import { useEffect, useMemo, useState } from 'react';

import { getCurrentUser, loginUser, logoutUser, registerUser } from '../api/authApi.js';
import {
  clearStoredTokens,
  getStoredTokens,
  setAuthSessionHandlers,
  setStoredTokens,
} from '../api/client.js';

import { AuthContext } from './auth-context.js';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cleanupHandlers = setAuthSessionHandlers({
      onRefresh: (refreshedUser) => setUser(refreshedUser),
      onFailure: () => setUser(null),
    });

    const hydrateUser = async () => {
      const { accessToken, refreshToken } = getStoredTokens();

      if (!accessToken || !refreshToken) {
        clearStoredTokens();
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await getCurrentUser();
        setUser(data);
      } catch {
        // The axios interceptor owns refresh/re-login behaviour. If hydration
        // still fails, the local auth state must not claim the user is signed in.
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    hydrateUser();

    return cleanupHandlers;
  }, []);

  const login = async ({ email, password }) => {
    try {
      const { data } = await loginUser(email, password);
      setStoredTokens(data.tokens);
      setUser(data.user);
      return data.user;
    } catch (error) {
      clearStoredTokens();
      setUser(null);
      throw error;
    }
  };

  const register = async ({ email, password, fullName, acceptTerms }) => {
    const { data } = await registerUser(email, password, fullName, acceptTerms);
    return data;
  };

  const logout = async () => {
    const { refreshToken } = getStoredTokens();

    // Clear the browser session first: logout must never leave usable local
    // credentials behind, even if the API is temporarily unreachable.
    clearStoredTokens();
    setUser(null);

    if (!refreshToken) return;

    try {
      await logoutUser(refreshToken);
    } catch {
      // Server logout is best-effort from the UI perspective. The local
      // session is already gone and the refresh token will expire server-side.
    }
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
