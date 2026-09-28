import { useState } from 'react';

import {
  attachMaterialFile,
  deleteMaterialFile,
  renameMaterialFile,
  reorderMaterialFiles,
} from '../../../services/authorCoursesService.js';

const TITLE_MAX_LENGTH = 180;

const NOT_EDITABLE = 'Матеріал зараз не можна редагувати.';

// The server only accepts a title of 1..180 characters, so derive one from the
// file name: drop the extension, and fall back to the raw name when nothing
// is left (e.g. a dotfile).
const titleFromFileName = (originalName) => {
  const withoutExtension = originalName.replace(/\.[^.]+$/, '').trim().slice(0, TITLE_MAX_LENGTH);
  return withoutExtension || originalName.slice(0, TITLE_MAX_LENGTH);
};

const errorMessage = (error, fallback) => {
  const status = error.response?.status;

  if (status === 409) return NOT_EDITABLE;
  if (status === 400) {
    return error.response.data?.error?.details?.[0]?.message ?? fallback;
  }
  return fallback;
};

export const useMaterialFiles = (courseId) => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  const attach = async (fileDto) => {
    setError('');
    try {
      const created = await attachMaterialFile(courseId, {
        fileId: fileDto.id,
        title: titleFromFileName(fileDto.originalName),
      });
      setFiles((current) => [...current, created]);
    } catch (attachError) {
      setError(errorMessage(attachError, 'Не вдалося додати файл до матеріалу. Спробуйте ще раз.'));
    }
  };

  const rename = async (courseFileId, title) => {
    setError('');
    const trimmed = title.trim();
    if (!trimmed) return false;

    try {
      const updated = await renameMaterialFile(courseId, courseFileId, trimmed);
      setFiles((current) => current.map((entry) => (entry.id === courseFileId ? updated : entry)));
      return true;
    } catch (renameError) {
      setError(errorMessage(renameError, 'Не вдалося перейменувати файл.'));
      return false;
    }
  };

  const remove = async (courseFileId) => {
    setError('');
    try {
      await deleteMaterialFile(courseId, courseFileId);
      setFiles((current) => current.filter((entry) => entry.id !== courseFileId));
    } catch (removeError) {
      setError(errorMessage(removeError, 'Не вдалося видалити файл.'));
    }
  };

  // Optimistic, like the curriculum reorder: show the new order at once and
  // roll back on failure. On success the server's answer wins.
  const move = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= files.length) return;

    const previous = files;
    const next = [...files];
    [next[index], next[target]] = [next[target], next[index]];

    setError('');
    setFiles(next);

    try {
      const saved = await reorderMaterialFiles(
        courseId,
        next.map((entry, position) => ({ id: entry.id, sortOrder: position })),
      );
      setFiles(saved);
    } catch (moveError) {
      setFiles(previous);
      setError(errorMessage(moveError, 'Не вдалося зберегти порядок. Спробуйте ще раз.'));
    }
  };

  return { files, setFiles, error, attach, rename, remove, move };
};
