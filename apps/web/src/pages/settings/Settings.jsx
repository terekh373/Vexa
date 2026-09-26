import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@vexa/shared';
import { useAuth } from "../../context/auth-context.js";
import { updateProfile, changePassword, uploadAvatar } from '../../api/userApi.js';
import styles from './Settings.module.css';

const Settings = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const [fullName, setFullName] = useState(user?.fullName || user?.name || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [generalPasswordError, setGeneralPasswordError] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

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
      let avatarUrl = user?.avatarUrl;

      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }

      const updatedUser = await updateProfile({
        fullName,
        avatarUrl,
      });

      updateUser(updatedUser || { fullName, avatarUrl });
      setProfileSuccessMsg('Зміни успішно збережено!');
      setAvatarFile(null);
    } catch (error) {
      console.error('Помилка збереження профілю:', error);
      setProfileErrorMsg(error?.response?.data?.message || 'Помилка при оновленні даних профілю');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setCurrentPasswordError('');
    setGeneralPasswordError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setGeneralPasswordError('Нові паролі не збігаються');
      return;
    }

    setIsPasswordLoading(true);

    try {
      const response = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      //204
      if (response.status === 204 || response.status === 200) {
        if (logout) logout();
        navigate(routes.login());
      }
    } catch (error) {
      console.error('Помилка зміни пароля:', error);
      //400
      if (error?.response?.status === 400) {
        setCurrentPasswordError(
          error?.response?.data?.message || 'Невірний поточний пароль або некоректні дані'
        );
      } else {
        setGeneralPasswordError('Не вдалося змінити пароль. Спробуйте пізніше.');
      }
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const initials = (fullName || 'Студент').substring(0, 2).toUpperCase();

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <button 
          className={styles.backBtn} 
          onClick={() => navigate(routes.learning ? routes.learning() : '/profile')}
        >
          ← Назад до кабінету
        </button>

        <div className={styles.layout}>
          <div>
            <h1 className={styles.title}>Налаштування</h1>
            <p className={styles.subtitle}>Керуй параметрами свого акаунта</p>
            <div className={styles.imgWrapper}>
              <img 
                src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=400&q=80" 
                alt="Налаштування" 
                className={styles.illustration}
              />
            </div>
          </div>

          <div className={styles.navCol}>
            <ul className={styles.navList}>
              <li 
                className={activeTab === 'profile' ? styles.activeItem : styles.navItem} 
                onClick={() => setActiveTab('profile')}
              >
                <span className={styles.icon}>⚙️</span> Профіль
              </li>
              <li 
                className={activeTab === 'security' ? styles.activeItem : styles.navItem} 
                onClick={() => setActiveTab('security')}
              >
                <span className={styles.icon}>🛡️</span> Безпека
              </li>
            </ul>
          </div>

          {/* Права колонка (Контент) */}
          <div className={styles.contentCol}>
            {activeTab === 'profile' && (
              <div className={styles.settingsCard}>
                <h2 className={styles.sectionTitle}>Профіль</h2>
                <p className={styles.sectionDesc}>Оновіть своє ім'я та аватар</p>

                {profileSuccessMsg && <div className={styles.successAlert}>{profileSuccessMsg}</div>}
                {profileErrorMsg && <div className={styles.errorAlert}>{profileErrorMsg}</div>}

                <form onSubmit={handleSaveProfile} className={styles.profileForm}>
                  <div className={styles.avatarSection}>
                    <img 
                      src={avatarPreview || `https://ui-avatars.com/api/?name=${initials}&background=6236FF&color=fff&size=100`} 
                      alt="Avatar" 
                      className={styles.avatarPreview} 
                    />
                    <div>
                      <label className={styles.changePhotoBtn}>
                        Змінити фото
                        <input 
                          type="file" 
                          hidden 
                          accept="image/png, image/jpeg, image/webp" 
                          onChange={handleAvatarChange} 
                        />
                      </label>
                      <p className={styles.photoHint}>PNG, JPG або WebP, до 5 МБ</p>
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Ім'я та Прізвище</label>
                    <input 
                      type="text" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      className={styles.input} 
                      required
                    />
                  </div>

                  <div className={styles.formActions}>
                    <button 
                      type="button" 
                      className={styles.cancelBtn} 
                      onClick={() => navigate(-1)}
                    >
                      Скасувати
                    </button>
                    <button 
                      type="submit" 
                      className={styles.saveBtn} 
                      disabled={isProfileLoading}
                    >
                      {isProfileLoading ? 'Збереження...' : 'Зберегти зміни'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className={styles.settingsCard}>
                <h2 className={styles.sectionTitle}>Безпека</h2>
                <p className={styles.sectionDesc}>Змініть пароль для доступу до акаунта</p>

                {generalPasswordError && <div className={styles.errorAlert}>{generalPasswordError}</div>}

                <form onSubmit={handleSavePassword} className={styles.securityForm}>
                  <div className={styles.inputGroup}>
                    <label>Поточний пароль</label>
                    <input 
                      type="password" 
                      value={passwordData.currentPassword} 
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, currentPassword: e.target.value });
                        setCurrentPasswordError('');
                      }} 
                      className={styles.input} 
                      required
                    />
                    {currentPasswordError && (
                      <span className={styles.errorText}>{currentPasswordError}</span>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Новий пароль</label>
                    <input 
                      type="password" 
                      value={passwordData.newPassword} 
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} 
                      className={styles.input} 
                      required 
                      minLength={8}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Підтвердження нового пароля</label>
                    <input 
                      type="password" 
                      value={passwordData.confirmPassword} 
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} 
                      className={styles.input} 
                      required 
                      minLength={8}
                    />
                  </div>

                  <div className={styles.formActions}>
                    <button 
                      type="button" 
                      className={styles.cancelBtn} 
                      onClick={() => {
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setCurrentPasswordError('');
                        setGeneralPasswordError('');
                      }}
                    >
                      Скасувати
                    </button>
                    <button 
                      type="submit" 
                      className={styles.saveBtn} 
                      disabled={isPasswordLoading}
                    >
                      {isPasswordLoading ? 'Зміна пароля...' : 'Змінити пароль'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;