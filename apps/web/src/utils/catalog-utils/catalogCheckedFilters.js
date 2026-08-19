export const getCheckedFilters = ({
  category,
  level,
  format,
  language,
  rating,
  free,
  discounted,
  categories,
  levels,
  formats,
  languages,
}) => {
  return [
    ...category.map((value) => {
      const option = categories.find(
        (item) => item.value === value
      );

      return {
        key: 'category',
        value,
        label: option?.label || value,
      };
    }),

    ...level.map((value) => {
      const option = levels.find(
        (item) => item.value === value
      );

      return {
        key: 'level',
        value,
        label: option?.label || value,
      };
    }),

    ...format.map((value) => {
      const option = formats.find(
        (item) => item.value === value
      );

      return {
        key: 'format',
        value,
        label: option?.label || value,
      };
    }),

    ...language.map((value) => {
      const option = languages.find(
        (item) => item.value === value
      );

      return {
        key: 'language',
        value,
        label: option?.label || value,
      };
    }),

    ...rating.map((value) => ({
      key: 'rating',
      value,
      label: `${value} ★`,
    })),

    ...(free
      ? [
          {
            key: 'free',
            value: 'true',
            label: 'Безкоштовні',
          },
        ]
      : []),

    ...(discounted
      ? [
          {
            key: 'discounted',
            value: 'true',
            label: 'Зі знижкою',
          },
        ]
      : []),
  ];
};