import styles from './Questions.module.css';
import { Container } from '../../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import robotImg from '../../../assets/images/robot-02.png';
import { Search } from '../../../components/ui/search/Search.jsx';
import { Features } from '../../../data/footer-question.js'
export const Questions = () => {
  const features = Features;

  return (
    <Container>
      <main className={styles.container}>
        <Breadcrumbs
          title="Головна"
          link="/"
          pages="FAQ"
        />

        <div className={styles.titleBox}>
          <div className={styles.titleInfo}>
            <h1>
              FAQ <br />
              Відповіді на найпоширеніші питання
            </h1>
            <p>
              Тут ми зібрали відповіді на запитання, які найчастіше виникають у наших користувачів. Якщо не знайшли потрібної відповіді — напишіть нам.
            </p>
            <Search placeholder='Пошук за питаннями' />

          </div>
          <img src={robotImg} alt='Robot image' />
        </div>

        <div className={styles.box}>
          <h3 className={styles.title}>Популярні категорії</h3>
          <ul className={styles.featuresList}>
            {features.map((f) => (
              <li>
                <img src={f.image} alt={f.imageAlt} />
                <p>{f.title}</p>
              </li>
            ))}

          </ul>

        </div>
      </main>


    </Container>
  );
};