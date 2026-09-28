// import apiClient from './client.js';

// export const updateProfile = async (data) => {
//   const response = await apiClient.patch('/api/me', data);
//   return response.data;
// };


// export const changePassword = async ({ currentPassword, newPassword }) => {
//   return await apiClient.post('/api/me/password', {
//     currentPassword,
//     newPassword,
//   });
// };

// export const uploadAvatar = async (file) => {
//   const { data } = await apiClient.post('/api/files/upload-url', {
//     filename: file.name,
//     contentType: file.type,
//     sizeBytes: file.size,
//     kind: 'AVATAR',
//   });

//   const { uploadUrl, publicUrl, fileUrl, fileKey } = data;

//   const uploadResponse = await fetch(uploadUrl, {
//     method: 'PUT',
//     headers: {
//       'Content-Type': file.type,
//     },
//     body: file,
//   });

//   if (!uploadResponse.ok) {
//     throw new Error('Не вдалося завантажити файл аватара');
//   }

//   return publicUrl || fileUrl || fileKey;
// };

// export const forgotPasswordRequest = async (email) => {
//   return await apiClient.post('/api/auth/forgot-password', { email });
// };

// export const resetPasswordRequest = async (token, newPassword) => {
//   return await apiClient.post('/api/auth/reset-password', { token, newPassword });
// };

import apiClient from './client.js';

export const updateProfile = async (data) => {
  const response = await apiClient.patch('/me', data);

  return response.data;
};

export const changePassword = async ({
  currentPassword,
  newPassword,
}) => {
  return apiClient.post('/me/password', {
    currentPassword,
    newPassword,
  });
};

export const uploadAvatar = async (file) => {
  // 1. Получаем signed URL
  const { data } = await apiClient.post(
    '/files/upload-url',
    {
      kind: 'AVATAR',
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    }
  );

  const { fileId, uploadUrl } = data;

  // 2. Загружаем сам файл напрямую в storage
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',

    headers: {
      'Content-Type': file.type,
    },

    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      'Не вдалося завантажити файл аватара'
    );
  }

  // 3. Подтверждаем загрузку
  await apiClient.post(
    `/files/${fileId}/confirm`
  );

  return fileId;
};

export const forgotPasswordRequest = async (email) => {
  return apiClient.post(
    '/auth/forgot-password',
    {
      email,
    }
  );
};

export const resetPasswordRequest = async (
  token,
  newPassword
) => {
  return apiClient.post(
    '/auth/reset-password',
    {
      token,
      password: newPassword,
    }
  );
};