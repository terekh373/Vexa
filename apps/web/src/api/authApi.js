import { apiClient } from './client.js';

export const registerUser = (email, password, fullName) => {
  return apiClient.post('/auth/register', { email, password, fullName });
};

export const loginUser = (email, password) => {
  return apiClient.post('/auth/login', { email, password });
};

export const getMe = () => {
  return apiClient.get('/auth/me');
};

export const verifyEmailApi = (token) => {
  return apiClient.get(`/auth/verify-email?token=${token}`);
};