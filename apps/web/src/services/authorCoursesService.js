import apiClient from '../api/client.js';

const withCoverUrl = async (course) => {
  if (course.coverUrl || !course.coverFileId) return course;

  try {
    const { data } = await apiClient.get(`/files/${course.coverFileId}/download-url`);
    return { ...course, coverUrl: data.downloadUrl ?? null };
  } catch {
    // A missing/pending cover must not make the whole author cabinet unusable.
    return { ...course, coverUrl: null };
  }
};

export const getAuthorCourses = async (status) => {
  const { data } = await apiClient.get('/author/courses', {
    params: status ? { status } : undefined,
  });

  const items = data.items ?? [];
  return Promise.all(items.map(withCoverUrl));
};

export const deleteAuthorCourse = async (courseId) => {
  await apiClient.delete(`/author/courses/${courseId}`);
};
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

export const unpublishAuthorCourse = async (id) => {
  const { data } = await apiClient.post(`/author/courses/${id}/unpublish`);
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
