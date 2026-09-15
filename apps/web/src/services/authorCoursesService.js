import apiClient from '../api/client.js';

export const createAuthorCourse = async (payload) => {
  const { data } = await apiClient.post('/author/courses', payload);
  return data;
};

export const getAuthorCourse = async (id) => {
  const { data } = await apiClient.get(`/author/courses/${id}`);
  return data;
};

export const updateAuthorCourse = async (id, patch) => {
  const { data } = await apiClient.patch(`/author/courses/${id}`, patch);
  return data;
};

export const submitAuthorCourse = async (id) => {
  const { data } = await apiClient.post(`/author/courses/${id}/submit`);
  return data;
};
