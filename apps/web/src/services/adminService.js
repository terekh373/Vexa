import apiClient from '../api/client.js';

export const listAdminCourses = async (params = {}) => {
  const { data } = await apiClient.get('/admin/courses', { params });
  return data;
};

export const getAdminCourse = async (id) => {
  const { data } = await apiClient.get(`/admin/courses/${id}`);
  return data;
};

export const moderateAdminCourse = async (id, payload) => {
  const { data } = await apiClient.post(`/admin/courses/${id}/moderate`, payload);
  return data;
};

export const unpublishAdminCourse = async (id, comment) => {
  const { data } = await apiClient.post(`/admin/courses/${id}/unpublish`, { comment });
  return data;
};

export const listAdminUsers = async (params = {}) => {
  const { data } = await apiClient.get('/admin/users', { params });
  return data;
};

export const updateAdminUserStatus = async (id, status) => {
  const { data } = await apiClient.patch(`/admin/users/${id}/status`, { status });
  return data;
};

export const verifyAdminAuthor = async (id, isVerified) => {
  const { data } = await apiClient.patch(`/admin/users/${id}/verify-author`, { isVerified });
  return data;
};

export const listAdminCategories = async () => {
  const { data } = await apiClient.get('/admin/categories');
  return data.items ?? [];
};

export const createAdminCategory = async (payload) => {
  const { data } = await apiClient.post('/admin/categories', payload);
  return data;
};

export const updateAdminCategory = async (id, payload) => {
  const { data } = await apiClient.patch(`/admin/categories/${id}`, payload);
  return data;
};

export const deleteAdminCategory = async (id) => {
  await apiClient.delete(`/admin/categories/${id}`);
};
