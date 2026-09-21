import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@vexa/shared';

import styles from './Courses.module.css';
import { Container } from '../../layout/container/Container';
import { OpenMore } from '../../ui/openmore/OpenMore';
import Button from '../../ui/buttons/Button.jsx';
import CourseCard from '../../ui/cards/course-card/CourseCard.jsx';
import CourseSkeleton from '../../ui/skeleton/CourseSkeleton.jsx';
import { getCourses } from '../../../services/coursesService.js';

const COURSE_LIMIT = 5;
const SKELETONS = Array.from({ length: COURSE_LIMIT }, (_, index) => index);

const CourseBlock = ({ title, courses, loading, error, onRetry, onOpenCatalog }) => (
  <div className={styles.box}>
    <OpenMore
      title={title}
      bttnTxt='Всі курси'
      onClick={onOpenCatalog}
    />

    {loading && (
      <ul className={styles.cardlist} aria-label={`${title}: завантаження`}>
        {SKELETONS.map((item) => (
          <li key={item}>
            <CourseSkeleton />
          </li>
        ))}
      </ul>
    )}

    {!loading && error && (
      <div className={styles.stateBox} role='alert'>
        <p>Не вдалося завантажити курси.</p>
        <Button
          title='Спробувати ще'
          variant='secondary'
          size='small'
          onClick={onRetry}
        />
      </div>
    )}

    {!loading && !error && courses.length === 0 && (
      <div className={styles.stateBox}>
        <p>Курсів у цьому блоці поки немає.</p>
      </div>
    )}

    {!loading && !error && courses.length > 0 && (
      <ul className={styles.cardlist}>
        {courses.map((course) => (
          <li key={course.id}>
            <CourseCard card={course} />
          </li>
        ))}
      </ul>
    )}
  </div>
);

const Courses = () => {
  const navigate = useNavigate();
  const [newCourses, setNewCourses] = useState([]);
  const [topCourses, setTopCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCoursesError, setNewCoursesError] = useState(false);
  const [topCoursesError, setTopCoursesError] = useState(false);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setNewCoursesError(false);
    setTopCoursesError(false);

    const [newResult, topResult] = await Promise.allSettled([
      getCourses({ sort: 'date', limit: COURSE_LIMIT }),
      getCourses({ sort: 'rating', limit: COURSE_LIMIT }),
    ]);

    if (newResult.status === 'fulfilled') {
      const items = Array.isArray(newResult.value?.items) ? newResult.value.items : [];
      setNewCourses(items.map((course) => ({ ...course, isNew: true })));
    } else {
      setNewCourses([]);
      setNewCoursesError(true);
    }

    if (topResult.status === 'fulfilled') {
      const items = Array.isArray(topResult.value?.items) ? topResult.value.items : [];
      setTopCourses(items);
    } else {
      setTopCourses([]);
      setTopCoursesError(true);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const openCatalog = () => {
    navigate(routes.catalog());
  };

  return (
    <Container>
      <section className={styles.container}>
        <CourseBlock
          title='Нові курси'
          courses={newCourses}
          loading={loading}
          error={newCoursesError}
          onRetry={loadCourses}
          onOpenCatalog={openCatalog}
        />

        <CourseBlock
          title='Топ за рейтингом'
          courses={topCourses}
          loading={loading}
          error={topCoursesError}
          onRetry={loadCourses}
          onOpenCatalog={openCatalog}
        />
      </section>
    </Container>
  );
};

export default Courses;
