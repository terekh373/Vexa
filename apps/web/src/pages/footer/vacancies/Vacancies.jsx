import { Container } from '../../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import Button from '../../../components/ui/buttons/Button.jsx';

import styles from './Vacancies.module.css';
import { useNavigate } from 'react-router-dom';
import { routes } from '@vexa/shared';

import heroImg from '../../../assets/images/vacancies/01.png';
import vacanciesImg from '../../../assets/images/vacancies/02.png';
import resumeImg from '../../../assets/images/vacancies/03.png';
import icon01 from '../../../assets/icons/vacancies/i01.svg';
import icon02 from '../../../assets/icons/vacancies/i02.svg';
import icon03 from '../../../assets/icons/vacancies/i03.svg';
import icon04 from '../../../assets/icons/vacancies/i04.svg';
import icon05 from '../../../assets/icons/vacancies/i05.svg';
import icon06 from '../../../assets/icons/vacancies/i06.svg';

import ic01 from '../../../assets/icons/vacancies/ic01.svg';
import ic02 from '../../../assets/icons/vacancies/ic02.svg';
import ic03 from '../../../assets/icons/vacancies/ic03.svg';
import ic04 from '../../../assets/icons/vacancies/ic04.svg';
import ic05 from '../../../assets/icons/vacancies/ic05.svg';

const benefits = [
  {
    icon: icon01,
    title: 'Розвиток',
    text: 'Навчання, менторство та професійне зростання',
  },
  {
    icon: icon02,
    title: 'Команда',
    text: 'Підтримка, відкритість і спільні цілі',
  },
  {
    icon: icon03,
    title: 'Вплив',
    text: 'Твої ідеї змінюють сучасну освіту на краще щодня.',
  },
  {
    icon: icon04,
    title: 'Гнучкість',
    text: 'Віддалена робота та зручний графік для комфортної роботи.',
  },
  {
    icon: icon05,
    title: 'Інновації',
    text: 'Сучасні технології та простір для нових ідей',
  },
  {
    icon: icon06,
    title: 'Баланс',
    text: 'Робота, розвиток і час для себе та відпочинку.',
  },
];

const vacancies = [
  {
    id: 1,
    title: 'UI/UX Designer',
    category: 'Дизайн',
    employment: 'Повна зайнятість',
    level: 'Middle+',
    format: 'Віддалено',
  },
  {
    id: 2,
    title: 'UI/UX Designer',
    category: 'Дизайн',
    employment: 'Повна зайнятість',
    level: 'Middle+',
    format: 'Віддалено',
  },
  {
    id: 3,
    title: 'UI/UX Designer',
    category: 'Дизайн',
    employment: 'Повна зайнятість',
    level: 'Middle+',
    format: 'Віддалено',
  },
  {
    id: 4,
    title: 'UI/UX Designer',
    category: 'Дизайн',
    employment: 'Повна зайнятість',
    level: 'Middle+',
    format: 'Віддалено',
  },
  {
    id: 5,
    title: 'UI/UX Designer',
    category: 'Дизайн',
    employment: 'Повна зайнятість',
    level: 'Middle+',
    format: 'Віддалено',
  },
];

const values = [
  {
    icon: ic01,
    title: 'Люди перш за все',
  },
  {
    icon: ic02,
    title: 'Інновації в освіті',
  },
  {
    icon: ic03,
    title: 'Прозорість і довіра',
  },
  {
    icon: ic04,
    title: 'Різноманітність і рівні можливості',
  },
  {
    icon: ic05,
    title: 'Соціальна відповідальність',
  },
];

const Vacancies = () => {
  const navigate = useNavigate();

  return (
    <main className={styles.page}>
      <Container>
        <Breadcrumbs title='Головна' link='/' pages='Кар’єра' />

        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1>Приєднуйся до команди VEXA</h1>

            <p>
              Створюй разом з нами освітнє майбутнє України. Ми відкриті до талантів, які поділяють наші цінності та хочуть змінювати світ через знання.
            </p>

            <Button onClick={() => navigate(routes.allVacancies())} title='Переглянути всі вакансії' />
          </div>

          <div className={styles.heroImage}>
            <img src={heroImg} alt="Команда VEXA" />
          </div>
        </section>

        <section className={styles.benefits}>
          <h2>Чому варто приєднатися?</h2>

          <div className={styles.benefitsGrid}>
            {benefits.map((benefit) => (
              <article className={styles.benefitCard} key={benefit.title}>
                <img src={benefit.icon} className={styles.benefitIcon} />
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.vacancies} id="vacancies">
          <div className={styles.sectionHeader}>
            <h2>Відкриті вакансії</h2>

            <button className={styles.allVacancies} type="button" onClick={() => navigate(routes.allVacancies())}>
              Дивитися всі вакансії →
            </button>
          </div>

          <div className={styles.vacanciesContent}>
            <div className={styles.vacanciesImage}>
              <img src={vacanciesImg} alt="Вакансії VEXA" />
            </div>

            <div className={styles.vacanciesList}>
              {vacancies.map((vacancy) => (
                <article className={styles.vacancyCard} key={vacancy.id}>
                  <div className={styles.vacancyInfo}>
                    <h3>{vacancy.title}</h3>

                    <p>
                      {vacancy.category} · {vacancy.employment}
                    </p>
                  </div>

                  <div className={styles.vacancyTags}>
                    <span className={styles.levelTag}>{vacancy.level}</span>
                    <span className={styles.formatTag}>{vacancy.format}</span>
                  </div>

                  <button className={styles.vacancyArrow} type="button" aria-label={`Відкрити вакансію ${vacancy.title}`}>
                    →
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.values}>
          <h2>Наші цінності</h2>

          <div className={styles.valuesGrid}>
            {values.map((value) => (
              <article className={styles.valueCard} key={value.title}>
                <img src={value.icon} className={styles.valueIcon} />
                <span>{value.title}</span>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.resume}>
          <div className={styles.resumeContent}>
            <h2>Твій талант має значення</h2>

            <p>
              Не знайшов підходящу вакансію, але хочеш стати частиною нашої команди? Надішли своє резюме — можливо, саме тебе ми шукаємо.
            </p>

            <Button title='Надіслати резюме' />
          </div>

          <div className={styles.resumeImage}>
            <img src={resumeImg} alt="Надіслати резюме до VEXA" />
          </div>
        </section>
      </Container>
    </main>
  );
};

export default Vacancies;