import React, { useState } from 'react';
import { sendSupportRequest } from '../../services/supportService.js';
import styles from './Support.module.css';

const EMPTY_FORM = { name: '', email: '', message: '' };
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
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccess(false);

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      message: formData.message.trim(),
    };
    const validationErrors = validate(payload);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await sendSupportRequest(payload);
      setFormData(EMPTY_FORM);
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
      <h1 className={styles.title}>Служба підтримки</h1>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.inputGroup}>
          <label htmlFor="support-name">Ваше ім'я</label>
          <input type="text" className={styles.input} autoComplete="name" {...fieldProps('name')} />
          {renderError('name')}
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="support-email">Email для зв'язку</label>
          <input type="email" className={styles.input} autoComplete="email" {...fieldProps('email')} />
          {renderError('email')}
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="support-message">Повідомлення</label>
          <textarea
            className={styles.textarea}
            placeholder="Опишіть вашу проблему або питання..."
            {...fieldProps('message')}
          />
          {renderError('message')}
        </div>

        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? 'Надсилаємо…' : 'Надіслати'}
        </button>

        {formError && (
          <p role="alert" className={styles.formError}>
            {formError}
          </p>
        )}
        {success && (
          <p role="status" className={styles.formSuccess}>
            Звернення надіслано. Ми відповімо на вказаний email.
          </p>
        )}
      </form>
    </div>
  );
};

export default Support;
