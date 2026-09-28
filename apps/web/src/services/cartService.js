import apiClient from "../api/client";

export const getCart = async () => {
  const { data } = await apiClient.get('/cart');
  return data;
};

export const addToCart = async (courseId) => {
  const { data } = await apiClient.post('/cart/items', { courseId });
  return data;
};

export const removeFromCart = async (courseId) => {
  const { data } = await apiClient.delete(`/cart/items/${courseId}`);
  return data;
};