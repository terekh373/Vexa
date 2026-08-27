/**
 * Catalog top-up for local development.
 *
 * The main seed (prisma/seed.ts) creates a full vertical slice: users, orders,
 * a payment, an enrollment, progress. It leaves only two PUBLISHED courses,
 * which is not enough to test grids, pagination, filters or sorting.
 *
 * This script adds ~24 more PUBLISHED courses on top. It is idempotent:
 * every record has a fixed UUID and is written with `upsert`, so it can be
 * re-run any number of times.
 *
 * Prerequisite: prisma/seed.ts must have been run first — the authors and
 * categories referenced here come from it.
 *
 * Run: npm run db:seed:catalog --workspace @vexa/api
 */
import { PrismaClient, ContentType, CourseStatus } from '@prisma/client';

const prisma = new PrismaClient();

/** UAH -> kopiykas. All money in the DB is an integer. */
const uah = (value: number): number => Math.round(value * 100);

/** Ids from prisma/seed.ts — do not invent new ones here. */
const authors = {
  iryna: '10000000-0000-4000-8000-000000000004',
  oleh: '10000000-0000-4000-8000-000000000005',
} as const;

const categories = {
  school: '20000000-0000-4000-8000-000000000001',
  english: '20000000-0000-4000-8000-000000000002',
  math: '20000000-0000-4000-8000-000000000003',
  nmt: '20000000-0000-4000-8000-000000000004',
  health: '20000000-0000-4000-8000-000000000005',
} as const;

interface DemoCourse {
  /** Two-digit suffix of the fixed UUID, unique within this file. */
  n: number;
  type: ContentType;
  categoryId: string;
  authorId: string;
  title: string;
  slug: string;
  price: number;
  grade: number | null;
  rating: number;
  reviews: number;
  students: number;
  lessons: number;
  /** Whole minutes of content; converted to seconds below. */
  minutes: number;
  /** Days ago, so `publishedAt` differs and date sorting is testable. */
  daysAgo: number;
  language?: string;
}

const demo: DemoCourse[] = [
  // --- Математика ------------------------------------------------------
  { n: 1, type: ContentType.COURSE, categoryId: categories.math, authorId: authors.iryna,
    title: 'Квадратні рівняння: від теореми Вієта до задач НМТ', slug: 'kvadratni-rivnyannya-9-klas',
    price: uah(690), grade: 9, rating: 4.8, reviews: 42, students: 310, lessons: 18, minutes: 240, daysAgo: 3 },
  { n: 2, type: ContentType.COURSE, categoryId: categories.math, authorId: authors.iryna,
    title: 'Геометрія 8 клас: трикутники та чотирикутники', slug: 'heometriya-8-klas-trykutnyky',
    price: uah(540), grade: 8, rating: 4.5, reviews: 17, students: 128, lessons: 22, minutes: 300, daysAgo: 11 },
  { n: 3, type: ContentType.MATERIAL, categoryId: categories.math, authorId: authors.iryna,
    title: 'Тригонометричні формули: шпаргалка-конспект', slug: 'tryhonometriya-shpargalka',
    price: uah(60), grade: 10, rating: 4.9, reviews: 88, students: 640, lessons: 0, minutes: 0, daysAgo: 1 },
  { n: 4, type: ContentType.MATERIAL, categoryId: categories.math, authorId: authors.oleh,
    title: 'Дроби 6 клас: 40 задач із розв’язаннями', slug: 'droby-6-klas-zadachi',
    price: 0, grade: 6, rating: 4.2, reviews: 9, students: 1204, lessons: 0, minutes: 0, daysAgo: 25 },

  // --- Англійська ------------------------------------------------------
  { n: 5, type: ContentType.COURSE, categoryId: categories.english, authorId: authors.oleh,
    title: 'Англійська з нуля: перші 500 слів', slug: 'anhliiska-z-nulya-500-sliv',
    price: uah(890), grade: null, rating: 4.6, reviews: 31, students: 275, lessons: 30, minutes: 420, daysAgo: 7 },
  { n: 6, type: ContentType.COURSE, categoryId: categories.english, authorId: authors.oleh,
    title: 'Past Simple vs Present Perfect: розбір без плутанини', slug: 'past-simple-vs-present-perfect',
    price: uah(320), grade: 8, rating: 4.7, reviews: 54, students: 402, lessons: 12, minutes: 150, daysAgo: 5 },
  { n: 7, type: ContentType.MATERIAL, categoryId: categories.english, authorId: authors.iryna,
    title: 'Неправильні дієслова: картки для друку', slug: 'nepravylni-diyeslova-kartky',
    price: uah(45), grade: 5, rating: 4.4, reviews: 23, students: 512, lessons: 0, minutes: 0, daysAgo: 18 },
  { n: 8, type: ContentType.MATERIAL, categoryId: categories.english, authorId: authors.oleh,
    title: 'Reading for Grade 9: тексти із завданнями', slug: 'reading-grade-9-texts',
    price: uah(120), grade: 9, rating: 3.9, reviews: 6, students: 74, lessons: 0, minutes: 0, daysAgo: 33, language: 'en' },

  // --- Підготовка до НМТ ----------------------------------------------
  { n: 9, type: ContentType.COURSE, categoryId: categories.nmt, authorId: authors.iryna,
    title: 'НМТ українська мова: тестові стратегії', slug: 'nmt-ukrainska-mova-strategii',
    price: uah(1290), grade: 11, rating: 4.9, reviews: 121, students: 890, lessons: 34, minutes: 560, daysAgo: 2 },
  { n: 10, type: ContentType.COURSE, categoryId: categories.nmt, authorId: authors.oleh,
    title: 'НМТ історія України: XX століття за 10 занять', slug: 'nmt-istoriya-xx-stolittya',
    price: uah(980), grade: 11, rating: 4.3, reviews: 28, students: 195, lessons: 10, minutes: 320, daysAgo: 14 },
  { n: 11, type: ContentType.MATERIAL, categoryId: categories.nmt, authorId: authors.iryna,
    title: 'НМТ математика: 200 типових задач', slug: 'nmt-matematyka-200-zadach',
    price: uah(250), grade: 11, rating: 4.8, reviews: 76, students: 623, lessons: 0, minutes: 0, daysAgo: 9 },
  { n: 12, type: ContentType.COURSE, categoryId: categories.nmt, authorId: authors.oleh,
    title: 'НМТ біологія: генетика та екологія', slug: 'nmt-biolohiya-henetyka',
    price: uah(760), grade: 11, rating: 4.1, reviews: 12, students: 88, lessons: 16, minutes: 260, daysAgo: 40 },

  // --- Шкільні предмети (батьківська категорія) ------------------------
  { n: 13, type: ContentType.COURSE, categoryId: categories.school, authorId: authors.iryna,
    title: 'Фізика 7 клас: механіка простими словами', slug: 'fizyka-7-klas-mehanika',
    price: uah(610), grade: 7, rating: 4.4, reviews: 19, students: 143, lessons: 20, minutes: 280, daysAgo: 21 },
  { n: 14, type: ContentType.COURSE, categoryId: categories.school, authorId: authors.oleh,
    title: 'Хімія 8 клас: періодична система на практиці', slug: 'himiya-8-klas-periodychna-systema',
    price: uah(580), grade: 8, rating: 4.0, reviews: 8, students: 61, lessons: 15, minutes: 210, daysAgo: 29 },
  { n: 15, type: ContentType.MATERIAL, categoryId: categories.school, authorId: authors.iryna,
    title: 'Українська література 10 клас: конспекти творів', slug: 'ukr-literatura-10-konspekty',
    price: uah(95), grade: 10, rating: 4.6, reviews: 37, students: 428, lessons: 0, minutes: 0, daysAgo: 6 },
  { n: 16, type: ContentType.MATERIAL, categoryId: categories.school, authorId: authors.oleh,
    title: 'Географія 6 клас: контурні карти із поясненнями', slug: 'heohrafiya-6-klas-karty',
    price: uah(70), grade: 6, rating: 3.7, reviews: 4, students: 39, lessons: 0, minutes: 0, daysAgo: 47 },
  { n: 17, type: ContentType.COURSE, categoryId: categories.school, authorId: authors.iryna,
    title: 'Інформатика 9 клас: основи алгоритмізації', slug: 'informatyka-9-klas-alhorytmy',
    price: uah(720), grade: 9, rating: 4.7, reviews: 25, students: 187, lessons: 24, minutes: 340, daysAgo: 12 },
  { n: 18, type: ContentType.MATERIAL, categoryId: categories.school, authorId: authors.oleh,
    title: 'Правопис: 30 найпоширеніших помилок', slug: 'pravopys-30-pomylok',
    price: 0, grade: null, rating: 4.9, reviews: 156, students: 2310, lessons: 0, minutes: 0, daysAgo: 4 },

  // --- Спорт і здоров’я ------------------------------------------------
  { n: 19, type: ContentType.COURSE, categoryId: categories.health, authorId: authors.oleh,
    title: 'Ранкова зарядка для школяра: 15 хвилин на день', slug: 'rankova-zaryadka-shkolyara',
    price: uah(390), grade: null, rating: 4.5, reviews: 33, students: 268, lessons: 14, minutes: 190, daysAgo: 8 },
  { n: 20, type: ContentType.COURSE, categoryId: categories.health, authorId: authors.iryna,
    title: 'Постава та зір за партою: вправи для дітей', slug: 'postava-ta-zir-za-partoyu',
    price: uah(450), grade: null, rating: 4.2, reviews: 14, students: 97, lessons: 11, minutes: 140, daysAgo: 16 },
  { n: 21, type: ContentType.MATERIAL, categoryId: categories.health, authorId: authors.oleh,
    title: 'Меню школяра на тиждень: таблиця та рецепти', slug: 'menyu-shkolyara-na-tyzhden',
    price: uah(150), grade: null, rating: 4.8, reviews: 61, students: 505, lessons: 0, minutes: 0, daysAgo: 10 },
  { n: 22, type: ContentType.COURSE, categoryId: categories.health, authorId: authors.iryna,
    title: 'Дихальні практики проти тривоги перед іспитом', slug: 'dyhalni-praktyky-pered-ispytom',
    price: uah(280), grade: null, rating: 5.0, reviews: 3, students: 21, lessons: 8, minutes: 95, daysAgo: 1 },
  { n: 23, type: ContentType.MATERIAL, categoryId: categories.health, authorId: authors.oleh,
    title: 'Щоденник режиму дня: шаблон для друку', slug: 'shchodennyk-rezhymu-dnya',
    price: 0, grade: null, rating: 4.1, reviews: 11, students: 780, lessons: 0, minutes: 0, daysAgo: 52 },
  { n: 24, type: ContentType.COURSE, categoryId: categories.health, authorId: authors.iryna,
    title: 'Плавання з нуля: підготовка до басейну', slug: 'plavannya-z-nulya',
    price: uah(1150), grade: null, rating: 4.6, reviews: 22, students: 134, lessons: 19, minutes: 265, daysAgo: 19 },
];

const uuid = (n: number): string =>
  `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const daysAgoDate = (days: number): Date =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);

async function main(): Promise<void> {
  const missingAuthor = await prisma.user.findFirst({
    where: { id: { in: [authors.iryna, authors.oleh] } },
  });
  if (!missingAuthor) {
    throw new Error(
      'Demo authors not found. Run the main seed first: npm run db:seed --workspace @vexa/api',
    );
  }

  for (const c of demo) {
    const publishedAt = daysAgoDate(c.daysAgo);
    // Submitted a day before publication, so the moderation timeline is plausible.
    const submittedAt = daysAgoDate(c.daysAgo + 1);

    const payload = {
      authorId: c.authorId,
      categoryId: c.categoryId,
      type: c.type,
      status: CourseStatus.PUBLISHED,
      slug: c.slug,
      title: c.title,
      shortDescription: `${c.title}. Демонстраційний матеріал для локальної розробки.`,
      description:
        `Це демонстраційний запис каталогу, створений скриптом seed-catalog.ts. ` +
        `Він потрібен лише для перевірки сітки карток, фільтрів, сортування та пагінації. ` +
        `Реальний навчальний контент сюди не входить.`,
      outcomes: [
        'Розібратися з ключовими поняттями теми',
        'Відпрацювати типові завдання',
        'Перевірити себе на підсумковому тесті',
      ],
      language: c.language ?? 'uk',
      grade: c.grade,
      priceAmount: c.price,
      currency: 'UAH',
      ratingAvg: c.rating,
      reviewsCount: c.reviews,
      studentsCount: c.students,
      lessonsCount: c.lessons,
      durationSec: c.minutes * 60,
      submittedAt,
      publishedAt,
    };

    await prisma.course.upsert({
      where: { id: uuid(c.n) },
      update: payload,
      create: { id: uuid(c.n), ...payload },
    });
  }

  const published = await prisma.course.count({
    where: { status: CourseStatus.PUBLISHED, deletedAt: null },
  });
  console.log(`Catalog top-up done. PUBLISHED courses in the database: ${published}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
