import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@vexa/shared';
import { changePassword } from '../../api/userApi.js';

import styles from './Settings.module.css';
import SettingsIcon from '../../assets/icons/user/settings.svg';
import BellIcon from '../../assets/icons/user/bell.svg';
import SafetyIcon from '../../assets/icons/user/safe.svg';
import PrivateIcon from '../../assets/icons/user/private.svg';

const Settings = () => {
  const navigate = useNavigate();

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [currentPasswordError, setCurrentPasswordError] =
    useState('');

  const [generalPasswordError, setGeneralPasswordError] =
    useState('');

  const [isLoading, setIsLoading] = useState(false);

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

    if (
      passwordData.newPassword !==
      passwordData.confirmPassword
    ) {
      setGeneralPasswordError(
        'Нові паролі не збігаються'
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (
        response.status === 204 ||
        response.status === 200
      ) {
        navigate(routes.login(), {
          replace: true,
          state: { passwordChanged: true },
        });

        logout?.();
      }
      
    } catch (error) {
      console.error(
        'Помилка зміни пароля:',
        error
      );

      if (error?.response?.status === 400) {
        setCurrentPasswordError(
          error?.response?.data?.message ||
            'Невірний поточний пароль'
        );
      } else {
        setGeneralPasswordError(
          'Не вдалося змінити пароль. Спробуйте пізніше.'
        );
      }
    } finally {
      setIsLoading(false);
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
                className={styles.active}
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
            <h2>Безпека</h2>

            <p className={styles.description}>
              Змініть пароль для захисту акаунта
            </p>

            {generalPasswordError && (
              <div className={styles.error}>
                {generalPasswordError}
              </div>
            )}

            <form
              onSubmit={handleSavePassword}
              className={styles.form}
            >
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
                <span>
                  Підтвердження нового пароля
                </span>

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
                  disabled={isLoading}
                >
                  {isLoading
                    ? 'Зміна пароля...'
                    : 'Змінити пароль'}
                </button>
              </div>
            </form>
          </main>
        </div>
      </div>
    </section>
  );
};

export default Settings;