import { useEffect, useState } from 'react';
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

import PriceFilter from './PriceFilter.jsx';
import { getCourses } from '../../services/coursesService.js';
import { filterCourses, sortCourses, } from '../../utils/catalog-utils/courseFilters.js';
import { getItemsPerPage, paginateCourses, } from '../../utils/catalog-utils/catalogPagination.js'
import { getCatalogParams, updateCatalogParams, removeCatalogFilter, } from '../../utils/catalog-utils/catalogUrlParams.js';
import { getCheckedFilters } from '../../utils/catalog-utils/catalogCheckedFilters.js';

import arrowLeft from '../../assets/icons/arrow-forward-left.svg';
import arrowRight from '../../assets/icons/arrow-forward-right.svg';

import {
  categories,
  levels,
  languages,
  formats,
  ratings,
  sortOptions,
} from '../../data/catalogFilters.js';


const Catalog = () => {
  const [itemsPerPage, setItemsPerPage] = useState(getItemsPerPage);
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // URL PARAMETERS
  const {
    search,
    sort,
    category,
    level,
    language,
    format,
    rating,
    free,
    discounted,
    minPrice,
    maxPrice,
    currentPage,
  } = getCatalogParams(searchParams);

  const [searchValue, setSearchValue] =
    useState(search);

  // RESPONSIVE PAGINATION
  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(getItemsPerPage());
    };

    window.addEventListener(
      'resize',
      handleResize
    );

    return () => {
      window.removeEventListener(
        'resize',
        handleResize
      );
    };
  }, []);

  // UPDATE SEARCH INPUT
  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  // LOAD COURSES
  useEffect(() => {
    getCourses()
      .then((data) => {
        setCourses(data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // UPDATE URL
  const updateParams = (name, value) => {
    updateCatalogParams(
      searchParams,
      setSearchParams,
      name,
      value
    );
  };

  // REMOVE ONE FILTER
  const removeFilter = (key, value) => {
    removeCatalogFilter(
      searchParams,
      setSearchParams,
      key,
      value
    );
  };

  // CLEAR FILTERS
  const clearFilters = () => {
    setSearchParams({});
  };

  // PRICE FILTER
  const handlePriceChange = ({
    min,
    max,
    free,
    discounted,
  }) => {
    const params =
      new URLSearchParams(searchParams);

    params.set(
      'minPrice',
      String(min)
    );

    params.set(
      'maxPrice',
      String(max)
    );

    if (free !== undefined) {
      if (free) {
        params.set('free', 'true');
      } else {
        params.delete('free');
      }
    }

    if (discounted !== undefined) {
      if (discounted) {
        params.set('discounted', 'true');
      } else {
        params.delete('discounted');
      }
    }

    params.set('page', '1');

    setSearchParams(params);
  };

  // FILTER
  const filteredCourses = filterCourses(
    courses,
    {
      category,
      level,
      language,
      format,
      rating,
      search,
      minPrice,
      maxPrice,
      free,
      discounted,
    }
  );

  // SORT
  const sortedCourses = sortCourses(
    filteredCourses,
    sort
  );

  // PAGINATION
  const {visibleCourses,totalPages,} = paginateCourses(sortedCourses, currentPage, itemsPerPage);

  // CHECKED FILTERS
  const checkedFilters = getCheckedFilters({
    category,
    level,
    format,
    language,
    rating,
    free,
    discounted,
    categories,
    levels,
    formats,
    languages,
  });

  // SEARCH
  const handleSearchKeyDown = (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    const value =
      event.target.value.trim();

    updateParams(
      'search',
      value
    );
  };

  // INVALID PAGE
  useEffect(() => {
    if (
      !loading &&
      totalPages > 0 &&
      currentPage > totalPages
    ) {
      const params =
        new URLSearchParams(searchParams);

      params.set(
        'page',
        String(totalPages)
      );

      setSearchParams(params);
    }
  }, [
    loading,
    totalPages,
    currentPage,
    searchParams,
    setSearchParams,
  ]);

  const getPaginationPages = () => {
    if (totalPages <= 5) {
      return Array.from(
        { length: totalPages },
        (_, index) => index + 1
      );
    }

    // Страницы 1–3
    if (currentPage <= 3) {
      return [
        1,
        2,
        3,
        'dots',
        totalPages,
      ];
    }

    // Середина
    if (currentPage < totalPages - 2) {
      return [
        'dots',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        'dots',
        totalPages,
      ];
    }

    // Последние страницы
    return [
      'dots',
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  };

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
          Знайди курс, який допоможе тобі
          розвиватися та досягати нових вершин
        </p>

        {/* SEARCH + SORT */}
        <div className={styles.row}>
          <Search
            size="large"
            value={searchValue}
            onChange={(event) =>
              setSearchValue(
                event.target.value
              )
            }
            onKeyDown={
              handleSearchKeyDown
            }
          />

          <Dropdown
            label="Сортування"
            options={sortOptions}
            value={sort}
            onChange={(event) =>
              updateParams(
                'sort',
                event.target.value
              )
            }
          />
        </div>

        <div className={styles.gridContainer}>
          {/* FILTERS */}
          <div className={styles.filters}>
            <FilterDropdown
              label="Категорії"
              options={categories}
              value={category}
              onChange={(value) =>
                updateParams(
                  'category',
                  value
                )
              }
            />

            <FilterDropdown
              label="Рівень складності"
              options={levels}
              value={level}
              onChange={(value) =>
                updateParams(
                  'level',
                  value
                )
              }
            />

            <FilterDropdown
              label="Формат"
              options={formats}
              value={format}
              onChange={(value) =>
                updateParams(
                  'format',
                  value
                )
              }
            />

            <FilterDropdown
              label="Мова курсу"
              options={languages}
              value={language}
              onChange={(value) =>
                updateParams(
                  'language',
                  value
                )
              }
            />

            <FilterDropdown
              label="Рейтинг"
              options={ratings}
              value={rating}
              onChange={(value) =>
                updateParams(
                  'rating',
                  value
                )
              }
              type="rating"
            />

            <PriceFilter
              minPrice={minPrice}
              maxPrice={maxPrice}
              free={free}
              discounted={discounted}
              onChange={
                handlePriceChange
              }
            />

            <Button
              title="Скинути фільтри"
              onClick={clearFilters}
            />

          </div>


          {/* CONTENT */}
          <div className={styles.content}>
            {loading ? (
              <div className={styles.loading}>

                {Array.from({
                  length: itemsPerPage,
                }).map((_, index) => (
                  <CourseSkeleton
                    key={index}
                  />
                ))}

              </div>
            ) : visibleCourses.length === 0 ? (
              <div className={styles.empty}>

                <h3>Нічого не знайдено</h3>
                <p>
                  Спробуй змінити параметри
                  пошуку.
                </p>

                <button onClick={clearFilters}>
                  Очистити фільтри
                </button>
              </div>
            ) : (
              <>
                {/* CHECKED FILTERS */}
                {checkedFilters.length > 0 && (
                  <div className={styles.checkedFilters}>
                    <button
                      type="button"
                      className={styles.removeAllBttn}
                      onClick={clearFilters}
                    >
                      Скинути все
                    </button>


                    {checkedFilters.map(
                      (filter) => (
                        <button
                          key={`${filter.key}-${filter.value}`}
                          type="button"
                          className={styles.checkedFiltersBttn}
                          onClick={() =>
                            removeFilter(
                              filter.key,
                              filter.value)
                          }
                        >
                          <span>{filter.label}</span>
                          <span className={styles.removeFilterBttn}>×</span>
                        </button>
                      )
                    )}
                  </div>
                )}

                {/* COURSES */}
                <CourseGrid courses={visibleCourses} />
              </>
            )}

           {/* PAGINATION */}
            {!loading && totalPages > 1 && (
              <div className={styles.pagination}>

                {/* PREVIOUS */}
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    updateParams(
                      'page',
                      String(currentPage - 1)
                    )
                  }
                >
                  <img
                    src={arrowLeft}
                    alt="Попередня сторінка"
                  />
                </button>

                {/* PAGES */}
                {getPaginationPages().map((page, index) => {
                  if (page === 'dots') {
                    return (
                      <span
                        key={`dots-${index}`}
                        className={styles.dots}
                      >
                        ...
                      </span>
                    );
                  }

                  return (
                    <button
                      type="button"
                      key={page}
                      className={
                        page === currentPage
                          ? styles.activePage
                          : ''
                      }
                      onClick={() =>
                        updateParams(
                          'page',
                          String(page)
                        )
                      }
                    >
                      {page}
                    </button>
                  );
                })}

                {/* NEXT */}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    updateParams(
                      'page',
                      String(currentPage + 1)
                    )
                  }
                >
                  <img
                    src={arrowRight}
                    alt="Наступна сторінка"
                  />
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