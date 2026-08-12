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

const getItemsPerPage = () => {
  const availableHeight = window.innerHeight - 450;

  const cardHeight = 328;
  const gap = 24;

  const rows = Math.max(1, Math.floor((availableHeight + gap) / (cardHeight + gap)));

  return rows * 4;
};

const Catalog = () => {
  const [itemsPerPage, setItemsPerPage] = useState(getItemsPerPage);

  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // URL PARAMETERS
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || '';

  const category = searchParams.get('category')?.split(',').filter(Boolean) || [];
  const level = searchParams.get('level')?.split(',').filter(Boolean) || [];
  const language = searchParams.get('language')?.split(',').filter(Boolean) || [];

  const currentPage = Number(searchParams.get('page')) || 1;

  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(getItemsPerPage());
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
      search
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

    if (
      !loading &&
      totalPages > 0 &&
      currentPage > totalPages
    ) {
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

  const categories = [
    {
      value: 'programming',
      label: 'Програмування',
      count: 12
    },
    {
      value: 'design',
      label: 'Дизайн',
      count: 8
    },
    {
      value: 'marketing',
      label: 'Маркетинг',
      count: 5
    }
  ];

  const levels = [
    {
      value: 'beginner',
      label: 'Початківець',
      count: 10
    },
    {
      value: 'intermediate',
      label: 'Середній',
      count: 7
    },
    {
      value: 'advanced',
      label: 'Просунутий',
      count: 3
    }
  ];

  return (
    <Container>
      <main className={styles.container}>
        <Breadcrumbs />

        <h2 className={styles.title}>Каталог курсів</h2>
        <p className={styles.subtitle}>
          Знайди курс, який допоможе тобі
          розвиватися та досягати нових вершин
        </p>

        <div className={styles.row}>
          <Search
            size="large"
            value={search}
            onKeyDown={handleSearchKeyDown}
          />

          <Dropdown
            label="Сортування"
            options={[
              { value: 'rating-desc', label: 'Популярні' },
              { value: 'price-asc', label: 'Від дешевих' },
              { value: 'price-desc', label: 'Від дорогих' },
              { value: 'reviews-desc', label: 'За кількістю відгуків' }
            ]}
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
            label="Категорія"
            options={categories}
            value={category}
            onChange={(value) => updateParams('category', value)}
          />
          <FilterDropdown
            label="Рівень"
            options={levels}
            value={level}
            onChange={(value) =>
              updateParams('level', value)
            }
          />

          <FilterDropdown
            label="Мова"
            options={[
              {
                value: 'uk',
                label: 'Українська',
                count: 15
              },
              {
                value: 'en',
                label: 'English',
                count: 5
              }
            ]}
            value={language}
            onChange={(value) =>
              updateParams('language', value)
            }
          />
          <Button title='Скинути фільтри' />
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
          <CourseGrid courses={visibleCourses}/>
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