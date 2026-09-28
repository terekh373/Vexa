export const learningCourse = {
  id: 'course-1',
  title: 'Основи UX/UI дизайну',
  progress: 58,
  completedLessons: 7,
  totalLessons: 12,
  modules: [
    {
      id: 'module-1',
      title: 'Вступ до UX/UI дизайну',
      lessons: [
        {
          id: 'lesson-1',
          title: 'Що таке UX/UI дизайн',
          duration: '12 хв',
          completed: true,
          description:
            'Познайомимося з основними поняттями UX та UI дизайну, їх відмінностями та роллю дизайнера.',
        },
        {
          id: 'lesson-2',
          title: 'Основні принципи дизайну',
          duration: '18 хв',
          completed: true,
          description:
            'Розглянемо базові принципи композиції, типографіки, кольору та візуальної ієрархії.',
        },
        {
          id: 'lesson-3',
          title: 'Робота з користувачем',
          duration: '24 хв',
          completed: false,
          description:
            'Навчимося досліджувати потреби користувачів та використовувати отримані дані у дизайні.',
        },
      ],
    },
    {
      id: 'module-2',
      title: 'Дослідження та прототипування',
      lessons: [
        {
          id: 'lesson-4',
          title: 'User Flow',
          duration: '20 хв',
          completed: false,
          description:
            'Створимо користувацький сценарій та розберемо принципи побудови User Flow.',
        },
        {
          id: 'lesson-5',
          title: 'Wireframes',
          duration: '26 хв',
          completed: false,
          description:
            'Розберемо створення wireframes та підготовку структури майбутнього інтерфейсу.',
        },
        {
          id: 'lesson-6',
          title: 'Прототипування',
          duration: '32 хв',
          completed: false,
          description:
            'Навчимося створювати інтерактивні прототипи та тестувати основні сценарії.',
        },
      ],
    },
    {
      id: 'module-3',
      title: 'UI дизайн',
      lessons: [
        {
          id: 'lesson-7',
          title: 'Колір та типографіка',
          duration: '28 хв',
          completed: false,
          description:
            'Розглянемо роботу з кольором, шрифтами та побудовою візуальної системи.',
        },
        {
          id: 'lesson-8',
          title: 'Компоненти та дизайн-система',
          duration: '35 хв',
          completed: false,
          description:
            'Навчимося створювати компоненти та організовувати дизайн-систему.',
        },
      ],
    },
  ],
};