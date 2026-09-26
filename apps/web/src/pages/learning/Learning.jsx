import { useEffect, useMemo, useState } from 'react';

import { routes } from '@vexa/shared';

import { Container } from '../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import { Search } from '../../components/ui/search/Search.jsx';
import LearningCourseCard from './LearningCourseCard.jsx';

import { getCourseEnrollments } from '../../services/learningService.js';

import ArrowDownIcon from '../../assets/icons/arrow-down-purple.svg';
import Icon01 from '../../assets/icons/learning/01.svg';
import Icon02 from '../../assets/icons/learning/02.svg';
import Icon03 from '../../assets/icons/learning/03.svg';

import styles from './Learning.module.css';

const Learning = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [sort, setSort] = useState('DEFAULT');

  useEffect(() => {
    let cancelled = false;

    const loadCourses = async () => {
      try {
        setLoading(true);
        setError(false);

        const items = await getCourseEnrollments();

        if (!cancelled) {
          setCourses(items);
        }
      } catch (loadError) {
        console.error('Не вдалося завантажити навчання:', loadError);

        if (!cancelled) {
          setCourses([]);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    return [
      ...new Set(
        courses
          .map((item) => item.course?.category?.name)
          .filter(Boolean),
      ),
    ];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    let result = [...courses];

    if (search.trim()) {
      const query = search.trim().toLowerCase();

      result = result.filter((item) =>
        item.course?.title?.toLowerCase().includes(query),
      );
    }

    if (filter !== 'ALL') {
      result = result.filter(
        (item) => item.progress?.state === filter,
      );
    }

    if (category !== 'ALL') {
      result = result.filter(
        (item) => item.course?.category?.name === category,
      );
    }

    if (sort === 'PROGRESS_ASC') {
      result.sort(
        (a, b) => (a.progress?.percent ?? 0) - (b.progress?.percent ?? 0),
      );
    }

    if (sort === 'PROGRESS_DESC') {
      result.sort(
        (a, b) => (b.progress?.percent ?? 0) - (a.progress?.percent ?? 0),
      );
    }

    return result;
  }, [courses, search, filter, category, sort]);

  const activeCourses = courses.filter(
    (item) => item.progress?.state === 'IN_PROGRESS',
  ).length;

  const completedCourses = courses.filter(
    (item) => item.progress?.state === 'COMPLETED',
  ).length;

  const averageProgress = courses.length
    ? Math.round(
        courses.reduce(
          (sum, item) => sum + (item.progress?.percent ?? 0),
          0,
        ) / courses.length,
      )
    : 0;

  return (
    <section className={styles.learning}>
      <Container>
        <Breadcrumbs
          title="Головна"
          link={routes.home()}
          pages="Мої курси"
        />

        <div className={styles.heading}>
          <div>
            <h1>Мої курси</h1>
            <p>
              Продовжуйте навчання та стежте за своїм прогресом
            </p>
          </div>

          <div className={styles.tabs}>
            <button
              type="button"
              className={filter === 'ALL' ? styles.activeTab : ''}
              onClick={() => setFilter('ALL')}
            >
              Усі курси
            </button>

            <button
              type="button"
              className={filter === 'NOT_STARTED' ? styles.activeTab : ''}
              onClick={() => setFilter('NOT_STARTED')}
            >
              Не розпочаті
            </button>

            <button
              type="button"
              className={filter === 'IN_PROGRESS' ? styles.activeTab : ''}
              onClick={() => setFilter('IN_PROGRESS')}
            >
              У процесі
            </button>

            <button
              type="button"
              className={filter === 'COMPLETED' ? styles.activeTab : ''}
              onClick={() => setFilter('COMPLETED')}
            >
              Завершені
            </button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <Search
            size="medium"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Знайти курс"
          />

          <div className={styles.selectWrapper}>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={styles.select}
            >
              <option value="ALL">Усі категорії</option>

              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <img
              src={ArrowDownIcon}
              alt=""
              aria-hidden="true"
              className={styles.selectArrow}
            />
          </div>

          <div className={styles.selectWrapper}>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className={styles.select}
            >
              <option value="DEFAULT">За замовчуванням</option>
              <option value="PROGRESS_DESC">Найбільший прогрес</option>
              <option value="PROGRESS_ASC">Найменший прогрес</option>
            </select>

            <img
              src={ArrowDownIcon}
              alt=""
              aria-hidden="true"
              className={styles.selectArrow}
            />
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.row}>
                <img src={Icon01} alt="" />
                <span>Активні курси</span>
              </div>

              <strong>{activeCourses}</strong>
            </div>

            <div className={styles.stat}>
              <div className={styles.row}>
                <img src={Icon02} alt="" />
                <span>Завершені</span>
              </div>

              <strong>{completedCourses}</strong>
            </div>

            <div className={styles.stat}>
              <div className={styles.row}>
                <img src={Icon03} alt="" />
                <span>Середній прогрес</span>
              </div>

              <strong>{averageProgress}%</strong>
            </div>
          </div>
        </div>

        {loading ? (
          <div className={styles.empty}>
            <p>Завантаження курсів...</p>
          </div>
        ) : error ? (
          <div className={styles.empty}>
            <h2>Не вдалося завантажити курси</h2>
            <p>Спробуйте оновити сторінку.</p>
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className={styles.grid}>
            {filteredCourses.map((enrollment) => (
              <LearningCourseCard
                key={enrollment.id}
                enrollment={enrollment}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <h2>Курсів не знайдено</h2>
            <p>
              {courses.length === 0
                ? 'У вас поки немає курсів.'
                : 'Спробуйте змінити пошук або фільтри.'}
            </p>
          </div>
        )}
      </Container>
    </section>
  );
};

export default Learning;