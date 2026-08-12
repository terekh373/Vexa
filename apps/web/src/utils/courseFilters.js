export const filterCourses = (
  courses,
  { category, level, language, search }
) => {
  return courses.filter((course) => {

    // если категория выбрана —
    // проверяем её
    if (
      category.length > 0 &&
      !category.includes(course.category)
    ) {
      return false;
    }

    // если уровень выбран —
    // проверяем его
    if (
      level.length > 0 &&
      !level.includes(course.level)
    ) {
      return false;
    }

    // если язык выбран —
    // проверяем его
    if (
      language.length > 0 &&
      !language.includes(course.language)
    ) {
      return false;
    }

    // если есть поиск
    if (
      search &&
      !course.title
        .toLowerCase()
        .includes(search.toLowerCase())
    ) {
      return false;
    }

    return true;
  });
};

export const sortCourses = (courses, sort) => {
  const result = [...courses]

  switch (sort) {

    case 'price-asc':
      return result.sort(
        (a, b) => a.price - b.price
      );

    case 'price-desc':
      return result.sort(
        (a, b) => b.price - a.price
      );

    case 'rating-desc':
      return result.sort(
        (a, b) => b.rating - a.rating
      );

    case 'reviews-desc':
      return result.sort(
        (a, b) => b.reviews - a.reviews
      );

    default:
      return result;
  }
};