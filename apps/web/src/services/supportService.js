import apiClient from '../api/client.js';

export const sendSupportRequest = async ({ name, email, message }) => {
  await apiClient.post(
    '/support/contact',
    { name, email, message },
    { skipAuthRefresh: true, skipAuthHeader: true },
  );
};
