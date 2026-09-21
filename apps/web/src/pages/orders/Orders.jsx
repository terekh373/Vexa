import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { Container } from '../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import { getOrders } from '../../services/ordersService.js';

import styles from './Orders.module.css';

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
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadOrders = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await getOrders();

        if (cancelled) return;

        setOrders(data.items);
      } catch (err) {
        if (cancelled) return;

        console.error('Failed to load orders:', err);
        setError('Не вдалося завантажити замовлення.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className={styles.orders}>
        <Container>
          <Breadcrumbs
            title="Головна"
            link={routes.home()}
            pages="Мої замовлення"
          />

          <h1 className={styles.title}>Мої замовлення</h1>

          <p className={styles.message}>Завантаження...</p>
        </Container>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.orders}>
        <Container>
          <Breadcrumbs
            title="Головна"
            link={routes.home()}
            pages="Мої замовлення"
          />

          <h1 className={styles.title}>Мої замовлення</h1>

          <p className={styles.error}>{error}</p>
        </Container>
      </section>
    );
  }

  return (
    <section className={styles.orders}>
      <Container>
        <Breadcrumbs
          title="Головна"
          link={routes.home()}
          pages="Мої замовлення"
        />

        <h1 className={styles.title}>Мої замовлення</h1>

        {orders.length === 0 ? (
          <div className={styles.empty}>
            <h2>У вас ще немає замовлень</h2>

            <p>
              Додайте курс у кошик та оформіть своє перше замовлення.
            </p>

            <Link
              to={routes.catalog()}
              className={styles.catalogLink}
            >
              Перейти до курсів
            </Link>
          </div>
        ) : (
          <div className={styles.list}>
            {orders.map((order) => (
              <article
                key={order.id}
                className={styles.orderCard}
              >
                <div className={styles.orderHeader}>
                  <div>
                    <p className={styles.orderNumber}>
                      Замовлення №{order.number}
                    </p>

                    <p className={styles.date}>
                      {formatDate(order.createdAt)}
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

                <div className={styles.items}>
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className={styles.item}
                    >
                      <div className={styles.itemInfo}>
                        <Link
                          to={routes.course(item.courseSlug)}
                          className={styles.courseTitle}
                        >
                          {item.title}
                        </Link>
                      </div>

                      <span className={styles.itemPrice}>
                        {formatPrice(item.priceAmount)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className={styles.orderFooter}>
                  <div className={styles.total}>
                    <span>Разом:</span>

                    <strong>
                      {formatPrice(order.totalAmount)}
                    </strong>
                  </div>

                  <Link
                    to={routes.order(order.id)}
                    className={styles.detailsLink}
                  >
                    Детальніше
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
};

export default Orders;