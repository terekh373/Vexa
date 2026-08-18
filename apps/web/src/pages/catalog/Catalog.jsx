import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import styles from './Catalog.module.css'
import { Container } from '../../components/layout/container/Container'
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs'
import { Search } from '../../components/ui/search/Search'
import Dropdown from '../../components/ui/dropdown/Dropdown'
import { getCourses } from '../../services/coursesService.js'
import FilterDropdown from '../../components/ui/filter-dropdown/FilterDropdown.jsx'
import Button from '../../components/ui/buttons/Button.jsx'
import { filterCourses, sortCourses } from '../../utils/courseFilters.js'
import CourseGrid from '../../components/ui/course-grid/CourseGrid.jsx'
import CourseSkeleton from '../../components/ui/skeleton/CourseSkeleton.jsx'
import { getItemsPerPage } from '../../utils/catalog-utils/catalogPagination.js'
import { categories, levels, languages, formats, ratings, sortOptions } from '../../data/catalogFilters.js'
import PriceFilter from './PriceFilter.jsx'

const Catalog = () => {
  const [itemsPerPage, setItemsPerPage] = useState(getItemsPerPage);
  const [searchParams, setSearchParams] = useSearchParams();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // URL PARAMETERS
  const search = searchParams.get('search') || '';
  const [searchValue, setSearchValue] = useState(search);
  const sort = searchParams.get('sort') || '';

  const category = searchParams.get('category')?.split(',').filter(Boolean) || [];
  const level = searchParams.get('level')?.split(',').filter(Boolean) || [];
  const language = searchParams.get('language')?.split(',').filter(Boolean) || [];
  const format = searchParams.get('format')?.split(',').filter(Boolean) || [];
  const rating = searchParams.get('rating')?.split(',').filter(Boolean) || [];

  const minPrice = Number(searchParams.get('minPrice')) || 0;
  const maxPrice = Number(searchParams.get('maxPrice')) || 500;

  const currentPage = Number(searchParams.get('page')) || 1;

  const checkedFilters = [
    ...category.map((value) => {
      const option = categories.find((item) => item.value === value)

      return {
        key: 'category',
        value,
        label: option?.label,
      }
    }),

    ...level.map((value) => {
      const option = levels.find((item) => item.value === value)

      return {
        key: 'level',
        value,
        label: option?.label,
      }
    }),

    ...format.map((value) => {
      const option = formats.find((item) => item.value === value)

      return {
        key: 'format',
        value,
        label: option?.label,
      }
    }),

    ...language.map((value) => {
      const option = languages.find((item) => item.value === value)

      return {
        key: 'language',
        value,
        label: option?.label,
      }
    }),

    ...rating.map((value) => {
      return {
        key: 'rating',
        value,
        label: `${value} ★`,
      }
    }),
  ];

  const removeFilter = (key, value) => {
    const currentValues = searchParams
      .get(key)
      ?.split(',')
      .filter(Boolean) || []

    const newValues = currentValues.filter(
      (item) => item !== value
    )

    updateParams(key, newValues)
  };

  const handlePriceChange = ({ min, max }) => {
    const params = new URLSearchParams(searchParams)

    params.set('minPrice', String(min));
    params.set('maxPrice', String(max));
    params.set('page', '1');

    setSearchParams(params);
  }

  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(getItemsPerPage());
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
      })
  }, []);

  // UPDATE URL
  const updateParams = (name, value) => {
    const params = new URLSearchParams(searchParams);

    if (Array.isArray(value)) {
      if (value.length > 0) {
        params.set(name, value.join(','));
      }
      else {
        params.delete(name);
      }
    } 
    else {
      if (value) {
        params.set(name, value);
      } 
      else {
        params.delete(name);
      }
    }

    // после изменения фильтра
    // возвращаемся на первую страницу
    params.set('page', '1');
    setSearchParams(params);
  }

  // CLEAR FILTERS
  const clearFilters = () => {
    setSearchParams({});
  }

  // FILTER
  const filteredCourses =
    filterCourses(courses, {
      category,
      level,
      language,
      format,
      rating,
      search,
      minPrice,
      maxPrice,
    });

  // SORT
  const sortedCourses =
    sortCourses(
      filteredCourses,
      sort
    );

  // PAGINATION
  const totalPages = Math.ceil(sortedCourses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  const visibleCourses =
    sortedCourses.slice(
      startIndex,
      startIndex + itemsPerPage
    );

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
    )
  };

  // INVALID PAGE
  useEffect(() => {
    if (!loading && totalPages > 0 && currentPage > totalPages) {
      const params =
        new URLSearchParams(searchParams)

      params.set(
        'page',
        String(totalPages)
      )
      setSearchParams(params);
    }
  }, [
    loading,
    totalPages,
    currentPage,
    searchParams,
    setSearchParams
  ]);

  return (
    <Container>
      <main className={styles.container}>
        <Breadcrumbs title='Головна' link='/' pages='Каталог курсів'/>

        <h2 className={styles.title}>Каталог курсів</h2>
        <p className={styles.subtitle}>
          Знайди курс, який допоможе тобі
          розвиватися та досягати нових вершин
        </p>

        <div className={styles.row}>
          <Search
            size="large"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onKeyDown={handleSearchKeyDown}
          />

          <Dropdown
            label="Сортування"
            options={sortOptions}
            value={sort}
            onChange={(event) =>
              updateParams('sort', event.target.value)
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
            onChange={(value) => updateParams('category', value)}
          />

          <FilterDropdown
            label="Рівень складності"
            options={levels}
            value={level}
            onChange={(value) =>
              updateParams('level', value)
            }
          />

          <FilterDropdown
            label="Формат"
            options={formats}
            value={format}
            onChange={(value) =>
              updateParams('format', value)
            }
          />

          <FilterDropdown
            label="Мова курсу"
            options={languages}
            value={language}
            onChange={(value) =>
              updateParams('language', value)
            }
          />

          <FilterDropdown
            label="Рейтинг"
            options={ratings}
            value={rating}
            onChange={(value) => updateParams('rating', value)}
            type="rating"
          />

          <PriceFilter
            minPrice={minPrice}
            maxPrice={maxPrice}
            onChange={handlePriceChange}
          />

          <Button title='Скинути фільтри' onClick={clearFilters} />
        </div>

        <div className={styles.content}>
        {/* CONTENT */}
        {loading ? (
          <div className={styles.loading}>
            {Array.from({
              length: itemsPerPage
            }).map((_, index) => (
              <CourseSkeleton key={index} />
            ))}
          </div>

        ) : visibleCourses.length === 0 ? (
          <div className={styles.empty}>
            <h3>Нічого не знайдено</h3>
            <p>Спробуй змінити параметри пошуку.</p>

            <button onClick={clearFilters}>
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
                    onClick={clearFilters}>
                    Скинути все
                  </button>

                  {checkedFilters.map((filter) => (
                    <button
                      key={`${filter.key}-${filter.value}`}
                      type="button"
                      className={styles.checkedFiltersBttn}
                      onClick={() =>removeFilter(filter.key, filter.value)}
                    >
                      <span>{filter.label}</span>

                      <span className={styles.removeFilterBttn}>
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              )}
            <CourseGrid courses={visibleCourses}/>
          </>
        )}

        {/* PAGINATION */}
        {!loading && totalPages > 1 && (
          <div className={styles.pagination}>
            <button 
              disabled={currentPage === 1}
              onClick={() =>
                updateParams('page', String(currentPage - 1))
              }
            >
              ←
            </button>

            {Array.from(
              {length: totalPages},(_, index) => index + 1).map((page) => (
              <button
                key={page}
                className={ page === currentPage ? styles.activePage : ''}
                onClick={() => updateParams('page', String(page))}
              >
                {page}
              </button>

            ))}

            <button
              disabled={currentPage === totalPages}
              onClick={() => updateParams('page', String(currentPage + 1))}
            >
              →
            </button>
          </div>
        )}
        </div>
      </div>
      </main>
    </Container>
  )
}


export default Catalog;