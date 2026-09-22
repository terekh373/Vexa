import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { routes } from '@vexa/shared';

import authorFallback from '../../assets/images/for-course-images/author-avatar.png';
import { Container } from '../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import CourseGrid from '../../components/ui/course-grid/CourseGrid.jsx';
import { getPublicAuthorProfile } from '../../services/authorProfileService.js';
import NotFound from '../not-found/NotFound.jsx';
import styles from './AuthorProfilePage.module.css';

const AuthorProfilePage = () => {
  const { idOrSlug } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getPublicAuthorProfile(idOrSlug)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setError('not-found');
          return;
        }
        setProfile(data);
      })
      .catch(() => {
        if (!cancelled) setError('server');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [idOrSlug]);

  if (loading) {
    return (
      <Container>
        <div className={styles.state}>Завантаження профілю автора...</div>
      </Container>
    );
  }

  if (error === 'not-found') return <NotFound />;

  if (error || !profile) {
    return (
      <Container>
        <div className={styles.state}>Не вдалося завантажити профіль автора.</div>
      </Container>
    );
  }

  const courses = Array.isArray(profile.courses) ? profile.courses : [];

  return (
    <Container>
      <main className={styles.page}>
        <Breadcrumbs title="Головна" link={routes.home()} pages={profile.displayName} />

        <section className={styles.hero}>
          <img
            src={profile.avatar?.url || authorFallback}
            alt={profile.displayName}
            className={styles.avatar}
          />

          <div className={styles.info}>
            <div className={styles.nameRow}>
              <h1>{profile.displayName}</h1>
              {profile.isVerified && <span className={styles.verified}>Перевірений автор</span>}
            </div>
            {profile.headline && <p className={styles.headline}>{profile.headline}</p>}
            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
          </div>

          <dl className={styles.stats}>
            <div><dt>{profile.studentsCount ?? 0}</dt><dd>студентів</dd></div>
            <div><dt>{Number(profile.ratingAvg ?? 0).toFixed(1)}</dt><dd>рейтинг</dd></div>
            <div><dt>{profile.reviewsCount ?? 0}</dt><dd>відгуків</dd></div>
          </dl>
        </section>

        <section className={styles.coursesSection}>
          <div className={styles.sectionHeader}>
            <div>
              <span>Портфоліо</span>
              <h2>Опубліковані курси</h2>
            </div>
            <strong>{courses.length}</strong>
          </div>

          {courses.length > 0 ? (
            <CourseGrid courses={courses} />
          ) : (
            <p className={styles.empty}>Автор ще не має опублікованих курсів.</p>
          )}
        </section>
      </main>
    </Container>
  );
};

export default AuthorProfilePage;
