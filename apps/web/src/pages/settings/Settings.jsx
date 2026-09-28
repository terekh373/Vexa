import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@vexa/shared';
import { changePassword, updateProfile, uploadAvatar } from '../../api/userApi.js';
import VerificationBanner from '../../components/auth/VerificationBanner/VerificationBanner.jsx';

import styles from './Settings.module.css';
import SettingsIcon from '../../assets/icons/user/settings.svg';
import BellIcon from '../../assets/icons/user/bell.svg';
import SafetyIcon from '../../assets/icons/user/safe.svg';
import PrivateIcon from '../../assets/icons/user/private.svg';
import { useAuth } from '../../context/auth-context.js';

const Settings = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState('profile');

  // --- Profile State ---
  const [fullName, setFullName] = useState(user?.fullName || user?.name || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // --- Security State ---
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [generalPasswordError, setGeneralPasswordError] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // --- Profile Handlers ---
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

  // --- Security Handlers ---
  const handleChange = (event) => {
    const { name, value } = event.target;

    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setCurrentPasswordError('');
    setGeneralPasswordError('');
  };

  const handleSavePassword = async (event) => {
    event.preventDefault();
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

      if (response.status === 204 || response.status === 200) {
        await logout();
        navigate(routes.login(), {
          replace: true,
          state: { passwordChanged: true },
        });
      }
      
    } catch (error) {
      console.error('Помилка зміни пароля:', error);
      if (error?.response?.status === 400) {
        setCurrentPasswordError(
          error?.response?.data?.message || 'Невірний поточний пароль'
        );
      } else {
        setGeneralPasswordError('Не вдалося змінити пароль. Спробуйте пізніше.');
      }
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleCancel = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setCurrentPasswordError('');
    setGeneralPasswordError('');
  };

  const initials = (fullName || 'Студент').substring(0, 2).toUpperCase();

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

        <h1 className={styles.pageTitle}>
          Налаштування
        </h1>

        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <h2>
              Керуй параметрами свого акаунта
            </h2>

            <nav className={styles.nav}>
              <button type="button" disabled>
                <img src={SettingsIcon} alt='' />
                <span>Загальні</span>
              </button>

              <button type="button" disabled>
                <img src={BellIcon} alt='' />
                <span>Сповіщення</span>
              </button>

              <button
                type="button"
                className={activeTab === 'profile' ? styles.active : ''}
                onClick={() => setActiveTab('profile')}
              >
                <span className={styles.icon}>⚙️</span> 
                <span>Профіль</span>
              </button>

              <button
                type="button"
                className={activeTab === 'security' ? styles.active : ''}
                onClick={() => setActiveTab('security')}
              >
                <img src={SafetyIcon} alt='' />
                <span>Безпека</span>
              </button>

              <button type="button" disabled>
                <img src={PrivateIcon} alt='' />
                <span>Приватність</span>              
              </button>
            </nav>
          </aside>

          <main className={styles.content}>
            {activeTab === 'profile' && (
              <>
                <h2>Профіль</h2>
                <p className={styles.description}>Оновіть своє ім'я та аватар</p>

                <VerificationBanner inline={true} />

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
                    <label className={styles.field}>
                      <span>Ім'я та Прізвище</span>
                      <input 
                        type="text" 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)} 
                        required
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
                      disabled={isProfileLoading}
                    >
                      {isProfileLoading ? 'Збереження...' : 'Зберегти зміни'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {activeTab === 'security' && (
              <>
                <h2>Безпека</h2>
                <p className={styles.description}>Змініть пароль для захисту акаунта</p>

                {generalPasswordError && (
                  <div className={styles.error}>
                    {generalPasswordError}
                  </div>
                )}

                <form onSubmit={handleSavePassword} className={styles.form}>
                  <label className={styles.field}>
                    <span>Поточний пароль</span>
                    <input
                      name="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={handleChange}
                      required
                      autoComplete="current-password"
                    />
                    {currentPasswordError && (
                      <small className={styles.errorText}>
                        {currentPasswordError}
                      </small>
                    )}
                  </label>

                  <label className={styles.field}>
                    <span>Новий пароль</span>
                    <input
                      name="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={handleChange}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </label>

                  <label className={styles.field}>
                    <span>Підтвердження нового пароля</span>
                    <input
                      name="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={handleChange}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </label>

                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.cancelButton}
                      onClick={handleCancel}
                    >
                      Скасувати
                    </button>

                    <button
                      type="submit"
                      className={styles.saveButton}
                      disabled={isPasswordLoading}
                    >
                      {isPasswordLoading ? 'Зміна пароля...' : 'Змінити пароль'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </main>
        </div>
      </div>
    </section>
  );
};

export default Settings;