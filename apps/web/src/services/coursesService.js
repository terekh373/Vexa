import { apiClient } from '../api/config.js';

export const fetchCatalog = async (query = {}) => {
  const response = await apiClient.get('/courses', {
    params: query,
  });

  return response.data;
};

export const getCourse = async (idOrSlug) => {
  try {
    const response = await apiClient.get(`/courses/${idOrSlug}`);
    return response.data;
  }
  catch (error) {
    if (error.response?.status === 404) {
      return null;
    }

    throw error;
  }
};

export const getCourseReviews = async (id, page = 1, limit = 10) => {
  const response = await apiClient.get(`/courses/${id}/reviews`, {
    params: { page, limit },
  });

  return response.data;
};
