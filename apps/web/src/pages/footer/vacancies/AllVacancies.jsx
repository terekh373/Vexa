import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { Container } from '../../../components/layout/container/Container';
import Breadcrumbs from '../../../components/ui/breadcrumbs/Breadcrumbs';
import { Search } from '../../../components/ui/search/Search';

import styles from './AllVacancies.module.css';

import heroImg from '../../../assets/images/vacancies/04.png';

const vacancies = [
  {
    id: 1,
    title: 'UI/UX Designer',
    category: 'Дизайн',
    employment: 'Повна зайнятість',
    level: 'Middle+',
    format: 'Віддалено',
  },
  {
    id: 2,
    title: 'UI/UX Designer',
    category: 'Дизайн',
    employment: 'Повна зайнятість',
    level: 'Middle+',
    format: 'Віддалено',
  },
  {
    id: 3,
    title: 'UI/UX Designer',
    category: 'Дизайн',
    employment: 'Повна зайнятість',
    level: 'Middle+',
    format: 'Віддалено',
  },
  {
    id: 4,
    title: 'UI/UX Designer',
    category: 'Дизайн',
    employment: 'Повна зайнятість',
    level: 'Middle+',
    format: 'Віддалено',
  },
  {
    id: 5,
    title: 'UI/UX Designer',
    category: 'Дизайн',
    employment: 'Повна зайнятість',
    level: 'Middle+',
    format: 'Віддалено',
  },
  {
    id: 6,
    title: 'Frontend Developer',
    category: 'Розробка',
    employment: 'Повна зайнятість',
    level: 'Middle',
    format: 'Віддалено',
  },
  {
    id: 7,
    title: 'Content Manager',
    category: 'Контент',
    employment: 'Повна зайнятість',
    level: 'Junior+',
    format: 'Віддалено',
  },
];

const filters = [
  'Напрямок',
  'Тип зайнятості',
  'Місцезнаходження',
  'Рівень',
];

const ITEMS_PER_PAGE = 5;

const AllVacancies = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState(filters);
  const [page, setPage] = useState(1);

  const filteredVacancies = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return vacancies;
    }

    return vacancies.filter((vacancy) =>
      [
        vacancy.title,
        vacancy.category,
        vacancy.employment,
        vacancy.level,
        vacancy.format,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredVacancies.length / ITEMS_PER_PAGE)
  );

  const visibleVacancies = filteredVacancies.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const handleSearch = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const removeFilter = (filter) => {
    setActiveFilters((prev) =>
      prev.filter((item) => item !== filter)
    );
  };

  const clearFilters = () => {
    setActiveFilters([]);
  };

  const handleVacancyClick = (id) => {
    navigate(routes.vacancy(id));
  };

  return (
    <main className={styles.page}>
      <Container>
        <Breadcrumbs title='Головна' link='/' pages='Усі вакансії' />

        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1>Усі вакансії</h1>

            <p>
              Ми постійно розширюємо команду та шукаємо талановитих людей, які допоможуть розвивати освіту в Україні.
            </p>

            <div className={styles.searchWrapper}>
              <Search
                value={search}
                onChange={handleSearch}
                placeholder="Пошук вакансій за назвою або ключовим словом"
              />
            </div>

            <div className={styles.filters}>
              <button
                type="button"
                className={styles.clearFilters}
                onClick={clearFilters}
              >
                Скинути все
              </button>

              {activeFilters.map((filter) => (
                <button
                  type="button"
                  className={styles.filter}
                  key={filter}
                  onClick={() => removeFilter(filter)}
                >
                  {filter}
                  <span>×</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.heroImage}>
            <img src={heroImg} alt="Пошук вакансій VEXA" />
          </div>
        </section>

        <section className={styles.vacancies}>
          {visibleVacancies.length > 0 ? (
            <div className={styles.vacanciesList}>
              {visibleVacancies.map((vacancy) => (
                <article className={styles.vacancyCard} key={vacancy.id}>
                  <div className={styles.vacancyInfo}>
                    <div>
                      <h2>{vacancy.title}</h2>
                      <p>
                        {vacancy.category} · {vacancy.employment}
                      </p>
                    </div>
                    <div className={styles.tags}>
                      <span className={styles.level}>{vacancy.level}</span>
                      <span className={styles.format}>{vacancy.format}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.arrow}
                    aria-label={`Переглянути вакансію ${vacancy.title}`}
                    onClick={() => handleVacancyClick(vacancy.id)}
                  >
                    →
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <h2>Вакансій не знайдено</h2>
              <p>Спробуйте змінити пошуковий запит або фільтри.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.paginationArrow}
                disabled={page === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <button
                    type="button"
                    key={pageNumber}
                    className={`${styles.pageButton} ${
                      page === pageNumber ? styles.activePage : ''
                    }`}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                )
              )}

              <button
                type="button"
                className={styles.paginationArrow}
                disabled={page === totalPages}
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
              >
                ›
              </button>
            </div>
          )}
        </section>
      </Container>
    </main>
  );
};

export default AllVacancies;