const getPositiveInteger = (value, fallback) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : fallback;
};

const getOptionalNumber = (searchParams, key) => {
  const value = searchParams.get(key);

  if (value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getCatalogParams = (searchParams) => ({
  q: searchParams.get('q') || '',
  sort: searchParams.get('sort') || 'relevance',
  type: searchParams.get('type') || '',
  category: searchParams.get('category') || '',
  grade: searchParams.get('grade') || '',
  language: searchParams.get('language') || '',
  rating: searchParams.get('rating') || '',
  priceMin: getOptionalNumber(searchParams, 'priceMin'),
  priceMax: getOptionalNumber(searchParams, 'priceMax'),
  currentPage: getPositiveInteger(searchParams.get('page'), 1),
});

export const getCatalogQuery = ({
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
  limit,
}) => {
  const query = {
    sort,
    page: currentPage,
    limit,
  };

  if (q) query.q = q;
  if (type) query.type = type;
  if (category) query.category = category;
  if (grade) query.grade = Number(grade);
  if (language) query.language = language;
  if (rating) query.rating = Number(rating);
  if (priceMin !== null) query.priceMin = priceMin;
  if (priceMax !== null) query.priceMax = priceMax;

  return query;
};

export const updateCatalogParams = (
  searchParams,
  setSearchParams,
  name,
  value,
) => {
  const params = new URLSearchParams(searchParams);

  if (value === '' || value === null || value === undefined) {
    params.delete(name);
  }
  else {
    params.set(name, String(value));
  }

  if (name !== 'page') {
    params.set('page', '1');
  }

  setSearchParams(params);
};

export const removeCatalogFilter = (
  searchParams,
  setSearchParams,
  key,
) => {
  updateCatalogParams(searchParams, setSearchParams, key, '');
};
