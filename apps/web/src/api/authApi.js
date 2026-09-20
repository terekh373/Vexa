import apiClient from './client.js';

export const registerUser = (email, password, fullName) =>
  apiClient.post(
    '/auth/register',
    { email, password, fullName },
    { skipAuthRefresh: true, skipAuthHeader: true },
  );

export const loginUser = (email, password) =>
  apiClient.post(
    '/auth/login',
    { email, password },
    { skipAuthRefresh: true, skipAuthHeader: true },
  );

export const getCurrentUser = () => apiClient.get('/auth/me');

export const logoutUser = (refreshToken) =>
  apiClient.post(
    '/auth/logout',
    { refreshToken },
    { skipAuthRefresh: true, skipAuthHeader: true },
  );

export const verifyEmail = (token) =>
  apiClient.get('/auth/verify-email', {
    params: { token },
    skipAuthRefresh: true,
    skipAuthHeader: true,
  });

export const forgotPasswordRequest = async (email) => {
  return await apiClient.post('/api/auth/forgot-password', { email });
};

export const resetPasswordRequest = async (token, newPassword) => {
  return await apiClient.post('/api/auth/reset-password', { token, newPassword });
};
