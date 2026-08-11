import { StorageProvider } from '@prisma/client';

const encodeStoragePath = (storageKey: string): string =>
  storageKey
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

export const buildPublicAssetUrl = (file: {
  provider: StorageProvider;
  storageKey: string;
} | null): string | null => {
  if (!file || file.provider !== StorageProvider.S3) {
    return null;
  }

  const baseUrl = process.env.PUBLIC_ASSET_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/${encodeStoragePath(file.storageKey)}`;
};
