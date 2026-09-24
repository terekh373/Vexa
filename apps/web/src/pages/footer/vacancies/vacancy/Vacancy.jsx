import { useParams } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { Container } from '../../../../components/layout/container/Container';
import Breadcrumbs from '../../../../components/ui/breadcrumbs/Breadcrumbs';
import Button from '../../../../components/ui/buttons/Button';

import heroImg from '../../../../assets/images/vacancies/05.png';
import resumeImg from '../../../../assets/images/vacancies/06.png';


import styles from './Vacancy.module.css';

const vacancies = [
  {
    id: 1,
    title: 'UI/UX Design',
    description:
      'У VEXA ми створюємо сучасну освітню платформу, яка надихає вчитися, розвиватися та досягати. Шукаємо UI/UX дизайнера, який допоможе нам робити продукт ще зручнішим, красивішим і кориснішим для мільйонів користувачів.',
    level: 'Middle+',
    employment: 'Повна зайнятість',
    format: 'Віддалено',
    location: 'Україна',
  },
];

const mainTasks = [
  'Розробка UI/UX для веб-платформи та мобільного застосунку',
  'Створення прототипів, user flows та дизайн-системи',
  'Участь у дослідженнях користувачів',
  'Співпраця з командою розробки та продукту',
  'Покращення існуючих інтерфейсів на основі аналітики та зворотного зв’язку',
];

const expectations = [
  'Досвід роботи UI/UX дизайнером від 2 років',
  'Сильне портфоліо з реальними кейсами',
  'Впевнене користування Figma',
  'Розуміння принципів UX-досліджень',
  'Креативність, увага до деталей',
];

const advantages = [
  'Досвід роботи з освітніми продуктами',
  'Базові знання motion design',
  'Розуміння принципів accessibility',
  'Досвід роботи з AI-інструментами (наприклад, Midjourney, Figma AI)',
];

const offers = [
  'Конкурентну зарплату',
  'Повністю віддалений формат роботи',
  'Гнучкий графік',
  'Можливість впливати на продукт',
  'Професійний розвиток і навчання',
  'Дружню команду та підтримку',
];

const VacancyList = ({ title, items }) => (
  <div className={styles.infoBlock}>
    <h2>{title}</h2>

    <ul>
      {items.map((item) => (
        <li key={item}>
          <span className={styles.check}>✓</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const Vacancy = () => {
  const { id } = useParams();

  const vacancy = vacancies.find((item) => String(item.id) === id) ?? vacancies[0];

  return (
    <main className={styles.page}>
      <Container>
        <Breadcrumbs title='Головна' link='/' pages='UI/UX Designer' />

        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1>{vacancy.title}</h1>
            <p>{vacancy.description}</p>

            <div className={styles.tags}>
              <span className={styles.level}>{vacancy.level}</span>
              <span>{vacancy.employment}</span>
              <span>{vacancy.format}</span>
              <span>{vacancy.location}</span>
            </div>

            <div className={styles.about}>
              <h2>Про команду</h2>
              <p>
                Наша дизайн-команда — це професіонали, які люблять свою справу, експериментують, підтримують одне одного та створюють продукти, якими користуються тисячі людей.
              </p>
            </div>
          </div>

          <div className={styles.heroImage}>
            <img src={heroImg} alt="Робота UI/UX дизайнера у VEXA" />
          </div>
        </section>

        <section className={styles.requirements}>
          <VacancyList title="Основні задачі" items={mainTasks} />
          <VacancyList title="Ми очікуємо" items={expectations} />
        </section>

        <section className={styles.additional}>
          <VacancyList title="Буде плюсом" items={advantages} />
          <VacancyList title="Ми пропонуємо" items={offers} />
        </section>

        <section className={styles.apply}>
          <div className={styles.applyImage}>
            <img src={resumeImg} alt="Надіслати резюме до VEXA" />
          </div>

          <div className={styles.applyContent}>
            <h2>Готовий стати частиною VESA?</h2>
            <p>
              Надішли своє резюме, портфоліо або посилання на них. Ми з радістю познайомимося.
            </p>

            <Button title='Відгукнутися' />
          </div>
        </section>
      </Container>
    </main>
  );
};

export default Vacancy;