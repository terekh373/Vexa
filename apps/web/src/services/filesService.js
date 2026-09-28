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

// Kept apart from UPLOAD_POLICY so useFileUpload('VIDEO') cannot exist: video
// goes through its own Stream flow. Mirrors VIDEO_UPLOAD_POLICY from
// apps/api/src/modules/files/files.validation.ts.
const VIDEO_UPLOAD_POLICY = {
  mimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
  maxSizeBytes: 200 * MB,
};

export const ATTACHMENT_ACCEPT = UPLOAD_POLICY.ATTACHMENT.mimeTypes.join(',');
export const VIDEO_ACCEPT = VIDEO_UPLOAD_POLICY.mimeTypes.join(',');

const checkAgainstPolicy = (file, policy, typeMessage) => {
  if (!policy.mimeTypes.includes(file.type)) {
    return typeMessage;
  }

  if (file.size > policy.maxSizeBytes) {
    return `Файл завеликий. Максимум ${policy.maxSizeBytes / MB} МБ.`;
  }

  return null;
};

// Client-side check only saves a wasted upload — the server re-validates the
// same policy at upload-url time and storage enforces it again on PUT.
export const validateFileForUpload = (file, kind) =>
  checkAgainstPolicy(file, UPLOAD_POLICY[kind], 'Цей тип файлу не підтримується.');

export const validateVideoForUpload = (file) =>
  checkAgainstPolicy(file, VIDEO_UPLOAD_POLICY, 'Підтримуються лише відео MP4, MOV або WebM.');

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

// Video bypasses the API: the bytes go straight to Cloudflare Stream.
export const uploadVideo = async (file, onProgress) => {
  const { data: target } = await apiClient.post('/files/video-upload-url', {
    originalName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });

  const form = new FormData();
  form.append('file', file);

  // Bare axios, not apiClient: uploadUrl is single-use and signed by Stream, so
  // Authorization and apiClient's 401 interceptor have no place here. No
  // Content-Type either — the browser has to set the multipart boundary. axios
  // rather than fetch because fetch cannot report upload progress; the request
  // itself is the same.
  await axios.post(target.uploadUrl, form, {
    onUploadProgress: (event) => {
      if (!event.total) return;
      onProgress?.(Math.round((event.loaded * 100) / event.total));
    },
  });

  return target.fileId;
};

// 202 means Stream is still processing the video; 200 means it is ready.
export const confirmVideo = async (fileId) => {
  const response = await apiClient.post(`/files/${fileId}/confirm`);
  return { ready: response.status === 200, file: response.data.file };
};

export const getFileDownloadUrl =async (fileId) => {
  const { data } = await apiClient.get(`/files/${fileId}/download-url`);
  return data.downloadUrl;
};
