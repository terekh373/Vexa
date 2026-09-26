import { useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import { routes } from '@vexa/shared';

import { Container } from '../../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import { Search } from '../../../components/ui/search/Search.jsx';

import {
  getFileDownloadUrl,
  getLearningCourse,
  getMaterialEnrollments,
} from '../../../services/learningService.js';

import ArrowDownIcon from '../../../assets/icons/arrow-down-purple.svg';
import fallbackImage from '../../../assets/images/img01.png';

import styles from './LearningMaterials.module.css';

const formatSize = (sizeBytes) => {
  const bytes = Number(sizeBytes);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 Б';
  }

  if (bytes < 1024) {
    return `${bytes} Б`;
  }

  if (bytes < 1024 ** 2) {
    return `${(bytes / 1024).toFixed(1)} КБ`;
  }

  if (bytes < 1024 ** 3) {
    return `${(bytes / 1024 ** 2).toFixed(1)} МБ`;
  }

  return `${(bytes / 1024 ** 3).toFixed(1)} ГБ`;
};

const getFilesLabel = (count) => {
  const value = Number(count) || 0;
  const lastDigit = value % 10;
  const lastTwoDigits = value % 100;

  if (lastDigit === 1 && lastTwoDigits !== 11) {
    return `${value} файл`;
  }

  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 12 || lastTwoDigits > 14)
  ) {
    return `${value} файли`;
  }

  return `${value} файлів`;
};

const LearningMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [format, setFormat] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [openedCourseId, setOpenedCourseId] = useState(null);
  const [courseFiles, setCourseFiles] = useState({});
  const [filesLoadingCourseId, setFilesLoadingCourseId] = useState(null);
  const [filesErrorCourseId, setFilesErrorCourseId] = useState(null);
  const [downloadingFileId, setDownloadingFileId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadMaterials = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await getMaterialEnrollments();

        if (!cancelled) {
          setMaterials(data);
        }
      } catch (error) {
        console.error('Не вдалося завантажити матеріали:', error);

        if (!cancelled) {
          setError(
            'Не вдалося завантажити матеріали. Спробуйте оновити сторінку.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadMaterials();

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    return [
      ...new Set(
        materials
          .map((item) => item.course?.category?.name)
          .filter(Boolean),
      ),
    ];
  }, [materials]);

  const formats = useMemo(() => {
    return [
      ...new Set(
        materials.flatMap(
          (item) => item.materials?.formats ?? [],
        ),
      ),
    ];
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    let result = [...materials];

    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter((item) => {
        const title = item.course?.title?.toLowerCase() ?? '';
        const author = item.course?.author?.name?.toLowerCase() ?? '';

        return title.includes(query) || author.includes(query);
      });
    }

    if (category !== 'ALL') {
      result = result.filter(
        (item) => item.course?.category?.name === category,
      );
    }

    if (format !== 'ALL') {
      result = result.filter((item) =>
        item.materials?.formats?.includes(format),
      );
    }

    return result;
  }, [materials, search, category, format]);

  const handleToggleFiles = async (courseId) => {
    if (openedCourseId === courseId) {
      setOpenedCourseId(null);
      return;
    }

    setOpenedCourseId(courseId);
    setFilesErrorCourseId(null);

    if (courseFiles[courseId]) {
      return;
    }

    try {
      setFilesLoadingCourseId(courseId);

      const data = await getLearningCourse(courseId);

      setCourseFiles((current) => ({
        ...current,
        [courseId]: data.materials ?? [],
      }));
    } catch (error) {
      console.error('Не вдалося завантажити файли:', error);

      setFilesErrorCourseId(courseId);
    } finally {
      setFilesLoadingCourseId(null);
    }
  };

  const handleDownload = async (fileId) => {
    try {
      setDownloadingFileId(fileId);

      const { downloadUrl } = await getFileDownloadUrl(fileId);

      window.open(
        downloadUrl,
        '_blank',
        'noopener,noreferrer',
      );
    } catch (error) {
      console.error('Не вдалося завантажити файл:', error);
    } finally {
      setDownloadingFileId(null);
    }
  };

  return (
    <section className={styles.materials}>
      <Container>
        <Breadcrumbs
          title="Головна"
          link={routes.home()}
          pages="Мої матеріали"
        />

        <div className={styles.heading}>
          <div>
            <h1>Мої матеріали</h1>
            <p>
              Завантажуйте придбані навчальні матеріали у будь-який час
            </p>
          </div>

          <nav className={styles.navigation}>
            <Link to={routes.learning()}>
              Мої курси
            </Link>

            <Link
              to={routes.learningMaterials()}
              className={styles.active}
            >
              Мої матеріали
            </Link>

            <Link to={routes.orders()}>
              Замовлення
            </Link>

            <Link to={routes.settings()}>
              Налаштування
            </Link>
          </nav>
        </div>

        {loading ? (
          <div className={styles.empty}>
            <h2>Завантаження...</h2>
            <p>Отримуємо ваші навчальні матеріали.</p>
          </div>
        ) : error ? (
          <div className={styles.empty}>
            <h2>Не вдалося завантажити матеріали</h2>
            <p>{error}</p>
          </div>
        ) : materials.length === 0 ? (
          <div className={styles.empty}>
            <h2>Матеріалів поки немає</h2>
            <p>Придбані навчальні матеріали з’являться тут.</p>
          </div>
        ) : (
          <>
            <div className={styles.toolbar}>
              <Search
                size="medium"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Знайти матеріал"
              />

              <div className={styles.selectWrapper}>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className={styles.select}
                >
                  <option value="ALL">
                    Усі категорії
                  </option>

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
                  value={format}
                  onChange={(event) => setFormat(event.target.value)}
                  className={styles.select}
                >
                  <option value="ALL">
                    Усі формати
                  </option>

                  {formats.map((item) => (
                    <option key={item} value={item}>
                      {item.toUpperCase()}
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
            </div>

            {filteredMaterials.length > 0 ? (
              <div className={styles.grid}>
                {filteredMaterials.map((item) => {
                  const course = item.course;
                  const materialInfo = item.materials;
                  const isOpened = openedCourseId === course.id;
                  const files = courseFiles[course.id] ?? [];
                  const isFilesLoading =
                    filesLoadingCourseId === course.id;
                  const hasFilesError =
                    filesErrorCourseId === course.id;

                  return (
                    <article
                      key={item.id}
                      className={styles.card}
                    >
                      <div className={styles.imageWrapper}>
                        <img
                          src={course?.cover?.url || fallbackImage}
                          alt={course?.title ?? ''}
                          className={styles.image}
                        />

                        {course?.category?.name && (
                          <span className={styles.category}>
                            {course.category.name}
                          </span>
                        )}
                      </div>

                      <div className={styles.cardContent}>
                        <h2>{course?.title}</h2>

                        {course?.author?.name && (
                          <p className={styles.author}>
                            {course.author.name}
                          </p>
                        )}

                        <div className={styles.meta}>
                          {materialInfo?.formats?.map(
                            (itemFormat) => (
                              <span key={itemFormat}>
                                {itemFormat.toUpperCase()}
                              </span>
                            ),
                          )}

                          {materialInfo?.totalSizeBytes != null && (
                            <span>
                              {formatSize(
                                materialInfo.totalSizeBytes,
                              )}
                            </span>
                          )}

                          <span>
                            {getFilesLabel(
                              materialInfo?.filesCount,
                            )}
                          </span>
                        </div>

                        <button
                          type="button"
                          className={styles.filesButton}
                          onClick={() =>
                            handleToggleFiles(course.id)
                          }
                        >
                          {isOpened
                            ? 'Сховати файли'
                            : 'Переглянути файли'}
                        </button>

                        {isOpened && (
                          <div className={styles.files}>
                            {isFilesLoading ? (
                              <p className={styles.filesState}>
                                Завантаження файлів...
                              </p>
                            ) : hasFilesError ? (
                              <p className={styles.filesError}>
                                Не вдалося завантажити файли.
                              </p>
                            ) : files.length === 0 ? (
                              <p className={styles.filesState}>
                                Файлів немає.
                              </p>
                            ) : (
                              files.map((file) => (
                                <div
                                  key={file.id}
                                  className={styles.file}
                                >
                                  <div className={styles.fileInfo}>
                                    <strong>
                                      {file.title || file.name}
                                    </strong>

                                    <div className={styles.fileMeta}>
                                      {file.format && (
                                        <span>
                                          {file.format.toUpperCase()}
                                        </span>
                                      )}

                                      <span>
                                        {formatSize(file.sizeBytes)}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    className={
                                      styles.downloadButton
                                    }
                                    disabled={
                                      downloadingFileId ===
                                      file.fileId
                                    }
                                    onClick={() =>
                                      handleDownload(file.fileId)
                                    }
                                  >
                                    {downloadingFileId ===
                                    file.fileId
                                      ? 'Завантаження...'
                                      : 'Завантажити'}
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.empty}>
                <h2>Матеріалів не знайдено</h2>
                <p>
                  Спробуйте змінити пошук або фільтри.
                </p>
              </div>
            )}
          </>
        )}
      </Container>
    </section>
  );
};

export default LearningMaterials;