import apiClient from '../api/client.js';

export const getCurriculum = async () => {
  const { data } = await apiClient.get('/curriculum');
  return Array.isArray(data?.items) ? data.items : [];
};
