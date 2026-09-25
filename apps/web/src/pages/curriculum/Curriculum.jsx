import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { routes } from '@vexa/shared';

import { Container } from '../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import { getCurriculum } from '../../services/curriculumService.js';

import styles from './Curriculum.module.css';

const Curriculum = () => {
  const { subjectSlug, grade: gradeParam } = useParams();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getCurriculum()
      .then((items) => {
        if (active) setSubjects(items);
      })
      .catch(() => {
        if (active) setError('Не вдалося завантажити шкільну програму.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const subject = useMemo(
    () => subjects.find((item) => item.slug === subjectSlug) ?? null,
    [subjectSlug, subjects],
  );

  const grade = gradeParam ? Number(gradeParam) : null;
  const gradeGroup = useMemo(
    () => subject?.grades?.find((item) => item.grade === grade) ?? null,
    [grade, subject],
  );

  if (loading) {
    return (
      <Container>
        <main className={styles.page}>
          <p role="status">Завантаження шкільної програми...</p>
        </main>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <main className={styles.page}>
          <div className={styles.stateBox}>{error}</div>
        </main>
      </Container>
    );
  }

  if (!subject || (gradeParam && (!Number.isInteger(grade) || grade < 1 || grade > 11 || !gradeGroup))) {
    return (
      <Container>
        <main className={styles.page}>
          <div className={styles.stateBox}>
            <h1>Розділ програми не знайдено</h1>
            <Link to={routes.catalog()}>Повернутися до каталогу</Link>
          </div>
        </main>
      </Container>
    );
  }

  const outsideProgramme = subject.grades?.find((item) => item.grade === null);
  const schoolGrades = subject.grades?.filter((item) => item.grade !== null) ?? [];

  return (
    <Container>
      <main className={styles.page}>
        <Breadcrumbs
          title="Каталог"
          link={routes.catalog()}
          pages={gradeParam ? `${subject.nameUk}, ${grade} клас` : subject.nameUk}
        />

        <div className={styles.headingRow}>
          <div>
            <p className={styles.eyebrow}>Шкільна програма</p>
            <h1 className={styles.title}>{subject.nameUk}</h1>
            <p className={styles.subtitle}>
              {gradeParam
                ? `Оберіть тему для ${grade} класу.`
                : 'Оберіть клас, а потім тему, щоб знайти відповідні курси й матеріали.'}
            </p>
          </div>

          <Link
            className={styles.catalogLink}
            to={routes.catalog(
              gradeParam
                ? { subject: subject.slug, grade }
                : { subject: subject.slug },
            )}
          >
            {gradeParam ? `Усі матеріали ${grade} класу` : 'Усі матеріали предмета'}
          </Link>
        </div>

        {!gradeParam ? (
          <>
            <section className={styles.section}>
              <h2>Класи</h2>
              <div className={styles.grid}>
                {schoolGrades.map((group) => (
                  <Link
                    key={group.grade}
                    className={styles.card}
                    to={routes.curriculumGrade(subject.slug, group.grade)}
                  >
                    <strong>{group.grade} клас</strong>
                    <span>{group.topics.length} тем</span>
                  </Link>
                ))}
              </div>
            </section>

            {outsideProgramme?.topics?.length > 0 && (
              <section className={styles.section}>
                <h2>Поза програмою</h2>
                <div className={styles.topicList}>
                  {outsideProgramme.topics.map((topic) => (
                    <Link
                      key={topic.id}
                      className={styles.topicLink}
                      to={routes.catalog({ topic: topic.id })}
                    >
                      {topic.title}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <h2>{grade} клас</h2>
              <Link className={styles.backLink} to={routes.curriculumSubject(subject.slug)}>
                ← Обрати інший клас
              </Link>
            </div>

            {gradeGroup.topics.length > 0 ? (
              <div className={styles.topicList}>
                {gradeGroup.topics.map((topic) => (
                  <Link
                    key={topic.id}
                    className={styles.topicLink}
                    to={routes.catalog({ topic: topic.id })}
                  >
                    {topic.title}
                  </Link>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>Для цього класу тем поки немає.</p>
            )}
          </section>
        )}
      </main>
    </Container>
  );
};

export default Curriculum;
