export const getCatalogParams = (searchParams) => {
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || '';

  const category = searchParams.get('category')?.split(',').filter(Boolean) || [];
  const level = searchParams.get('level')?.split(',').filter(Boolean) || [];
  const language = searchParams.get('language')?.split(',').filter(Boolean) || [];
  const format = searchParams.get('format')?.split(',').filter(Boolean) || [];
  const rating = searchParams.get('rating')?.split(',').filter(Boolean) || [];
  const free = searchParams.get('free') === 'true';
  const discounted = searchParams.get('discounted') === 'true';
  const minPrice = Number(searchParams.get('minPrice')) || 0;
  const maxPrice = Number(searchParams.get('maxPrice')) || 500;
  const currentPage = Number(searchParams.get('page')) || 1;

  return {
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
  };
};

export const updateCatalogParams = ( searchParams, setSearchParams, name, value ) => {
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

  if (name !== 'page') {
    params.set('page', '1');
  }

  setSearchParams(params);
};

export const removeCatalogFilter = ( searchParams, setSearchParams, key, value ) => {
  const currentValues = searchParams.get(key)?.split(',').filter(Boolean) || [];

  const newValues = currentValues.filter((item) => item !== value);

  updateCatalogParams(searchParams, setSearchParams, key, newValues);
};