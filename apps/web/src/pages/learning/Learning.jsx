import { useMemo, useState } from 'react';

import { routes } from '@vexa/shared';

import { Container } from '../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import { Search } from '../../components/ui/search/Search.jsx';

import { learningCourses } from '../../data/learningCourses.js';

import LearningCourseCard from './LearningCourseCard.jsx';

import ArrowDownIcon from '../../assets/icons/arrow-down-purple.svg';
import Icon01 from '../../assets/icons/learning/01.svg';
import Icon02 from '../../assets/icons/learning/02.svg';
import Icon03 from '../../assets/icons/learning/03.svg';

import styles from './Learning.module.css';

const Learning = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [sort, setSort] = useState('DEFAULT');

  const categories = useMemo(() => {
    return [
      ...new Set(
        learningCourses.map((course) => course.category)
      ),
    ];
  }, []);

  const filteredCourses = useMemo(() => {
    let result = [...learningCourses];

    if (search.trim()) {
      const query = search.trim().toLowerCase();

      result = result.filter((course) =>
        course.title.toLowerCase().includes(query)
      );
    }

    if (filter === 'SAVED') {
      result = result.filter((course) => course.isSaved);
    } else if (filter !== 'ALL') {
      result = result.filter(
        (course) => course.status === filter
      );
    }

    if (category !== 'ALL') {
      result = result.filter(
        (course) => course.category === category
      );
    }

    if (sort === 'PROGRESS_ASC') {
      result.sort(
        (a, b) => a.progress - b.progress
      );
    }

    if (sort === 'PROGRESS_DESC') {
      result.sort(
        (a, b) => b.progress - a.progress
      );
    }

    return result;
  }, [search, filter, category, sort]);

  const activeCourses = learningCourses.filter(
    (course) => course.status === 'IN_PROGRESS'
  ).length;

  const completedCourses = learningCourses.filter(
    (course) => course.status === 'COMPLETED'
  ).length;

  const averageProgress = learningCourses.length
    ? Math.round(
        learningCourses.reduce(
          (sum, course) => sum + course.progress,
          0
        ) / learningCourses.length
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
              className={
                filter === 'ALL'
                  ? styles.activeTab
                  : ''
              }
              onClick={() => setFilter('ALL')}
            >
              Усі курси
            </button>

            <button
              type="button"
              className={
                filter === 'IN_PROGRESS'
                  ? styles.activeTab
                  : ''
              }
              onClick={() => setFilter('IN_PROGRESS')}
            >
              У процесі
            </button>

            <button
              type="button"
              className={
                filter === 'COMPLETED'
                  ? styles.activeTab
                  : ''
              }
              onClick={() => setFilter('COMPLETED')}
            >
              Завершені
            </button>

            <button
              type="button"
              className={
                filter === 'SAVED'
                  ? styles.activeTab
                  : ''
              }
              onClick={() => setFilter('SAVED')}
            >
              Збережені
            </button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <Search
            size="medium"
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Знайти курс"
          />

          <div className={styles.selectWrapper}>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              className={styles.select}
            >
              <option value="ALL">
                Усі категорії
              </option>

              {categories.map((item) => (
                <option
                  key={item}
                  value={item}
                >
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
              onChange={(event) =>
                setSort(event.target.value)
              }
              className={styles.select}
            >
              <option value="DEFAULT">
                За прогресом
              </option>

              <option value="PROGRESS_DESC">
                Найбільший прогрес
              </option>

              <option value="PROGRESS_ASC">
                Найменший прогрес
              </option>
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
                <img src={Icon01} alt='' />
                <span>Активні курси</span>
              </div>
              <strong>{activeCourses}</strong>
            </div>

            <div className={styles.stat}>
              <div className={styles.row}>
                <img src={Icon02} alt='' />
                <span>Завершені</span>
              </div>
              <strong>{completedCourses}</strong>
            </div>

            <div className={styles.stat}>
              <div className={styles.row}>
                <img src={Icon03} alt='' />
                <span>Середній прогрес</span>
              </div>
              <strong>{averageProgress}%</strong>
            </div>
          </div>
        </div>

        {filteredCourses.length > 0 ? (
          <div className={styles.grid}>
            {filteredCourses.map((course) => (
              <LearningCourseCard
                key={course.id}
                course={course}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <h2>Курсів не знайдено</h2>

            <p>
              Спробуйте змінити пошук або фільтри.
            </p>
          </div>
        )}
      </Container>
    </section>
  );
};

export default Learning;