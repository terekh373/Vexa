import axios from 'axios';

import apiClient from '../api/client.js';

const MB = 1024 * 1024;

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg'];
const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
];

// Mirrors apps/api UPLOAD_POLICY (docs/frontend-api-map.md, "Файли"). Kept in
// sync by hand since the policy is not exported from @vexa/shared.
const UPLOAD_POLICY = {
  COVER: { mimeTypes: IMAGE_MIME_TYPES, maxSizeBytes: 5 * MB },
  AVATAR: { mimeTypes: IMAGE_MIME_TYPES, maxSizeBytes: 5 * MB },
  ATTACHMENT: { mimeTypes: [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES], maxSizeBytes: 100 * MB },
};

// Client-side check only saves a wasted upload — the server re-validates the
// same policy at upload-url time and storage enforces it again on PUT.
export const validateFileForUpload = (file, kind) => {
  const policy = UPLOAD_POLICY[kind];

  if (!policy.mimeTypes.includes(file.type)) {
    return 'Цей тип файлу не підтримується.';
  }

  if (file.size > policy.maxSizeBytes) {
    return `Файл завеликий. Максимум ${policy.maxSizeBytes / MB} МБ.`;
  }

  return null;
};

// The three-step upload dance shared by covers, avatars and attachments:
// ask for a signed URL, PUT the bytes, then confirm. If the PUT fails the
// file must never be confirmed — it stays unusable and the caller shows a
// retry affordance.
export const uploadFile = async (file, kind, onProgress) => {
  const { data: target } = await apiClient.post('/files/upload-url', {
    kind,
    originalName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });

  // Bare axios, not apiClient: the signed URL's signature already covers the
  // request, an Authorization header would invalidate it, and apiClient's
  // 401 interceptor would otherwise try to refresh the session against
  // object storage.
  await axios.put(target.uploadUrl, file, {
    headers: { 'Content-Type': file.type },
    onUploadProgress: (event) => {
      if (!event.total) return;
      onProgress?.(Math.round((event.loaded * 100) / event.total));
    },
  });

  const { data } = await apiClient.post(`/files/${target.fileId}/confirm`);
  return data.file;
};

export const getFileDownloadUrl = async (fileId) => {
  const { data } = await apiClient.get(`/files/${fileId}/download-url`);
  return data.downloadUrl;
};
