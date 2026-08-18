export const getItemsPerPage = () => {
  const width = window.innerWidth;

  if (width >= 1440) {
    return 12;
  }

  if (width >= 1024) {
    return 9;
  }

  if (width >= 768) {
    return 6;
  }

  return 4;
};


export const paginateCourses = (
  courses,
  currentPage,
  itemsPerPage
) => {
  const totalPages = Math.ceil(
    courses.length / itemsPerPage
  );

  const startIndex =
    (currentPage - 1) * itemsPerPage;

  const visibleCourses = courses.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return {
    visibleCourses,
    totalPages,
  };
};