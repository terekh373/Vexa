import apiClient from "../api/client";

export const createOrder = async () => {
  const { data } = await apiClient.post('/orders');
  return data;
};

export const getOrders = async (page = 1, limit = 20) => {
  const { data } = await apiClient.get('/me/orders', {
    params: { page, limit },
  });

  return data;
};

export const getOrder = async (orderId) => {
  const { data } = await apiClient.get(`/me/orders/${orderId}`);
  return data;
};

export const startCheckout = async (orderId) => {
  const { data } = await apiClient.post(
    `/orders/${orderId}/checkout`
  );

  return data;
};