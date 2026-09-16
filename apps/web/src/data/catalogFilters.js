export const categories = [
  {
    value: 'shkilni-predmety',
    label: 'Шкільні предмети',
  },
  {
    value: 'anhliiska-mova',
    label: 'Англійська мова',
  },
  {
    value: 'matematyka',
    label: 'Математика',
  },
  {
    value: 'pidhotovka-nmt',
    label: 'Підготовка до НМТ',
  },
  {
    value: 'sport-i-zdorovia',
    label: 'Спорт і здоров’я',
  },
];

export const grades = Array.from({ length: 11 }, (_, index) => ({
  value: String(index + 1),
  label: `${index + 1} клас`,
}));

export const languages = [
  {
    value: 'uk',
    label: 'Українська',
  },
  {
    value: 'en',
    label: 'English',
  },
];

export const contentTypes = [
  {
    value: 'course',
    label: 'Курс',
  },
  {
    value: 'material',
    label: 'Матеріал',
  },
];

export const ratings = [5, 4, 3, 2, 1].map((rating) => ({
  value: String(rating),
  label: `${rating}+`,
}));

export const sortOptions = [
  {
    value: 'relevance',
    label: 'За релевантністю',
  },
  {
    value: 'popularity',
    label: 'Популярні',
  },
  {
    value: 'rating',
    label: 'За рейтингом',
  },
  {
    value: 'date',
    label: 'Нові спочатку',
  },
  {
    value: 'price_asc',
    label: 'Від дешевих',
  },
  {
    value: 'price_desc',
    label: 'Від дорогих',
  },
];
