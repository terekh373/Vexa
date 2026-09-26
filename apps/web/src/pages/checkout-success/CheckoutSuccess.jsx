import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { routes } from '@vexa/shared';
import { getOrder } from '../../services/ordersService.js';
import styles from './CheckoutSuccess.module.css';
import SuccessIcon from '../../assets/icons/success.svg';
import Button from '../../components/ui/buttons/Button';

const POLL_INTERVAL = 2000;
const MAX_POLL_TIME = 30000;

const formatPrice = (amount = 0, currency = 'UAH') => {
  try {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
};

export default function CheckoutSuccess() {
  const navigate = useNavigate();

  const { orderId } = useParams();

  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(true);

  const [timedOut, setTimedOut] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) {
      setError('Не вдалося визначити замовлення.');
      setLoading(false);

      return;
    }

    let cancelled = false;

    let timeoutId;

    const startedAt = Date.now();

    const checkOrder = async () => {
      try {
        const data = await getOrder(orderId);

        if (cancelled) {
          return;
        }

        setOrder(data);
        setLoading(false);

        if (data.status !== 'PENDING') {
          return;
        }

        if (Date.now() - startedAt >= MAX_POLL_TIME) {
          setTimedOut(true);

          return;
        }

        timeoutId = window.setTimeout(
          checkOrder,
          POLL_INTERVAL
        );
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        console.error(
          'Failed to load order:',
          requestError
        );

        setError(
          'Не вдалося перевірити статус оплати.'
        );

        setLoading(false);
      }
    };

    checkOrder();

    return () => {
      cancelled = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [orderId]);

  const handleGoToCourse = () => {
    const courseId = order?.items?.[0]?.courseId;

    if (!courseId) {
      navigate(routes.learning());

      return;
    }

    navigate(routes.player(courseId));
  };

  const handleGoToMyCourses = () => {
    navigate(routes.learning());
  };

  if (loading) {
    return (
      <section className={styles.container}>
        <h1 className={styles.title}>
          Перевіряємо оплату...
        </h1>

        <p className={styles.subtitle}>
          Зачекайте декілька секунд.
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.container}>
        <h1 className={styles.title}>
          Не вдалося перевірити оплату
        </h1>

        <p className={styles.subtitle}>
          {error}
        </p>

        <Button
          title="До моїх замовлень"
          variant="primary"
          size="large"
          onClick={() => navigate(routes.orders())}
        />
      </section>
    );
  }

  if (order?.status === 'FAILED') {
    return (
      <section className={styles.container}>
        <h1 className={styles.title}>
          Оплату відхилено
        </h1>

        <p className={styles.subtitle}>
          Платіж не був завершений.
        </p>

        <Button
          title="До моїх замовлень"
          variant="primary"
          size="large"
          onClick={() => navigate(routes.orders())}
        />
      </section>
    );
  }

  if (order?.status === 'CANCELLED') {
    return (
      <section className={styles.container}>
        <h1 className={styles.title}>
          Замовлення скасовано
        </h1>

        <p className={styles.subtitle}>
          Оплата за цим замовленням більше не приймається.
        </p>

        <Button
          title="До каталогу"
          variant="primary"
          size="large"
          onClick={() => navigate(routes.catalog())}
        />
      </section>
    );
  }

  if (order?.status === 'PENDING' && timedOut) {
    return (
      <section className={styles.container}>
        <h1 className={styles.title}>
          Оплата обробляється
        </h1>

        <p className={styles.subtitle}>
          Ми ще не отримали підтвердження платежу.
          Статус можна перевірити у ваших замовленнях.
        </p>

        <Button
          title="До моїх замовлень"
          variant="primary"
          size="large"
          onClick={() => navigate(routes.orders())}
        />
      </section>
    );
  }

  if (order?.status !== 'PAID') {
    return null;
  }

  const firstItem = order.items?.[0];

  return (
    <section className={styles.container}>
      <img
        src={SuccessIcon}
        alt=""
        aria-hidden="true"
        className={styles.imgSccs}
      />

      <h1 className={styles.title}>
        Покупку успішно завершено!
      </h1>

      <p className={styles.subtitle}>
        Дякуємо за довіру до VEXA.
      </p>

      <p className={styles.subtitle}>
        Курс уже доступний у вашій бібліотеці.
      </p>

      {firstItem && (
        <div className={styles.purchaseCard}>
          <div className={styles.info}>
            <h2>{firstItem.title}</h2>

            <div className={styles.row}>
              <span>Сума</span>

              <span>
                {formatPrice(
                  order.totalAmount,
                  order.currency
                )}
              </span>
            </div>

            <div className={styles.row}>
              <span>Номер замовлення:</span>

              <span>{order.number}</span>
            </div>
          </div>
        </div>
      )}

      <div className={styles.bttns}>
        <Button
          title="Перейти до курсу"
          variant="primary"
          size="large"
          onClick={handleGoToCourse}
        />

        <Button
          title="До моїх курсів"
          variant="secondary"
          size="large"
          onClick={handleGoToMyCourses}
        />
      </div>
    </section>
  );
}