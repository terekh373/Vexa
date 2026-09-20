import { Link } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { Container } from '../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs.jsx';

import heroImage from '../../assets/images/categories/categories-hero.png';

import programmingIcon from '../../assets/icons/categories/programming.svg';
import designIcon from '../../assets/icons/categories/design.svg';
import marketingIcon from '../../assets/icons/categories/marketing.svg';
import businessIcon from '../../assets/icons/categories/business.svg';
import personalDevelopmentIcon from '../../assets/icons/categories/personal-development.svg';
import photoIcon from '../../assets/icons/categories/photo.svg';
import musicIcon from '../../assets/icons/categories/music.svg';
import sportIcon from '../../assets/icons/categories/sport.svg';
import languagesIcon from '../../assets/icons/categories/languages.svg';
import creativityIcon from '../../assets/icons/categories/creativity.svg';
import scienceIcon from '../../assets/icons/categories/science.svg';
import technologiesIcon from '../../assets/icons/categories/technologies.svg';

import styles from './Categories.module.css';

const categories = [
  {
    id: 1,
    title: 'Програмування',
    coursesCount: 2560,
    slug: 'programming',
    icon: programmingIcon,
  },
  {
    id: 2,
    title: 'Дизайн',
    coursesCount: 1340,
    slug: 'design',
    icon: designIcon,
  },
  {
    id: 3,
    title: 'Маркетинг',
    coursesCount: 980,
    slug: 'marketing',
    icon: marketingIcon,
  },
  {
    id: 4,
    title: 'Бізнес',
    coursesCount: 860,
    slug: 'business',
    icon: businessIcon,
  },
  {
    id: 5,
    title: 'Особистий розвиток',
    coursesCount: 720,
    slug: 'personal-development',
    icon: personalDevelopmentIcon,
  },
  {
    id: 6,
    title: 'Фото і відео',
    coursesCount: 640,
    slug: 'photo-and-video',
    icon: photoIcon,
  },
  {
    id: 7,
    title: 'Музика',
    coursesCount: 520,
    slug: 'music',
    icon: musicIcon,
  },
  {
    id: 8,
    title: "Здоров’я і спорт",
    coursesCount: 410,
    slug: 'health-and-sport',
    icon: sportIcon,
  },
  {
    id: 9,
    title: 'Мови',
    coursesCount: 1250,
    slug: 'languages',
    icon: languagesIcon,
  },
  {
    id: 10,
    title: 'Творчість',
    coursesCount: 590,
    slug: 'creativity',
    icon: creativityIcon,
  },
  {
    id: 11,
    title: 'Навчання і наука',
    coursesCount: 830,
    slug: 'education-and-science',
    icon: scienceIcon,
  },
  {
    id: 12,
    title: 'IT та технології',
    coursesCount: 1150,
    slug: 'it-and-technologies',
    icon: technologiesIcon,
  },
];

const formatCoursesCount = (count) =>
  new Intl.NumberFormat('uk-UA').format(count);

const CategoryCard = ({ category }) => (
  <Link
    className={styles.categoryCard}
    to={routes.category(category.slug)}
  >
    <img
      className={styles.categoryIcon}
      src={category.icon}
      alt=""
      aria-hidden="true"
    />

    <h2>{category.title}</h2>

    <div className={styles.cardFooter}>
      <span>
        {formatCoursesCount(category.coursesCount)} курсів
      </span>

      <span className={styles.arrow} aria-hidden="true">
        ›
      </span>
    </div>
  </Link>
);

const Categories = () => {
  return (
    <div className={styles.categoriesPage}>
      <Container>
        <Breadcrumbs
          title="Головна"
          link="/"
          pages="Всі категорії"
        />

        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1>Всі категорії</h1>

            <p>
              Оберіть напрямок, який цікавить вас найбільше, та
              знаходьте найкращі курси для розвитку і досягнення
              ваших цілей.
            </p>

            <span className={styles.found}>
              Знайдено категорій {categories.length}
            </span>
          </div>

          <div className={styles.heroImageWrapper}>
            <img
              className={styles.heroImage}
              src={heroImage}
              alt="Категорії курсів Vexa"
            />
          </div>
        </section>

        <section
          className={styles.categoriesGrid}
          aria-label="Категорії курсів"
        >
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
            />
          ))}
        </section>
      </Container>
    </div>
  );
};

export default Categories;