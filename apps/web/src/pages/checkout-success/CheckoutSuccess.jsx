import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { routePatterns } from '@vexa/shared';
import styles from './CheckoutSuccess.module.css';
import SuccessIcon from '../../assets/icons/success.svg'
import CourseImg from '../../assets/images/payment/1.png'
import Button from '../../components/ui/buttons/Button';


const mockPurchase = {
  course: {
    id: 1,
    title: '3D моделювання у Blender',
    author: 'Олена Коваль',
    image: CourseImg,
  },
  amount: 56,
  currency: 'USD',
  orderNumber: '#VXA-2026-045991',
  purchaseDate: '24 серпня 2026, 15:42',
};

export default function PurchaseSuccess () {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);

  const orderId = searchParams.get('orderId');

  useEffect(() => {
    const fetchPurchase = async () => {
      try {
        // const response = await fetch(`/api/orders/${orderId}`);
        // if (!response.ok) throw new Error('Failed to fetch purchase');
        // const data = await response.json();
        // setPurchase(data);

        // Временная заглушка
        await new Promise((resolve) => setTimeout(resolve, 500));

        setPurchase(mockPurchase);
      } catch (error) {
        console.error('Failed to load purchase:', error);

        // Если API не сработал — показываем mock
        setPurchase(mockPurchase);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchase();
  }, [orderId]);

  const handleGoToCourse = () => {
    if (!purchase?.course?.id) return;

    navigate(routePatterns.home);
  };

  const handleGoToMyCourses = () => {
    navigate(routePatterns.home);
  };

  if (loading) {
    return (
      <main className="purchase-success">
        <div className="purchase-success__loading">
          Завантаження...
        </div>
      </main>
    );
  }

  if (!purchase) {
    return (
      <main className="purchase-success">
        <div className="purchase-success__error">
          Не вдалося завантажити інформацію про покупку.
        </div>
      </main>
    );
  }

  return (
    <section className={styles.container}>
      <img src={SuccessIcon} alt='success icon' className={styles.imgSccs} />

        <h1 className={styles.title}>Покупку успішно завершено!</h1>

        <p className={styles.subtitle}>Дякуємо за довіру до VEXA.</p>
        <p className={styles.subtitle}>Курс уже доступний у вашій бібліотеці.</p>

        <div className={styles.purchaseCard}>
          <img
            className={styles.img}
            src={purchase.course.image}
            alt={purchase.course.title}
          />
  

          <div className={styles.info}>
            <h2>{purchase.course.title}</h2>

            <p className={styles.author}>Автор {purchase.course.author}</p>

            <div className={styles.row}>
              <span>Сума </span>
              <span>
                {purchase.amount} {purchase.currency}
              </span>
            </div>

            <div className={styles.row}>
              <span>Номер замовлення:</span>
              <span>{purchase.orderNumber}</span>
            </div>

            <div className={styles.row}>
              <span>Дата покупки:</span>
              <span>{purchase.purchaseDate}</span>
            </div>
          </div>
        </div>

      <div className={styles.bttns}>
        <Button title='Перейти до курсу' variant='primary' size='large' onClick={handleGoToCourse}/>
        <Button title='До моїх курсів' variant='secondary' size='large' onClick={handleGoToMyCourses}/>
      </div>

      </section>
  )
};