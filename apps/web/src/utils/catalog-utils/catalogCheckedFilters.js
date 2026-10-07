const findLabel = (options, value) =>
  options.find((item) => item.value === value)?.label || value;

export const getCheckedFilters = ({
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
}) => {
  const filters = [];

  if (category) {
    filters.push({
      key: 'category',
      label: findLabel(categories, category),
    });
  }

  if (grade) {
    filters.push({
      key: 'grade',
      label: findLabel(grades, grade),
    });
  }

  if (type) {
    filters.push({
      key: 'type',
      label: findLabel(contentTypes, type),
    });
  }

  if (language) {
    filters.push({
      key: 'language',
      label: findLabel(languages, language),
    });
  }

  if (rating) {
    filters.push({
      key: 'rating',
      label: `${rating}+ ★`,
    });
  }

  if (priceMin !== null) {
    filters.push({
      key: 'priceMin',
      label: `Від ${(priceMin / 100).toLocaleString('uk-UA')} ₴`,
    });
  }

  if (priceMax !== null) {
    filters.push({
      key: 'priceMax',
      label: `До ${(priceMax / 100).toLocaleString('uk-UA')} ₴`,
    });
  }

  return filters;
};
