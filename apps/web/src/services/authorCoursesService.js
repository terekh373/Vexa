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

export const createAuthorModule = async (courseId, payload) => {
  const { data } = await apiClient.post(`/author/courses/${courseId}/modules`, payload);
  return data;
};

export const updateAuthorModule = async (moduleId, patch) => {
  const { data } = await apiClient.patch(`/author/modules/${moduleId}`, patch);
  return data;
};

export const deleteAuthorModule = async (moduleId) => {
  await apiClient.delete(`/author/modules/${moduleId}`);
};

export const createAuthorLesson = async (moduleId, payload) => {
  const { data } = await apiClient.post(`/author/modules/${moduleId}/lessons`, payload);
  return data;
};

export const updateAuthorLesson = async (lessonId, patch) => {
  const { data } = await apiClient.patch(`/author/lessons/${lessonId}`, patch);
  return data;
};

export const deleteAuthorLesson = async (lessonId) => {
  await apiClient.delete(`/author/lessons/${lessonId}`);
};

export const reorderAuthorCourse = async (courseId, payload) => {
  const { data } = await apiClient.patch(`/author/courses/${courseId}/reorder`, payload);
  return data;
};
