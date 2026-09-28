import apiClient from '../api/client.js';

export const getAuthorDashboard = async (period = '30d') => {
  const { data } = await apiClient.get('/author/dashboard', { params: { period } });
  return data;
};

export const getAuthorBalance = async () => {
  const { data } = await apiClient.get('/author/balance');
  return data;
};

export const getAuthorBalanceEntries = async (page = 1, limit = 20) => {
  const { data } = await apiClient.get('/author/balance/entries', {
    params: { page, limit },
  });
  return data;
};

export const getAuthorPayouts = async (page = 1, limit = 20) => {
  const { data } = await apiClient.get('/author/payouts', {
    params: { page, limit },
  });
  return data;
};

export const createAuthorPayout = async (payload) => {
  const { data } = await apiClient.post('/author/payouts', payload);
  return data;
};

export const getAuthorReviews = async (page = 1, limit = 20) => {
  const { data } = await apiClient.get('/author/reviews', {
    params: { page, limit },
  });
  return data;
};

export const replyToAuthorReview = async (reviewId, text) => {
  const { data } = await apiClient.post(`/author/reviews/${reviewId}/reply`, { text });
  return data;
};
