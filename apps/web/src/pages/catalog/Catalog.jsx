import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import styles from './Catalog.module.css';

import { Container } from '../../components/layout/container/Container';
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs';
import { Search } from '../../components/ui/search/Search';
import Dropdown from '../../components/ui/dropdown/Dropdown';
import FilterDropdown from '../../components/ui/filter-dropdown/FilterDropdown.jsx';
import Button from '../../components/ui/buttons/Button.jsx';
import CourseGrid from '../../components/ui/course-grid/CourseGrid.jsx';
import CourseSkeleton from '../../components/ui/skeleton/CourseSkeleton.jsx';

import PriceFilter, {
  MAX_CATALOG_PRICE,
  MIN_CATALOG_PRICE,
} from './PriceFilter.jsx';
import { fetchCatalog } from '../../services/coursesService.js';
import {
  getItemsPerPage,
  getPaginationPages,
} from '../../utils/catalog-utils/catalogPagination.js';
import {
  getCatalogParams,
  getCatalogQuery,
  removeCatalogFilter,
  updateCatalogParams,
} from '../../utils/catalog-utils/catalogUrlParams.js';
import { getCheckedFilters } from '../../utils/catalog-utils/catalogCheckedFilters.js';

import arrowLeft from '../../assets/icons/arrow-forward-left.svg';
import arrowRight from '../../assets/icons/arrow-forward-right.svg';

import {
  categories,
  contentTypes,
  grades,
  languages,
  ratings,
  sortOptions,
} from '../../data/catalogFilters.js';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const Catalog = () => {
  const [itemsPerPage, setItemsPerPage] = useState(getItemsPerPage);
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const {
    q,
    sort,
    type,
    category,
    grade,
    language,
    rating,
    priceMin,
    priceMax,
    currentPage,
  } = getCatalogParams(searchParams);

  const [searchValue, setSearchValue] = useState(q);

  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(getItemsPerPage());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setSearchValue(q);
  }, [q]);

  // Search is URL-driven as well: after 300 ms the q parameter changes,
  // which triggers the same server request path as every other filter.
  useEffect(() => {
    const normalizedSearch = searchValue.trim();

    if (normalizedSearch === q) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      updateCatalogParams(
        searchParams,
        setSearchParams,
        'q',
        normalizedSearch,
      );
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [q, searchParams, searchValue, setSearchParams]);

  const catalogQuery = useMemo(
    () => getCatalogQuery({
      q,
      sort,
      type,
      category,
      grade,
      language,
      rating,
      priceMin,
      priceMax,
      currentPage,
      limit: itemsPerPage,
    }),
    [
      q,
      sort,
      type,
      category,
      grade,
      language,
      rating,
      priceMin,
      priceMax,
      currentPage,
      itemsPerPage,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchCatalog(catalogQuery)
      .then((data) => {
        if (cancelled) return;

        setCourses(Array.isArray(data.items) ? data.items : []);
        setTotalPages(Number(data.totalPages) || 0);
      })
      .catch(() => {
        if (cancelled) return;

        setCourses([]);
        setTotalPages(0);
        setError('Не вдалося завантажити каталог. Перевір з’єднання та спробуй ще раз.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [catalogQuery, retryKey]);

  useEffect(() => {
    if (loading || error) return;

    if (totalPages > 0 && currentPage > totalPages) {
      updateCatalogParams(
        searchParams,
        setSearchParams,
        'page',
        totalPages,
      );
    }
    else if (totalPages === 0 && currentPage !== 1) {
      updateCatalogParams(
        searchParams,
        setSearchParams,
        'page',
        1,
      );
    }
  }, [
    currentPage,
    error,
    loading,
    searchParams,
    setSearchParams,
    totalPages,
  ]);

  const updateParams = (name, value) => {
    updateCatalogParams(
      searchParams,
      setSearchParams,
      name,
      value,
    );
  };

  const removeFilter = (key) => {
    removeCatalogFilter(
      searchParams,
      setSearchParams,
      key,
    );
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const handlePriceChange = ({ min, max }) => {
    const params = new URLSearchParams(searchParams);

    if (min === MIN_CATALOG_PRICE) {
      params.delete('priceMin');
    }
    else {
      params.set('priceMin', String(Math.round(min * 100)));
    }

    if (max === MAX_CATALOG_PRICE) {
      params.delete('priceMax');
    }
    else {
      params.set('priceMax', String(Math.round(max * 100)));
    }

    params.set('page', '1');
    setSearchParams(params);
  };

  const checkedFilters = getCheckedFilters({
    category,
    grade,
    type,
    language,
    rating,
    priceMin,
    priceMax,
    categories,
    grades,
    contentTypes,
    languages,
  });

  const priceMinUah = clamp(
    priceMin === null ? MIN_CATALOG_PRICE : priceMin / 100,
    MIN_CATALOG_PRICE,
    MAX_CATALOG_PRICE,
  );
  const priceMaxUah = clamp(
    priceMax === null ? MAX_CATALOG_PRICE : priceMax / 100,
    MIN_CATALOG_PRICE,
    MAX_CATALOG_PRICE,
  );

  return (
    <Container>
      <main className={styles.container}>
        <Breadcrumbs
          title="Головна"
          link="/"
          pages="Каталог курсів"
        />

        <h2 className={styles.title}>Каталог курсів</h2>
        <p className={styles.subtitle}>
          Знайди курс, який допоможе тобі розвиватися та досягати нових вершин
        </p>

        <div className={styles.row}>
          <Search
            size="large"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />

          <Dropdown
            label="Сортування"
            options={sortOptions}
            value={sort}
            onChange={(event) => updateParams('sort', event.target.value)}
          />
        </div>

        <div className={styles.gridContainer}>
          <div className={styles.filters}>
            <FilterDropdown
              label="Категорії"
              options={categories}
              value={category}
              onChange={(value) => updateParams('category', value)}
            />

            <FilterDropdown
              label="Клас"
              options={grades}
              value={grade}
              onChange={(value) => updateParams('grade', value)}
            />

            <FilterDropdown
              label="Тип"
              options={contentTypes}
              value={type}
              onChange={(value) => updateParams('type', value)}
            />

            <FilterDropdown
              label="Мова курсу"
              options={languages}
              value={language}
              onChange={(value) => updateParams('language', value)}
            />

            <FilterDropdown
              label="Рейтинг"
              options={ratings}
              value={rating}
              onChange={(value) => updateParams('rating', value)}
              type="rating"
            />

            <PriceFilter
              minPrice={priceMinUah}
              maxPrice={priceMaxUah}
              onChange={handlePriceChange}
            />

            <Button
              title="Скинути фільтри"
              onClick={clearFilters}
            />
          </div>

          <div className={styles.content}>
            {loading ? (
              <div className={styles.loading}>
                {Array.from({ length: itemsPerPage }).map((_, index) => (
                  <CourseSkeleton key={index} />
                ))}
              </div>
            ) : error ? (
              <div className={styles.empty}>
                <h3>Каталог тимчасово недоступний</h3>
                <p>{error}</p>
                <button type="button" onClick={() => setRetryKey((value) => value + 1)}>
                  Спробувати ще
                </button>
              </div>
            ) : courses.length === 0 ? (
              <div className={styles.empty}>
                <h3>Нічого не знайдено</h3>
                <p>Спробуй змінити параметри пошуку.</p>
                <button type="button" onClick={clearFilters}>
                  Очистити фільтри
                </button>
              </div>
            ) : (
              <>
                {checkedFilters.length > 0 && (
                  <div className={styles.checkedFilters}>
                    <button
                      type="button"
                      className={styles.removeAllBttn}
                      onClick={clearFilters}
                    >
                      Скинути все
                    </button>

                    {checkedFilters.map((filter) => (
                      <button
                        key={filter.key}
                        type="button"
                        className={styles.checkedFiltersBttn}
                        onClick={() => removeFilter(filter.key)}
                      >
                        <span>{filter.label}</span>
                        <span className={styles.removeFilterBttn}>×</span>
                      </button>
                    ))}
                  </div>
                )}

                <CourseGrid courses={courses} />
              </>
            )}

            {!loading && !error && totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => updateParams('page', currentPage - 1)}
                >
                  <img src={arrowLeft} alt="Попередня сторінка" />
                </button>

                {getPaginationPages(totalPages, currentPage).map((page, index) => {
                  if (page === 'dots') {
                    return (
                      <span key={`dots-${index}`} className={styles.dots}>
                        ...
                      </span>
                    );
                  }

                  return (
                    <button
                      type="button"
                      key={page}
                      className={page === currentPage ? styles.activePage : ''}
                      onClick={() => updateParams('page', page)}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => updateParams('page', currentPage + 1)}
                >
                  <img src={arrowRight} alt="Наступна сторінка" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </Container>
  );
};

export default Catalog;
