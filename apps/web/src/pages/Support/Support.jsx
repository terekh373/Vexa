
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { sendSupportRequest } from '../../services/supportService.js';
import { useAuth } from '../../context/auth-context.js';

import styles from './Support.module.css';

const EMPTY_FORM = { name: '', email: '', message: '' };

const COMPLAINT_REASONS = [
  'Порушення авторських прав (плагіат)',
  'Заборонений контент',
  'Контент не відповідає опису',
  'Інше',
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = ({ name, email, message }) => {
  const errors = {};

  if (name.length < 2 || name.length > 160) {
    errors.name = "Ім'я має містити від 2 до 160 символів.";
  }

  if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Вкажіть коректну email-адресу.';
  }

  if (message.length < 10 || message.length > 5000) {
    errors.message = 'Повідомлення має містити від 10 до 5000 символів.';
  }

  return errors;
};

const apiFieldErrors = (error) =>
  (error.response?.data?.error?.details ?? []).reduce((result, detail) => {
    if (detail?.field && detail?.message && !result[detail.field]) {
      result[detail.field] = detail.message;
    }
    return result;
  }, {});

const Support = () => {
  const { state } = useLocation();
  const { user } = useAuth();

  const complaint =
    state?.complaint?.courseId &&
    state?.complaint?.courseTitle &&
    state?.complaint?.courseUrl
      ? state.complaint
      : null;

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState(COMPLAINT_REASONS[0]);

  useEffect(() => {
    if (user) {
      setFormData((previous) => ({
        ...previous,
        name: previous.name || user.fullName || user.name || '',
        email: previous.email || user.email || '',
      }));
    }
  }, [user]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));

    setFormError('');
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setFormError('');
    setSuccess(false);

    const name = formData.name.trim();
    const email = formData.email.trim();
    const message = formData.message.trim();

    const complaintDetails = complaint
      ? [
          'Скарга на курс',
          `Причина: ${reason}`,
          `Курс: ${complaint.courseTitle}`,
          `Адреса курсу: ${complaint.courseUrl}`,
          `ID курсу: ${complaint.courseId}`,
          '',
          'Опис:',
          message,
        ].join('\n')
      : message;

    const payload = {
      name,
      email,
      message: complaintDetails,
    };

    const validationErrors = validate(payload);

    if (complaint && (message.length < 10 || message.length > 5000)) {
      validationErrors.message = 'Опис має містити від 10 до 5000 символів.';
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);

    try {
      await sendSupportRequest(payload);

      setFormData({
        name: user?.fullName || user?.name || '',
        email: user?.email || '',
        message: '',
      });

      setReason(COMPLAINT_REASONS[0]);
      setErrors({});
      setSuccess(true);
    } catch (error) {
      const fieldErrors = apiFieldErrors(error);

      if (error.response?.status === 400 && Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      } else if (error.response?.status === 429) {
        setFormError('Забагато звернень. Спробуйте, будь ласка, пізніше.');
      } else {
        setFormError('Не вдалося надіслати звернення. Перевірте з’єднання та спробуйте ще раз.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldProps = (field) => ({
    id: `support-${field}`,
    value: formData[field],
    onChange: handleChange(field),
    'aria-invalid': errors[field] ? 'true' : undefined,
    'aria-describedby': errors[field] ? `support-${field}-error` : undefined,
  });

  const renderError = (field) =>
    errors[field] && (
      <p id={`support-${field}-error`} className={styles.fieldError}>
        {errors[field]}
      </p>
    );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        {complaint ? 'Скарга на курс' : 'Служба підтримки'}
      </h1>

      {complaint && (
        <p className={styles.courseName}>
          Курс: {complaint.courseTitle}
        </p>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.inputGroup}>
          <label htmlFor="support-name">Ваше ім'я</label>
          <input
            type="text"
            className={styles.input}
            autoComplete="name"
            {...fieldProps('name')}
          />
          {renderError('name')}
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="support-email">Email для зв'язку</label>
          <input
            type="email"
            className={styles.input}
            autoComplete="email"
            {...fieldProps('email')}
          />
          {renderError('email')}
        </div>

        {complaint && (
          <div className={styles.inputGroup}>
            <label htmlFor="support-reason">Причина скарги</label>
            <select
              id="support-reason"
              className={styles.input}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setSuccess(false);
              }}
            >
              {COMPLAINT_REASONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.inputGroup}>
          <label htmlFor="support-message">
            {complaint ? 'Опис порушення' : 'Повідомлення'}
          </label>
          <textarea
            className={styles.textarea}
            placeholder={
              complaint
                ? 'Опишіть порушення...'
                : 'Опишіть вашу проблему або питання...'
            }
            {...fieldProps('message')}
          />
          {renderError('message')}
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={submitting}
        >
          {submitting
            ? 'Надсилаємо…'
            : complaint
              ? 'Надіслати скаргу'
              : 'Надіслати'}
        </button>

        {formError && (
          <p role="alert" className={styles.formError}>
            {formError}
          </p>
        )}

        {success && (
          <p role="status" className={styles.formSuccess}>
            {complaint
              ? 'Скаргу надіслано. Адміністрація розгляне її та відповість на вказаний email.'
              : 'Звернення надіслано. Ми відповімо на вказаний email.'}
          </p>
        )}
      </form>
    </div>
  );
};

export default Support;
