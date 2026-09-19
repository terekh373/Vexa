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

export const getPaginationPages = (totalPages, currentPage) => {
  if (totalPages <= 5) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 'dots', totalPages];
  }

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

  return [
    'dots',
    totalPages - 2,
    totalPages - 1,
    totalPages,
  ];
};
