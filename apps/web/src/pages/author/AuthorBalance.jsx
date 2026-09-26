import { useCallback, useEffect, useMemo, useState } from 'react';

import { Container } from '../../components/layout/container/Container.jsx';
import {
  createAuthorPayout,
  getAuthorBalance,
  getAuthorBalanceEntries,
  getAuthorPayouts,
} from '../../services/authorFinanceService.js';
import styles from './AuthorCabinet.module.css';

const PAGE_SIZE = 10;

const PAYOUT_STATUS_LABELS = {
  REQUESTED: 'Очікує обробки',
  APPROVED: 'Схвалено',
  PAID: 'Виплачено',
  REJECTED: 'Відхилено',
};

const ENTRY_TYPE_LABELS = {
  SALE: 'Продаж',
  REFUND: 'Повернення',
  PAYOUT: 'Виплата',
  ADJUSTMENT: 'Коригування',
};

const formatMoney = (amount = 0, currency = 'UAH') =>
  new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0) / 100);

const formatDate = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const amountToKopecks = (value) => {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
};

const extractFieldErrors = (requestError) =>
  (requestError.response?.data?.error?.details ?? []).reduce((result, detail) => {
    if (detail?.field && detail?.message) result[detail.field] = detail.message;
    return result;
  }, {});

const AuthorBalance = () => {
  const [balance, setBalance] = useState(null);
  const [entries, setEntries] = useState({ items: [], page: 1, totalPages: 1 });
  const [payouts, setPayouts] = useState({ items: [], page: 1, totalPages: 1 });
  const [entriesPage, setEntriesPage] = useState(1);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CARD');
  const [destination, setDestination] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBalance = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    if (!silent) setLoadError('');

    try {
      const [balanceData, entriesData, payoutsData] = await Promise.all([
        getAuthorBalance(),
        getAuthorBalanceEntries(entriesPage, PAGE_SIZE),
        getAuthorPayouts(payoutsPage, PAGE_SIZE),
      ]);
      setBalance(balanceData);
      setEntries(entriesData);
      setPayouts(payoutsData);
    } catch (requestError) {
      if (!silent) {
        setLoadError(
          requestError.response?.data?.error?.message ||
            'Не вдалося завантажити баланс і виплати. Спробуйте ще раз.',
        );
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [entriesPage, payoutsPage]);

  useEffect(() => {
    loadBalance();
    const intervalId = window.setInterval(() => loadBalance({ silent: true }), 30_000);
    return () => window.clearInterval(intervalId);
  }, [loadBalance]);

  const payoutMinText = useMemo(
    () => formatMoney(balance?.payoutMinAmount ?? 0, balance?.currency ?? 'UAH'),
    [balance],
  );

  const validateForm = () => {
    const errors = {};
    const amountKopecks = amountToKopecks(amount);

    if (amountKopecks === null || amountKopecks <= 0) {
      errors.amount = 'Введіть суму у форматі 500 або 500,00.';
    } else if (balance && amountKopecks < balance.payoutMinAmount) {
      errors.amount = `Мінімальна сума виплати — ${payoutMinText}.`;
    } else if (balance && amountKopecks > balance.availableAmount) {
      errors.amount = 'Сума перевищує доступний баланс.';
    }

    if (!destination.trim()) {
      errors.destination = method === 'CARD' ? 'Вкажіть номер картки.' : 'Вкажіть IBAN.';
    }

    setFieldErrors(errors);
    return { errors, amountKopecks };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    const { errors, amountKopecks } = validateForm();
    if (Object.keys(errors).length > 0 || amountKopecks === null) return;

    setIsSubmitting(true);

    try {
      await createAuthorPayout({
        amount: amountKopecks,
        method,
        destination: destination.trim(),
      });
      setAmount('');
      setDestination('');
      setFieldErrors({});
      setSubmitSuccess('Заявку на виплату створено. Вона вже відображається в історії.');
      setEntriesPage(1);
      setPayoutsPage(1);
      const [balanceData, entriesData, payoutsData] = await Promise.all([
        getAuthorBalance(),
        getAuthorBalanceEntries(1, PAGE_SIZE),
        getAuthorPayouts(1, PAGE_SIZE),
      ]);
      setBalance(balanceData);
      setEntries(entriesData);
      setPayouts(payoutsData);
    } catch (requestError) {
      const serverFieldErrors = extractFieldErrors(requestError);
      setFieldErrors((current) => ({ ...current, ...serverFieldErrors }));
      setSubmitError(
        requestError.response?.data?.error?.message ||
          'Не вдалося створити заявку на виплату. Перевірте дані та спробуйте ще раз.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <Container>
        <div className={styles.headingRow}>
          <div>
            <p className={styles.eyebrow}>Кабінет автора</p>
            <h1 className={styles.title}>Баланс і виплати</h1>
            <p className={styles.subtitle}>Контролюйте нарахування та подавайте заявки на виплату.</p>
          </div>
        </div>

        {isLoading && <div className={styles.largeSkeleton} aria-label="Завантаження балансу" />}

        {!isLoading && loadError && (
          <section className={styles.stateCard} role="alert">
            <h2>Не вдалося завантажити баланс</h2>
            <p>{loadError}</p>
            <button type="button" className={styles.primaryButton} onClick={() => loadBalance()}>
              Спробувати ще
            </button>
          </section>
        )}

        {!isLoading && !loadError && balance && (
          <>
            <section className={styles.metricsGrid} aria-label="Баланс автора">
              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>Доступно</span>
                <strong className={styles.metricValue}>
                  {formatMoney(balance.availableAmount, balance.currency)}
                </strong>
                <span className={styles.metricHint}>можна подати на виплату</span>
              </article>
              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>В очікуванні</span>
                <strong className={styles.metricValue}>
                  {formatMoney(balance.pendingAmount, balance.currency)}
                </strong>
                <span className={styles.metricHint}>обробляється</span>
              </article>
              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>Виведено</span>
                <strong className={styles.metricValue}>
                  {formatMoney(balance.withdrawnAmount, balance.currency)}
                </strong>
                <span className={styles.metricHint}>за весь час</span>
              </article>
              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>Мінімальна виплата</span>
                <strong className={styles.metricValue}>{payoutMinText}</strong>
                <span className={styles.metricHint}>мінімум для заявки</span>
              </article>
            </section>

            <section className={styles.balanceGrid}>
              <article className={styles.panel}>
                <div className={styles.panelHeading}>
                  <div>
                    <p className={styles.panelEyebrow}>Нова заявка</p>
                    <h2>Вивести кошти</h2>
                  </div>
                </div>

                <form className={styles.payoutForm} onSubmit={handleSubmit} noValidate>
                  <label className={styles.field}>
                    <span>Сума, грн</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => {
                        setAmount(event.target.value);
                        setFieldErrors((current) => ({ ...current, amount: undefined }));
                      }}
                      placeholder="500,00"
                      aria-invalid={Boolean(fieldErrors.amount)}
                    />
                    <small>Мінімальна сума: {payoutMinText}</small>
                    {fieldErrors.amount && <span className={styles.fieldError}>{fieldErrors.amount}</span>}
                  </label>

                  <label className={styles.field}>
                    <span>Спосіб виплати</span>
                    <select
                      value={method}
                      onChange={(event) => {
                        setMethod(event.target.value);
                        setDestination('');
                        setFieldErrors((current) => ({ ...current, destination: undefined }));
                      }}
                    >
                      <option value="CARD">Картка</option>
                      <option value="IBAN">IBAN</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>{method === 'CARD' ? 'Номер картки' : 'IBAN'}</span>
                    <input
                      type="text"
                      value={destination}
                      onChange={(event) => {
                        setDestination(event.target.value);
                        setFieldErrors((current) => ({ ...current, destination: undefined }));
                      }}
                      placeholder={method === 'CARD' ? '4444 3333 2222 1111' : 'UA00 0000 0000 0000 0000 0000 000'}
                      autoComplete="off"
                      aria-invalid={Boolean(fieldErrors.destination)}
                    />
                    <small>Після перевірки зберігаються лише останні 4 символи реквізитів.</small>
                    {fieldErrors.destination && (
                      <span className={styles.fieldError}>{fieldErrors.destination}</span>
                    )}
                  </label>

                  {submitError && <p className={styles.formError} role="alert">{submitError}</p>}
                  {submitSuccess && <p className={styles.formSuccess} role="status">{submitSuccess}</p>}

                  <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                    {isSubmitting ? 'Надсилаємо…' : 'Подати заявку'}
                  </button>
                </form>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeading}>
                  <div>
                    <p className={styles.panelEyebrow}>Історія заявок</p>
                    <h2>Виплати</h2>
                  </div>
                </div>

                {payouts.items.length === 0 ? (
                  <p className={styles.emptyText}>Заявок на виплату ще немає.</p>
                ) : (
                  <div className={styles.listStack}>
                    {payouts.items.map((payout) => (
                      <div className={styles.listItem} key={payout.id}>
                        <div>
                          <strong>{formatMoney(payout.amount, payout.currency)}</strong>
                          <span>{payout.method === 'IBAN' ? 'IBAN' : 'Картка'} · {payout.destinationMasked}</span>
                          <span>{formatDate(payout.createdAt)}</span>
                        </div>
                        <span className={`${styles.statusText} ${styles[`payout${payout.status}`] ?? ''}`}>
                          {PAYOUT_STATUS_LABELS[payout.status] ?? payout.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.paginationRow}>
                  <button
                    type="button"
                    className={styles.pageButton}
                    disabled={payoutsPage <= 1}
                    onClick={() => setPayoutsPage((page) => Math.max(1, page - 1))}
                  >
                    Назад
                  </button>
                  <span>Сторінка {payouts.page ?? payoutsPage} з {Math.max(1, payouts.totalPages ?? 1)}</span>
                  <button
                    type="button"
                    className={styles.pageButton}
                    disabled={payoutsPage >= (payouts.totalPages ?? 1)}
                    onClick={() => setPayoutsPage((page) => page + 1)}
                  >
                    Далі
                  </button>
                </div>
              </article>
            </section>

            <section className={`${styles.panel} ${styles.ledgerPanel}`}>
              <div className={styles.panelHeading}>
                <div>
                  <p className={styles.panelEyebrow}>Нарахування</p>
                  <h2>Історія балансу</h2>
                </div>
              </div>

              {entries.items.length === 0 ? (
                <p className={styles.emptyText}>Нарахувань ще немає.</p>
              ) : (
                <div className={styles.ledgerTableWrap}>
                  <table className={styles.ledgerTable}>
                    <thead>
                      <tr>
                        <th>Дата</th>
                        <th>Тип</th>
                        <th>Опис</th>
                        <th>Сума</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.items.map((entry) => (
                        <tr key={entry.id}>
                          <td>{formatDate(entry.createdAt)}</td>
                          <td>{ENTRY_TYPE_LABELS[entry.type] ?? entry.type}</td>
                          <td>{entry.comment || entry.orderItem?.titleSnapshot || '—'}</td>
                          <td className={Number(entry.amount) < 0 ? styles.negativeAmount : styles.positiveAmount}>
                            {formatMoney(entry.amount, balance.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className={styles.paginationRow}>
                <button
                  type="button"
                  className={styles.pageButton}
                  disabled={entriesPage <= 1}
                  onClick={() => setEntriesPage((page) => Math.max(1, page - 1))}
                >
                  Назад
                </button>
                <span>Сторінка {entries.page ?? entriesPage} з {Math.max(1, entries.totalPages ?? 1)}</span>
                <button
                  type="button"
                  className={styles.pageButton}
                  disabled={entriesPage >= (entries.totalPages ?? 1)}
                  onClick={() => setEntriesPage((page) => page + 1)}
                >
                  Далі
                </button>
              </div>
            </section>
          </>
        )}
      </Container>
    </main>
  );
};

export default AuthorBalance;
