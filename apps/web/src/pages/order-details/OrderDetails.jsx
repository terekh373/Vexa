import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { Container } from '../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import { getOrder } from '../../services/ordersService.js';

import styles from './OrderDetails.module.css';

const STATUS_LABELS = {
  PENDING: 'Очікує оплати',
  PAID: 'Оплачено',
  FAILED: 'Помилка оплати',
  CANCELLED: 'Скасовано',
};

const formatPrice = (amount) => {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
};

const formatDate = (date) => {
  if (!date) return '—';

  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const OrderDetails = () => {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadOrder = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await getOrder(id);

        if (cancelled) return;

        setOrder(data);
      } catch (err) {
        if (cancelled) return;

        console.error('Failed to load order:', err);

        if (err.response?.status === 404) {
          setError('Замовлення не знайдено.');
        } else {
          setError('Не вдалося завантажити замовлення.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <section className={styles.page}>
        <Container>
          <p className={styles.message}>Завантаження...</p>
        </Container>
      </section>
    );
  }

  if (error || !order) {
    return (
      <section className={styles.page}>
        <Container>
          <p className={styles.error}>{error}</p>

          <Link to={routes.orders()} className={styles.backLink}>
            Повернутися до замовлень
          </Link>
        </Container>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <Container>
        <Breadcrumbs
          title="Мої замовлення"
          link={routes.orders()}
          pages={`Замовлення №${order.number}`}
        />

        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              Замовлення №{order.number}
            </h1>

            <p className={styles.date}>
              Створено {formatDate(order.createdAt)}
            </p>
          </div>

          <span
            className={`${styles.status} ${
              styles[`status${order.status}`] ?? ''
            }`}
          >
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>

        <div className={styles.content}>
          <div className={styles.courses}>
            <h2>Курси</h2>

            {order.items.map((item) => (
              <div key={item.id} className={styles.course}>
                <Link
                  to={routes.course(item.courseSlug)}
                  className={styles.courseTitle}
                >
                  {item.title}
                </Link>

                <span className={styles.price}>
                  {formatPrice(item.priceAmount)}
                </span>
              </div>
            ))}
          </div>

          <aside className={styles.summary}>
            <h2>Деталі замовлення</h2>

            <div className={styles.row}>
              <span>Статус</span>
              <strong>
                {STATUS_LABELS[order.status] ?? order.status}
              </strong>
            </div>

            <div className={styles.row}>
              <span>Створено</span>
              <strong>{formatDate(order.createdAt)}</strong>
            </div>

            {order.paidAt && (
              <div className={styles.row}>
                <span>Оплачено</span>
                <strong>{formatDate(order.paidAt)}</strong>
              </div>
            )}

            {order.cancelledAt && (
              <div className={styles.row}>
                <span>Скасовано</span>
                <strong>{formatDate(order.cancelledAt)}</strong>
              </div>
            )}

            <div className={styles.total}>
              <span>Разом</span>
              <strong>{formatPrice(order.totalAmount)}</strong>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
};

export default OrderDetails;