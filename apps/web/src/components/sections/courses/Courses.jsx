import { useEffect, useState } from 'react';

import styles from './Courses.module.css';
import { Container } from '../../layout/container/Container';
import { OpenMore } from '../../ui/openmore/OpenMore';
import CourseCard from '../../ui/cards/course-card/CourseCard.jsx';
import { fetchCatalog } from '../../../services/coursesService.js';

const Courses = () => {
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [newCourses, setNewCourses] = useState([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchCatalog({ sort: 'popularity', page: 1, limit: 5 }),
      fetchCatalog({ sort: 'date', page: 1, limit: 5 }),
    ])
      .then(([recommended, newest]) => {
        if (cancelled) return;

        setRecommendedCourses(recommended.items || []);
        setNewCourses(newest.items || []);
      })
      .catch(() => {
        if (cancelled) return;

        setRecommendedCourses([]);
        setNewCourses([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Container>
      <section className={styles.container}>
        <div className={styles.box}>
          <OpenMore title="Рекомендовані курси" bttnTxt="Всі категорії" />
          <ul className={styles.cardlist}>
            {recommendedCourses.map((card) => (
              <li key={card.id}>
                <CourseCard card={card} />
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.box}>
          <OpenMore title="Нові курси" bttnTxt="Всі категорії" />
          <ul className={styles.cardlist}>
            {newCourses.map((card) => (
              <li key={card.id}>
                <CourseCard card={card} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Container>
  );
};

export default Courses;
