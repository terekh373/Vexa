import apiClient from '../api/client.js';

export const fetchCatalog = async (query = {}) => {
  const { data } = await apiClient.get('/courses', {
    params: query,
  });

  return data;
};

export const getCourse = async (idOrSlug) => {
  try {
    const { data } = await apiClient.get(`/courses/${idOrSlug}`);
    return data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }

    throw error;
  }
};

export const getCourses = async () => {
  const { data } = await apiClient.get('/courses');
  return data;
};

export const getCourseReviews = async (id, page = 1, limit = 10) => {
  const { data } = await apiClient.get(`/courses/${id}/reviews`, {
    params: { page, limit },
  });

  return data;
};