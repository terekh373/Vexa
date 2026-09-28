import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { Container } from '../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import Button from '../../components/ui/buttons/Button.jsx';
import LockIcon from '../../assets/icons/lock.svg';
import GoogleIcon from '../../assets/icons/checkout/google.svg';
import AppleIcon from '../../assets/icons/checkout/apple.svg';
import CardIcon from '../../assets/icons/checkout/card.svg';
import GarantiyaIcon from '../../assets/icons/checkout/garantiya.svg';

import { getCart } from '../../services/cartService.js';
import {
  createOrder,
  startCheckout,
} from '../../services/ordersService.js';

import styles from './Checkout.module.css';

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

const Checkout = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
  });

  const [formErrors, setFormErrors] = useState({
    fullName: '',
    phone: '',
    email: '',
  });

  const [touched, setTouched] = useState({
    fullName: false,
    phone: false,
    email: false,
  });

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
          setError('Не вдалося завантажити дані замовлення.');
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

  const validateField = (name, value) => {
    const trimmedValue = value.trim();

    if (name === 'fullName') {
      if (!trimmedValue) {
        return 'Вкажіть ім’я та прізвище';
      }

      const parts = trimmedValue.split(/\s+/);

      if (parts.length < 2) {
        return 'Вкажіть ім’я та прізвище';
      }

      if (parts.some((part) => part.length < 2)) {
        return 'Ім’я та прізвище введено некоректно';
      }

      if (!/^[A-Za-zА-Яа-яІіЇїЄєҐґ'’\-\s]+$/u.test(trimmedValue)) {
        return 'Використовуйте лише літери';
      }

      return '';
    }

    if (name === 'phone') {
      if (!trimmedValue) {
        return 'Вкажіть номер телефону';
      }

      const digits = trimmedValue.replace(/\D/g, '');

      if (
        !(
          (digits.length === 12 && digits.startsWith('380')) ||
          (digits.length === 10 && digits.startsWith('0'))
        )
      ) {
        return 'Введіть коректний номер телефону';
      }

      return '';
    }

    if (name === 'email') {
      if (!trimmedValue) {
        return 'Вкажіть email';
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(trimmedValue)) {
        return 'Введіть коректний email';
      }

      return '';
    }

    return '';
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (touched[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: validateField(name, value),
      }));
    }
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;

    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    setFormErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value),
    }));
  };

  const clearField = (name) => {
    setForm((prev) => ({
      ...prev,
      [name]: '',
    }));

    setTouched((prev) => ({
      ...prev,
      [name]: false,
    }));

    setFormErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const validateForm = () => {
    const errors = {
      fullName: validateField('fullName', form.fullName),
      phone: validateField('phone', form.phone),
      email: validateField('email', form.email),
    };

    setFormErrors(errors);

    setTouched({
      fullName: true,
      phone: true,
      email: true,
    });

    return !Object.values(errors).some(Boolean);
  };

  const submitLiqPayForm = ({
    checkoutUrl,
    data,
    signature,
  }) => {
    const form = document.createElement('form');

    form.method = 'POST';
    form.action = checkoutUrl;
    form.acceptCharset = 'utf-8';

    const dataInput = document.createElement('input');

    dataInput.type = 'hidden';
    dataInput.name = 'data';
    dataInput.value = data;

    const signatureInput = document.createElement('input');

    signatureInput.type = 'hidden';
    signatureInput.name = 'signature';
    signatureInput.value = signature;

    form.appendChild(dataInput);
    form.appendChild(signatureInput);

    document.body.appendChild(form);

    form.submit();
  };

  const handlePayment = async () => {
    setError('');

    if (!validateForm()) return;
    if (paymentLoading) return;

    try {
      setPaymentLoading(true);

      const order = await createOrder();
      const payment = await startCheckout(order.id);

      localStorage.setItem(
        'liqpayDebug',
        JSON.stringify({
          orderId: order.id,
          paymentId: payment.paymentId,
          amount: order.totalAmount,
        })
      );

      if (
        !payment?.checkoutUrl ||
        !payment?.data ||
        !payment?.signature
      ) {
        throw new Error('Invalid LiqPay checkout response');
      }

      submitLiqPayForm(payment);
    } catch (error) {
      console.error('Payment error:', error);

      const status = error.response?.status;

      if (status === 409) {
        setError(
          'Замовлення вже оплачене, скасоване або недоступне для оплати.'
        );
      } else if (status === 404) {
        setError('Замовлення не знайдено.');
      } else {
        setError('Не вдалося розпочати оплату. Спробуйте ще раз.');
      }

      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <main className={styles.checkout}>
          <p>Завантаження...</p>
        </main>
      </Container>
    );
  }

  const items = cart?.items ?? [];
  const itemsCount = cart?.itemsCount ?? items.length;
  const totalAmount = cart?.totalAmount ?? 0;
  const currency = cart?.currency ?? 'UAH';

  return (
    <main className={styles.checkout}>
      <Container>
        <Breadcrumbs
          title="Усі курси"
          link={routes.catalog()}
          pages="Оформлення замовлення"
        />

        <h1 className={styles.title}>Покупка курсу</h1>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <div className={styles.empty}>
            <h2>Кошик порожній</h2>

            <Link to={routes.catalog()}>
              <Button
                title="Перейти до каталогу"
                variant="primary"
                size="medium"
              />
            </Link>
          </div>
        ) : (
          <div className={styles.layout}>
            <div className={styles.leftColumn}>
              <section className={styles.card}>
                <h2>Контактні дані</h2>
                <div className={styles.form}>
                  <div className={styles.field}>
                    <div
                      className={`${styles.inputWrapper} ${
                        formErrors.fullName ? styles.inputError : ''
                      }`}
                    >
                      <input
                        type="text"
                        name="fullName"
                        value={form.fullName}
                        placeholder="Ім’я та Прізвище"
                        autoComplete="name"
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />

                      {form.fullName && (
                        <button
                          type="button"
                          className={styles.clearButton}
                          onClick={() => clearField('fullName')}
                          aria-label="Очистити ім’я та прізвище"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {formErrors.fullName && (
                      <span className={styles.fieldError}>
                        {formErrors.fullName}
                      </span>
                    )}
                  </div>

                  <div className={styles.field}>
                    <div
                      className={`${styles.inputWrapper} ${
                        formErrors.phone ? styles.inputError : ''
                      }`}
                    >
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        placeholder="Номер телефону"
                        autoComplete="tel"
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />

                      {form.phone && (
                        <button
                          type="button"
                          className={styles.clearButton}
                          onClick={() => clearField('phone')}
                          aria-label="Очистити номер телефону"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {formErrors.phone && (
                      <span className={styles.fieldError}>
                        {formErrors.phone}
                      </span>
                    )}
                  </div>

                  <div className={styles.field}>
                    <div
                      className={`${styles.inputWrapper} ${
                        formErrors.email ? styles.inputError : ''
                      }`}
                    >
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        placeholder="Email"
                        autoComplete="email"
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />

                      {form.email && (
                        <button
                          type="button"
                          className={styles.clearButton}
                          onClick={() => clearField('email')}
                          aria-label="Очистити email"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {formErrors.email && (
                      <span className={styles.fieldError}>
                        {formErrors.email}
                      </span>
                    )}
                  </div>
                </div>
              </section>

              <section className={styles.card}>
                <h2>Спосіб оплати</h2>

                <div className={styles.paymentMethods}>
                  <button
                    type="button"
                    className={`${styles.paymentMethod} ${
                      paymentMethod === 'card' ? styles.active : ''
                    }`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <img src={CardIcon} alt='card' className={styles.payIcon} />
                    <span className={styles.radio} />
                  </button>

                  <button
                    type="button"
                    className={`${styles.paymentMethod} ${
                      paymentMethod === 'google' ? styles.active : ''
                    }`}
                    onClick={() => setPaymentMethod('google')}
                  >
                    <img src={GoogleIcon} alt='google icon' className={styles.payIcon} />
                    <span className={styles.radio} />
                  </button>

                  <button
                    type="button"
                    className={`${styles.paymentMethod} ${
                      paymentMethod === 'apple' ? styles.active : ''
                    }`}
                    onClick={() => setPaymentMethod('apple')}
                  >
                    <img src={AppleIcon} alt='apple icon' className={styles.payIcon} />
                    <span className={styles.radio} />
                  </button>
                </div>

                {paymentMethod === 'card' && (
                  <div className={styles.cardFields}>
                    <input
                      type="text"
                      placeholder="Номер картки"
                      disabled
                    />

                    <input
                      type="text"
                      placeholder="MM/YY"
                      disabled
                    />

                    <input
                      type="text"
                      placeholder="CVV"
                      disabled
                    />
                  </div>
                )}

                <p className={styles.secure}>
                  <img src={LockIcon} alt='lock icon' />
                  Ваші платіжні дані захищені
                </p>
              </section>
            </div>

            <aside className={`${styles.card} ${styles.order}`}>
              <h2>Ваше замовлення</h2>

              <div className={styles.orderItems}>
                {items.map((item) => (
                  <article
                    key={item.courseId}
                    className={styles.orderItem}
                  >
                    <div className={styles.courseImage}>
                      {item.coverFileId ? (
                        <img
                          src={item.coverFileId}
                          alt={item.title}
                        />
                      ) : (
                        <span>VEXA</span>
                      )}
                    </div>

                    <div className={styles.courseInfo}>
                      <span className={styles.courseType}>
                        {item.type === 'MATERIAL'
                          ? 'Матеріал'
                          : 'Курс'}
                      </span>

                      <h3>{item.title}</h3>

                      <p>Викладач:</p>

                      <span className={styles.author}>
                        {item.author?.displayName ||
                          'Автор не вказаний'}
                      </span>
                    </div>

                    <strong className={styles.price}>
                      {formatPrice(
                        item.priceAmount,
                        item.currency,
                      )}
                    </strong>
                  </article>
                ))}
              </div>

              <div className={styles.summary}>
                <div>
                  <span>Курси ({itemsCount})</span>
                  <span>{formatPrice(totalAmount, currency)}</span>
                </div>

                <div className={styles.total}>
                  <strong>До сплати</strong>
                  <strong>
                    {formatPrice(totalAmount, currency)}
                  </strong>
                </div>
              </div>

              <Button
                title={
                  paymentLoading
                    ? 'Переходимо до оплати...'
                    : `Оплатити ${formatPrice(totalAmount, currency)}`
                }
                variant="primary"
                size="medium"
                onClick={handlePayment}
                disabled={paymentLoading}
              />

              <div className={styles.conditions}>
                <p>
                  <span>✓</span>
                  Я погоджуюсь з{' '}
                  <Link to={routes.offer()}>
                    умовами використання
                  </Link>
                </p>

                <p>
                  <img src={GarantiyaIcon} alt=''/ >
                  30 днів гарантії повернення коштів
                </p>
              </div>
            </aside>
          </div>
        )}
      </Container>
    </main>
  );
};

export default Checkout;