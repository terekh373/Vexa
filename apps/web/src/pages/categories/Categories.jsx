import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { routes } from '@vexa/shared';

import { Container } from '../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import Button from '../../components/ui/buttons/Button.jsx';

import {
  getCategories,
  getCoursesCountByCategory,
} from '../../services/coursesService.js';

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


const categoryIcons = {
  // реальные категории с API
  'shkilni-predmety': scienceIcon,
  'pidhotovka-nmt': programmingIcon,
  'sport-i-zdorovia': sportIcon,

  // оставляем остальные на случай,
  // если эти категории появятся на сервере
  programming: programmingIcon,
  design: designIcon,
  marketing: marketingIcon,
  business: businessIcon,
  'personal-development': personalDevelopmentIcon,
  'photo-and-video': photoIcon,
  music: musicIcon,
  'health-and-sport': sportIcon,
  languages: languagesIcon,
  creativity: creativityIcon,
  'education-and-science': scienceIcon,
  'it-and-technologies': technologiesIcon,
};


const formatCoursesCount = (count = 0) => {
  return new Intl.NumberFormat('uk-UA').format(count);
};


const CategoryCard = ({ category }) => {
  const icon = categoryIcons[category.slug] ?? technologiesIcon;

  return (
    <Link
      className={styles.categoryCard}
      to={routes.catalog({
        category: category.slug,
      })}
    >
      <img
        className={styles.categoryIcon}
        src={icon}
        alt=""
        aria-hidden="true"
      />

      <h2>{category.nameUk}</h2>

      <div className={styles.cardFooter}>
        <span>
          {formatCoursesCount(category.coursesCount)} курсів
        </span>

        <span
          className={styles.arrow}
          aria-hidden="true"
        >
          ›
        </span>
      </div>
    </Link>
  );
};


const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);


  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      // Получаем категории с сервера
      const data = await getCategories();

      const rootCategories = Array.isArray(data?.items)
        ? data.items
            .filter((category) => category.parentId === null)
            .sort(
              (a, b) =>
                (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
            )
        : [];

      // Для каждой категории получаем реальное
      // количество курсов через total
      const categoriesWithCount = await Promise.all(
        rootCategories.map(async (category) => {
          try {
            const coursesCount =
              await getCoursesCountByCategory(
                category.slug,
              );

            return {
              ...category,
              coursesCount,
            };
          } catch (error) {
            console.error(
              `Failed to load courses count for ${category.slug}:`,
              error,
            );

            return {
              ...category,
              coursesCount: 0,
            };
          }
        }),
      );

      setCategories(categoriesWithCount);
    } catch (error) {
      console.error(
        'Failed to load categories:',
        error,
      );

      setCategories([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    loadCategories();
  }, [loadCategories]);


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
              Оберіть напрямок, який цікавить вас найбільше,
              та знаходьте найкращі курси для розвитку і
              досягнення ваших цілей.
            </p>

            {!loading && !error && (
              <span className={styles.found}>
                Знайдено категорій {categories.length}
              </span>
            )}
          </div>

          <div className={styles.heroImageWrapper}>
            <img
              className={styles.heroImage}
              src={heroImage}
              alt="Категорії курсів Vexa"
            />
          </div>
        </section>


        {loading && (
          <div className={styles.state}>
            Завантажуємо категорії...
          </div>
        )}


        {!loading && error && (
          <div
            className={styles.state}
            role="alert"
          >
            <p>
              Не вдалося завантажити категорії.
            </p>

            <Button
              title="Спробувати ще"
              size="small"
              variant="secondary"
              onClick={loadCategories}
            />
          </div>
        )}


        {!loading &&
          !error &&
          categories.length === 0 && (
            <div className={styles.state}>
              Категорій поки немає.
            </div>
          )}


        {!loading &&
          !error &&
          categories.length > 0 && (
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
          )}
      </Container>
    </div>
  );
};


export default Categories;