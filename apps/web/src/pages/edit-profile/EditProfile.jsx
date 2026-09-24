import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { useAuth } from '../../context/auth-context.js';
import {
  updateProfile,
  uploadAvatar,
} from '../../api/userApi.js';

import styles from './EditProfile.module.css';

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const isAuthor = user?.roles?.includes('AUTHOR');

  const [fullName, setFullName] = useState(
    user?.fullName || user?.name || ''
  );

  const [avatarPreview, setAvatarPreview] = useState(
    user?.avatarUrl || user?.avatar?.url || null
  );

  const [avatarFile, setAvatarFile] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      'image/png',
      'image/jpeg',
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrorMsg('Оберіть файл PNG або JPG');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(
        'Розмір файлу не повинен перевищувати 5 МБ'
      );
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));

    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let avatarFileId;

      if (avatarFile) {
        avatarFileId = await uploadAvatar(avatarFile);
      }

      const profileData = {
        fullName,
      };

      if (avatarFileId) {
        profileData.avatarFileId = avatarFileId;
      }

      const updatedUser = await updateProfile(profileData);

      updateUser(updatedUser);

      setAvatarFile(null);
      setSuccessMsg('Зміни успішно збережено!');
    } catch (error) {
      console.error(
        'Помилка збереження профілю:',
        error
      );

      setErrorMsg(
        error?.response?.data?.message ||
          'Помилка при оновленні даних профілю'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const initials = (fullName || 'U')
    .substring(0, 2)
    .toUpperCase();

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate(routes.learning())}
        >
          ← Назад до кабінету
        </button>

        <div className={styles.layout}>
          <aside className={styles.photoCard}>
            <h2>
              {isAuthor
                ? 'Оновіть особисту інформацію та дані викладача'
                : 'Оновіть особисту інформацію'}
            </h2>

            <div className={styles.avatarWrapper}>
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Фото профілю"
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {initials}
                </div>
              )}
            </div>

            <label className={styles.changePhotoButton}>
              Змінити фото

              <input
                type="file"
                hidden
                accept="image/png,image/jpeg"
                onChange={handleAvatarChange}
              />
            </label>

            <p className={styles.photoHint}>
              PNG або JPG, до 5 МБ
            </p>
          </aside>

          <div className={styles.formCard}>
            <h1>
              {isAuthor
                ? 'Редагувати профіль викладача'
                : 'Редагувати профіль учня'}
            </h1>

            {successMsg && (
              <div className={styles.success}>
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className={styles.error}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              <div className={styles.fields}>
                <label className={styles.field}>
                  <span>Ім’я та Прізвище</span>

                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                    placeholder="Ім’я та Прізвище"
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span>Email</span>

                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                  />
                </label>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => navigate(-1)}
                >
                  Скасувати
                </button>

                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={isLoading}
                >
                  {isLoading
                    ? 'Збереження...'
                    : 'Зберегти зміни'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EditProfile;