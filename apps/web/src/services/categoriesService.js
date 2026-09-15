import apiClient from '../api/client.js';

export const getCategories = async () => {
  const { data } = await apiClient.get('/categories');
  return data.items ?? [];
};
