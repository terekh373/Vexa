import apiClient from '../api/client.js';

export const getCourseSuggestions = async (q) => {
  const { data } = await apiClient.get('/courses/suggest', {
    params: { q },
  });

  return Array.isArray(data?.items) ? data.items : [];
};

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

export const getCourses = async (params = {}) => {
  const { data } = await apiClient.get('/courses', { params });
  return data;
};

export const getCategories = async () => {
  const { data } = await apiClient.get('/categories');
  return data;
};

export const getCourseReviews = async (id, page = 1, limit = 10) => {
  const { data } = await apiClient.get(`/courses/${id}/reviews`, {
    params: { page, limit },
  });

  return data;
};

export const createCourseReview = async (id, payload) => {
  const { data } = await apiClient.post(`/courses/${id}/reviews`, payload);
  return data;
};

export const updateMyCourseReview = async (id, payload) => {
  const { data } = await apiClient.patch(`/courses/${id}/reviews/my`, payload);
  return data;
};

export const getCoursesCountByCategory = async (category) => {
  const { data } = await apiClient.get('/courses', {
    params: {
      category,
      page: 1,
      limit: 1,
    },
  });

  return data.total ?? 0;
};
