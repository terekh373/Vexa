import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { Container } from '../../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import { Search } from '../../../components/ui/search/Search.jsx';

import { learningMaterials } from '../../../data/learningMaterials.js';
import ArrowDownIcon from '../../../assets/icons/arrow-down-purple.svg';
import fallbackImage from '../../../assets/images/img01.png';

import styles from './LearningMaterials.module.css';

const LearningMaterials = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [format, setFormat] = useState('ALL');

  const categories = useMemo(() => {
    return [
      ...new Set(
        learningMaterials.map((material) => material.category)
      ),
    ];
  }, []);

  const formats = useMemo(() => {
    return [
      ...new Set(
        learningMaterials.map((material) => material.format)
      ),
    ];
  }, []);

  const filteredMaterials = useMemo(() => {
    let result = [...learningMaterials];

    if (search.trim()) {
      const query = search.trim().toLowerCase();

      result = result.filter((material) =>
        material.title.toLowerCase().includes(query)
      );
    }

    if (category !== 'ALL') {
      result = result.filter(
        (material) => material.category === category
      );
    }

    if (format !== 'ALL') {
      result = result.filter(
        (material) => material.format === format
      );
    }

    return result;
  }, [search, category, format]);

  const handleDownload = (material) => {
    console.log('Download material:', material.id);
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

        <div className={styles.toolbar}>
          <Search
            size="medium"
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Знайти матеріал"
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
              onChange={(event) =>
                setFormat(event.target.value)
              }
              className={styles.select}
            >
              <option value="ALL">
                Усі формати
              </option>

              {formats.map((item) => (
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
        </div>

        {filteredMaterials.length > 0 ? (
          <div className={styles.grid}>
            {filteredMaterials.map((material) => (
              <article
                key={material.id}
                className={styles.card}
              >
                <div className={styles.imageWrapper}>
                  <img
                    src={material.image || fallbackImage}
                    alt={material.title}
                    className={styles.image}
                  />

                  <span className={styles.category}>
                    {material.category}
                  </span>
                </div>

                <div className={styles.cardContent}>
                  <h2>{material.title}</h2>

                  <p className={styles.author}>
                    {material.author}
                  </p>

                  <div className={styles.meta}>
                    <span>{material.format}</span>

                    <span>{material.size}</span>

                    <span>
                      {material.filesCount}{' '}
                      {material.filesCount === 1
                        ? 'файл'
                        : 'файли'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={styles.download}
                    onClick={() =>
                      handleDownload(material)
                    }
                  >
                    Завантажити
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <h2>Матеріалів не знайдено</h2>

            <p>
              Спробуйте змінити пошук або фільтри.
            </p>
          </div>
        )}
      </Container>
    </section>
  );
};

export default LearningMaterials;