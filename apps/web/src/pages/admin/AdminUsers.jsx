import { useCallback, useEffect, useState } from 'react';

import {
  listAdminUsers,
  updateAdminUserStatus,
  verifyAdminAuthor,
} from '../../services/adminService.js';
import styles from './Admin.module.css';

const AdminUsers = () => {
  const [filters, setFilters] = useState({ q: '', role: '', status: '' });
  const [appliedFilters, setAppliedFilters] = useState({ q: '', role: '', status: '' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rowBusy, setRowBusy] = useState('');
  const [rowError, setRowError] = useState({});

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 20 };
      if (appliedFilters.q.trim()) params.q = appliedFilters.q.trim();
      if (appliedFilters.role) params.role = appliedFilters.role;
      if (appliedFilters.status) params.status = appliedFilters.status;
      setResult(await listAdminUsers(params));
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Не вдалося завантажити користувачів.');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const applyFilters = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  };

  const runRowAction = async (userId, action) => {
    setRowBusy(userId);
    setRowError((current) => ({ ...current, [userId]: '' }));
    try {
      await action();
      await loadUsers();
    } catch (requestError) {
      setRowError((current) => ({
        ...current,
        [userId]: requestError.response?.data?.error?.message || 'Не вдалося оновити користувача.',
      }));
    } finally {
      setRowBusy('');
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <div>
          <h2>Користувачі</h2>
          <p>Пошук, блокування акаунтів та підтвердження профілів авторів.</p>
        </div>
      </div>

      <form className={styles.filterBar} onSubmit={applyFilters}>
        <label className={styles.fieldGrow}>
          <span>Пошук</span>
          <input value={filters.q} onChange={(event) => setFilters((value) => ({ ...value, q: event.target.value }))} placeholder="Email або ім’я" />
        </label>
        <label className={styles.field}>
          <span>Роль</span>
          <select value={filters.role} onChange={(event) => setFilters((value) => ({ ...value, role: event.target.value }))}>
            <option value="">Усі</option>
            <option value="STUDENT">Учень</option>
            <option value="AUTHOR">Автор</option>
            <option value="ADMIN">Адміністратор</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>Статус</span>
          <select value={filters.status} onChange={(event) => setFilters((value) => ({ ...value, status: event.target.value }))}>
            <option value="">Усі</option>
            <option value="ACTIVE">Активний</option>
            <option value="BLOCKED">Заблокований</option>
          </select>
        </label>
        <button className={styles.primaryButton} type="submit">Застосувати</button>
      </form>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div className={styles.stateCard}>Завантажуємо користувачів…</div>
      ) : result.items.length === 0 ? (
        <div className={styles.stateCard}>Користувачів не знайдено.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Користувач</th>
                <th>Ролі</th>
                <th>Статус</th>
                <th>Автор</th>
                <th>Дії</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((user) => {
                const isAuthor = user.roles?.includes('AUTHOR');
                const isAdmin = user.roles?.includes('ADMIN');
                const busy = rowBusy === user.id;
                return (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.fullName || user.displayName || 'Без імені'}</strong>
                      <span className={styles.muted}>{user.email}</span>
                      {rowError[user.id] && <span className={styles.inlineError}>{rowError[user.id]}</span>}
                    </td>
                    <td>{(user.roles || []).join(', ')}</td>
                    <td><span className={`${styles.badge} ${user.status === 'BLOCKED' ? styles.statusREJECTED : styles.statusPUBLISHED}`}>{user.status}</span></td>
                    <td>
                      {isAuthor ? (
                        <div className={styles.authorCell}>
                          <span>{user.displayName || 'Профіль без назви'}</span>
                          <span className={user.isVerified ? styles.verified : styles.muted}>{user.isVerified ? '✓ Перевірений' : 'Не перевірений'}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={user.status === 'BLOCKED' ? styles.secondaryButton : styles.dangerButton}
                          disabled={busy || isAdmin}
                          title={isAdmin ? 'Адміністраторів не можна блокувати з панелі' : ''}
                          onClick={() => runRowAction(user.id, () => updateAdminUserStatus(user.id, user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED'))}
                        >
                          {user.status === 'BLOCKED' ? 'Розблокувати' : 'Заблокувати'}
                        </button>
                        {isAuthor && (
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            disabled={busy}
                            onClick={() => runRowAction(user.id, () => verifyAdminAuthor(user.id, !user.isVerified))}
                          >
                            {user.isVerified ? 'Зняти відмітку' : 'Підтвердити автора'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.pagination}>
        <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading}>Назад</button>
        <span>Сторінка {page} з {Math.max(1, result.totalPages || 1)} · усього {result.total ?? 0}</span>
        <button type="button" onClick={() => setPage((value) => value + 1)} disabled={page >= (result.totalPages || 1) || loading}>Далі</button>
      </div>
    </section>
  );
};

export default AdminUsers;
