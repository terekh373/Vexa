// import { apiClient } from './client.js';

// export const registerUser = (email, password, fullName) => {
//   return apiClient.post('/auth/register', { email, password, fullName });
// };

// export const loginUser = (email, password) => {
//   return apiClient.post('/auth/login', { email, password });
// };

// export const getMe = () => {
//   return apiClient.get('/auth/me');
// };

// export const verifyEmailApi = (token) => {
//   return apiClient.get(`/auth/verify-email?token=${token}`);
// };

// тимчасово без бекенду

export const registerUser = async (email, password, fullName) => {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const mockData = {
    user: {
      id: 'mock-user-1',
      fullName: fullName || 'Користувач',
      email,
      role: 'student',
    },
    accessToken: 'mock_access_token_jwt',
    refreshToken: 'mock_refresh_token_jwt',
  };

  localStorage.setItem('vexa_access', mockData.accessToken);
  localStorage.setItem('vexa_refresh', mockData.refreshToken);

  return { data: mockData };
};

export const loginUser = async (email, password) => {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const mockData = {
    user: {
      id: 'mock-user-1',
      fullName: 'Користувач',
      email,
      role: 'student',
    },
    accessToken: 'mock_access_token_jwt',
    refreshToken: 'mock_refresh_token_jwt',
  };

  localStorage.setItem('vexa_access', mockData.accessToken);
  localStorage.setItem('vexa_refresh', mockData.refreshToken);

  return { data: mockData };
};

export const getMe = async () => {
  await new Promise((resolve) => setTimeout(resolve, 200));

  return {
    data: {
      id: 'mock-user-1',
      fullName: 'Користувач',
      email: 'user@example.com',
      role: 'student',
    },
  };
};

export const verifyEmailApi = async (token) => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return { data: { success: true } };
};