import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  updateAdminCategory,
} from '../../services/adminService.js';
import styles from './Admin.module.css';

const emptyForm = {
  slug: '',
  nameUk: '',
  nameEn: '',
  iconKey: '',
  parentId: '',
  sortOrder: '0',
  isActive: true,
};

const toPayload = (form) => ({
  slug: form.slug.trim(),
  nameUk: form.nameUk.trim(),
  nameEn: form.nameEn.trim() || null,
  iconKey: form.iconKey.trim() || null,
  parentId: form.parentId || null,
  sortOrder: Number(form.sortOrder) || 0,
  isActive: Boolean(form.isActive),
});

const formFromCategory = (category) => ({
  slug: category.slug || '',
  nameUk: category.nameUk || '',
  nameEn: category.nameEn || '',
  iconKey: category.iconKey || '',
  parentId: category.parentId || '',
  sortOrder: String(category.sortOrder ?? 0),
  isActive: Boolean(category.isActive),
});

const fieldErrorsFrom = (requestError) => {
  const details = requestError.response?.data?.error?.details;
  const errors = {};
  if (Array.isArray(details)) {
    details.forEach((detail) => {
      if (detail?.field && !errors[detail.field]) errors[detail.field] = detail.message;
    });
  }
  if (requestError.response?.status === 409 && requestError.response?.data?.error?.message?.toLowerCase().includes('slug')) {
    errors.slug = 'Цей слаг уже використовується.';
  }
  return errors;
};

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState({});
  const [rowBusy, setRowBusy] = useState('');

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCategories(await listAdminCategories());
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Не вдалося завантажити категорії.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const rootCategories = useMemo(
    () => categories.filter((category) => category.parentId === null && category.id !== editingId),
    [categories, editingId],
  );

  const changeField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
    setFormError('');
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFieldErrors({});
    setFormError('');
  };

  const startEdit = (category) => {
    setEditingId(category.id);
    setForm(formFromCategory(category));
    setFieldErrors({});
    setFormError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setFormError('');
    try {
      const payload = toPayload(form);
      if (editingId) await updateAdminCategory(editingId, payload);
      else await createAdminCategory(payload);
      resetForm();
      await loadCategories();
    } catch (requestError) {
      const errors = fieldErrorsFrom(requestError);
      setFieldErrors(errors);
      if (Object.keys(errors).length === 0) {
        setFormError(requestError.response?.data?.error?.message || 'Не вдалося зберегти категорію.');
      }
    } finally {
      setSaving(false);
    }
  };

  const runRowAction = async (categoryId, action) => {
    setRowBusy(categoryId);
    setRowError((current) => ({ ...current, [categoryId]: '' }));
    try {
      await action();
      await loadCategories();
    } catch (requestError) {
      setRowError((current) => ({
        ...current,
        [categoryId]: requestError.response?.data?.error?.message || 'Не вдалося виконати дію.',
      }));
    } finally {
      setRowBusy('');
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <div>
          <h2>Категорії</h2>
          <p>Створення, редагування, приховування й видалення категорій каталогу.</p>
        </div>
      </div>

      <form className={styles.categoryForm} onSubmit={saveCategory}>
        <div className={styles.formTitleRow}>
          <h3>{editingId ? 'Редагування категорії' : 'Нова категорія'}</h3>
          {editingId && <button type="button" className={styles.textButton} onClick={resetForm}>Скасувати редагування</button>}
        </div>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Назва українською *</span>
            <input value={form.nameUk} onChange={(event) => changeField('nameUk', event.target.value)} required maxLength={120} />
            {fieldErrors.nameUk && <small className={styles.fieldError}>{fieldErrors.nameUk}</small>}
          </label>
          <label className={styles.field}>
            <span>Слаг *</span>
            <input value={form.slug} onChange={(event) => changeField('slug', event.target.value)} required maxLength={120} placeholder="matematyka" />
            {fieldErrors.slug && <small className={styles.fieldError}>{fieldErrors.slug}</small>}
          </label>
          <label className={styles.field}>
            <span>Назва англійською</span>
            <input value={form.nameEn} onChange={(event) => changeField('nameEn', event.target.value)} maxLength={120} />
            {fieldErrors.nameEn && <small className={styles.fieldError}>{fieldErrors.nameEn}</small>}
          </label>
          <label className={styles.field}>
            <span>Ключ іконки</span>
            <input value={form.iconKey} onChange={(event) => changeField('iconKey', event.target.value)} maxLength={64} />
            {fieldErrors.iconKey && <small className={styles.fieldError}>{fieldErrors.iconKey}</small>}
          </label>
          <label className={styles.field}>
            <span>Батьківська категорія</span>
            <select value={form.parentId} onChange={(event) => changeField('parentId', event.target.value)}>
              <option value="">Немає (коренева)</option>
              {rootCategories.map((category) => <option key={category.id} value={category.id}>{category.nameUk}</option>)}
            </select>
            {fieldErrors.parentId && <small className={styles.fieldError}>{fieldErrors.parentId}</small>}
          </label>
          <label className={styles.field}>
            <span>Порядок</span>
            <input type="number" min="0" max="10000" value={form.sortOrder} onChange={(event) => changeField('sortOrder', event.target.value)} />
            {fieldErrors.sortOrder && <small className={styles.fieldError}>{fieldErrors.sortOrder}</small>}
          </label>
        </div>
        <label className={styles.checkboxField}>
          <input type="checkbox" checked={form.isActive} onChange={(event) => changeField('isActive', event.target.checked)} />
          <span>Категорія активна й видима в каталозі</span>
        </label>
        {formError && <p className={styles.fieldError}>{formError}</p>}
        <button className={styles.primaryButton} type="submit" disabled={saving}>{saving ? 'Зберігаємо…' : editingId ? 'Зберегти зміни' : 'Створити категорію'}</button>
      </form>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {loading ? (
        <div className={styles.stateCard}>Завантажуємо категорії…</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Категорія</th>
                <th>Батьківська</th>
                <th>Курси / підкатегорії</th>
                <th>Статус</th>
                <th>Дії</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const parent = categories.find((item) => item.id === category.parentId);
                const busy = rowBusy === category.id;
                return (
                  <tr key={category.id}>
                    <td>
                      <strong>{category.nameUk}</strong>
                      <span className={styles.muted}>{category.slug}</span>
                      {rowError[category.id] && <span className={styles.inlineError}>{rowError[category.id]}</span>}
                    </td>
                    <td>{parent?.nameUk || '—'}</td>
                    <td>{category.coursesCount ?? 0} / {category.childrenCount ?? 0}</td>
                    <td><span className={`${styles.badge} ${category.isActive ? styles.statusPUBLISHED : styles.statusUNPUBLISHED}`}>{category.isActive ? 'Активна' : 'Прихована'}</span></td>
                    <td>
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.secondaryButton} onClick={() => startEdit(category)} disabled={busy}>Редагувати</button>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          disabled={busy}
                          onClick={() => runRowAction(category.id, () => updateAdminCategory(category.id, { isActive: !category.isActive }))}
                        >
                          {category.isActive ? 'Сховати' : 'Активувати'}
                        </button>
                        <button
                          type="button"
                          className={styles.dangerButton}
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(`Видалити категорію «${category.nameUk}»?`)) {
                              runRowAction(category.id, () => deleteAdminCategory(category.id));
                            }
                          }}
                        >
                          Видалити
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default AdminCategories;
