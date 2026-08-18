export const filterCourses = (
  courses,
  { category, level, language, format, rating, search, minPrice, maxPrice, }
) => {
  return courses.filter((course) => {

    if (
      category.length > 0 &&
      !category.includes(course.category)
    ) {
      return false;
    }

    if (
      level.length > 0 &&
      !level.includes(course.level)
    ) {
      return false;
    }

    if (
      language.length > 0 &&
      !language.includes(course.language)
    ) {
      return false;
    }

    if (
      format.length > 0 &&
      !format.includes(course.format)
    ) {
      return false;
    }

    if (rating.length > 0) {
      const matchesRating = rating.some((selectedRating) => {
        const minRating = Number(selectedRating);
        const maxRating = minRating + 1;

        return (
          course.rating >= minRating &&
          course.rating < maxRating
        );
      });

      if (!matchesRating) {
        return false;
      }
    }

    if (
      search &&
      !course.title
        .toLowerCase()
        .includes(search.toLowerCase())
    ) {
      return false;
    }

    if (
      course.price < minPrice ||
      course.price > maxPrice
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