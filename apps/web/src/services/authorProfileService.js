import apiClient from '../api/client.js';

export const activateAuthorProfile = async (payload) => {
  const { data } = await apiClient.post('/me/author-profile', payload);
  return data;
};

export const updateAuthorProfile = async (payload) => {
  const { data } = await apiClient.patch('/me/author-profile', payload);
  return data;
};

export const getPublicAuthorProfile = async (id) => {
  try {
    const { data } = await apiClient.get(`/authors/${id}`, {
      skipAuthRefresh: true,
      skipAuthHeader: true,
    });
    return data;
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 400) {
      return null;
    }
    throw error;
  }
};
