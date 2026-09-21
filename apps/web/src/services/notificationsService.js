import apiClient from '../api/client.js';

export const getNotifications = async ({ page = 1, limit = 10 } = {}) => {
  const { data } = await apiClient.get('/me/notifications', { params: { page, limit } });
  return data;
};

export const markNotificationRead = async (id) => {
  await apiClient.patch(`/me/notifications/${id}/read`);
};

export const markAllNotificationsRead = async () => {
  const { data } = await apiClient.patch('/me/notifications/read-all');
  return data;
};
