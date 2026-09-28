const findLabel = (options, value) =>
  options.find((item) => item.value === value)?.label || value;

export const getCheckedFilters = ({
  category,
  subject,
  topic,
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
  subjectLabel,
  topicLabel,
}) => {
  const filters = [];

  if (category) {
    filters.push({
      key: 'category',
      label: findLabel(categories, category),
    });
  }


  if (subject) {
    filters.push({
      key: 'subject',
      label: subjectLabel || subject,
    });
  }

  if (topic) {
    filters.push({
      key: 'topic',
      label: topicLabel || 'Тема програми',
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
