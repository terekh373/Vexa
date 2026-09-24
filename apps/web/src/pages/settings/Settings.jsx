import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@vexa/shared';
import { useAuth } from "../../context/auth-context.js";
import { updateProfile, uploadAvatar } from '../../api/userApi.js';
import styles from './Settings.module.css';

const Settings = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || user?.name || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setProfileSuccessMsg('');
      setProfileErrorMsg('');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsProfileLoading(true);
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    try {
      const payload = { fullName };

      if (avatarFile) {
        const fileId = await uploadAvatar(avatarFile);
        if (fileId) {
          payload.avatarFileId = fileId;
        }
      }

      const updatedUser = await updateProfile(payload);

      updateUser(updatedUser || { ...user, fullName });
      setProfileSuccessMsg('Зміни успішно збережено!');
      setAvatarFile(null);
    } catch (error) {
      console.error('Помилка збереження профілю:', error);
      
      const details = error?.response?.data?.error?.details;
      if (details && details.length > 0) {
        setProfileErrorMsg(details.map(d => d.message).join(', '));
      } else {
        setProfileErrorMsg(error?.response?.data?.message || 'Помилка при оновленні даних профілю');
      }
    } finally {
      setIsProfileLoading(false);
    }
  };

  const initials = (fullName || 'Студент').substring(0, 2).toUpperCase();
  const defaultAvatar = `https://ui-avatars.com/api/?name=${initials}&background=6236FF&color=fff&size=200`;

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <button 
          className={styles.backButton} 
          onClick={() => navigate(routes.learning ? routes.learning() : '/profile')}
        >
          ← Назад до кабінету
        </button>

        <div className={styles.layout}>
          <div className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Оновіть особисту інформацію та дані викладача</h3>
            
            <div className={styles.avatarWrapper}>
              <img 
                src={avatarPreview || defaultAvatar} 
                alt="Avatar" 
                className={styles.avatar} 
              />
            </div>
            
            <label className={styles.changePhotoButton}>
              Змінити фото
              <input 
                type="file" 
                hidden 
                accept="image/png, image/jpeg, image/webp" 
                onChange={handleAvatarChange} 
              />
            </label>
            <p className={styles.photoHint}>PNG або JPG, до 5 МБ</p>

            {profileSuccessMsg && <div className={styles.successAlert}>{profileSuccessMsg}</div>}
            {profileErrorMsg && <div className={styles.errorAlert}>{profileErrorMsg}</div>}
          </div>

          <div className={styles.formSection}>
            <h2 className={styles.formTitle}>Редагувати профіль учня</h2>
            
            <form className={styles.form} onSubmit={handleSaveProfile}>
              <input 
                type="text" 
                placeholder="Ім'я та Прізвище" 
                className={styles.input} 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <input type="tel" placeholder="Номер телефону" className={styles.input} />
              <input type="email" placeholder="Email" className={styles.input} defaultValue={user?.email || ''} readOnly />
              <input type="text" placeholder="Дата народження" className={styles.input} />
              <input type="text" placeholder="Клас" className={styles.input} />
              <input type="text" placeholder="Навчальний заклад" className={styles.input} />
              <input type="text" placeholder="Навчальні цілі" className={styles.input} />

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
                  disabled={isProfileLoading}
                >
                  {isProfileLoading ? 'Збереження...' : 'Зберегти зміни'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;