import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { Container } from '../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import Button from '../../components/ui/buttons/Button.jsx';

import { getCart, removeFromCart } from '../../services/cartService.js';
import GarantiyaIcon from '../../assets/icons/checkout/garantiya.svg';
import LockIcon from '../../assets/icons/lock.svg';

import styles from './Cart.module.css';

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

const Cart = () => {
  const navigate = useNavigate();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadCart = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await getCart();

        if (!cancelled) {
          setCart(data);
        }
      } catch {
        if (!cancelled) {
          setError('Не вдалося завантажити кошик.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCart();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRemove = async (courseId) => {
    try {
      setRemovingId(courseId);
      setError('');

      const updatedCart = await removeFromCart(courseId);

      setCart(updatedCart);
    } catch {
      setError('Не вдалося видалити курс із кошика.');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div>
        <main className={styles.cart}>
          <p className={styles.state}>Завантаження кошика...</p>
        </main>
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div>
        <main className={styles.cart}>
          <p className={styles.error}>{error}</p>
        </main>
      </div>
    );
  }

  const items = cart?.items ?? [];
  const itemsCount = cart?.itemsCount ?? items.length;
  const totalAmount = cart?.totalAmount ?? 0;
  const currency = cart?.currency ?? 'UAH';

  return (
    <div className={styles.container}>
      <Container className={styles.cart}>
        <Breadcrumbs
          title="Головна"
          link={routes.home()}
          pages="Кошик"
        />

        <Link to={routes.catalog()} className={styles.back}>
          <span>←</span>
          Назад до каталогу
        </Link>

        <h1 className={styles.title}>Кошик</h1>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <div className={styles.empty}>
            <h2>Ваш кошик порожній</h2>
            <p>Додайте курс, щоб продовжити оформлення замовлення.</p>

            <Button
              title="Перейти до каталогу"
              variant="primary"
              size="medium"
              onClick={() => navigate(routes.catalog())}
            />
          </div>
        ) : (
          <>
            <div className={styles.layout}>
              <div className={styles.courses}>
                {items.map((item) => (
                  <article className={styles.courseCard} key={item.courseId}>
                    <div className={styles.courseImage}>
                      {item.coverUrl ? (
                        <img src={item.coverUrl} alt={item.title} />
                      ) : (
                        <div className={styles.imagePlaceholder} />
                      )}
                    </div>

                    <div className={styles.courseContent}>
                      <div className={styles.courseTop}>
                        <span className={styles.category}>
                          {item.type === 'MATERIAL' ? 'Матеріал' : 'Курс'}
                        </span>

                        <span className={styles.price}>
                          {formatPrice(item.priceAmount, item.currency)}
                        </span>
                      </div>

                      <h2>{item.title}</h2>

                      <div className={styles.author}>
                        <span>Викладач:</span>
                        <span>
                          {item.author?.displayName || 'Не вказано'}
                        </span>
                      </div>

                      {!item.isAvailable && (
                        <p className={styles.unavailable}>
                          Цей курс зараз недоступний для покупки.
                        </p>
                      )}

                      <Button
                        title={
                          removingId === item.courseId
                            ? 'Видалення...'
                            : 'Видалити'
                        }
                        variant="primary"
                        size="small"
                        disabled={removingId === item.courseId}
                        onClick={() => handleRemove(item.courseId)}
                      />
                    </div>
                  </article>
                ))}
              </div>

              <aside className={styles.summary}>
                <h2>Ваше замовлення</h2>

                <div className={styles.summaryRows}>
                  <div className={styles.summaryRow}>
                    <span>Курси ({itemsCount})</span>

                    <strong>
                      {formatPrice(totalAmount, currency)}
                    </strong>
                  </div>

                  <div className={styles.total}>
                    <span>До сплати</span>

                    <strong>
                      {formatPrice(totalAmount, currency)}
                    </strong>
                  </div>
                </div>

                <div className={styles.promo}>
                  <input
                    type="text"
                    placeholder="Введіть промокод"
                    aria-label="Промокод"
                  />

                  <Button
                    title="Застосувати"
                    variant="secondary"
                    size="small"
                  />
                </div>

                <div className={styles.checkout}>
                  <Button
                    title="Перейти до оплати"
                    variant="primary"
                    size="medium"
                    onClick={() => navigate(routes.checkout())}
                  />
                </div>

                <div className={styles.guarantees}>
                  <div className={styles.row}>
                    <img src={LockIcon} alt='' />
                    <span>
                      Безпечна оплата
                    </span>
                  </div>
                  <div className={styles.row}>
                    <img src={GarantiyaIcon} alt='' />
                    <span>
                      30 днів гарантії повернення коштів
                    </span>
                  </div>
                </div>
              </aside>
            </div>

            <div className={styles.continueWrapper}>
              <Link to={routes.catalog()} className={styles.continue}>
                Продовжити покупки
                <span>→</span>
              </Link>
            </div>
          </>
        )}
      </Container>
    </div>
  );
};

export default Cart;