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
