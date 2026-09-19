/**
 * Demo data for local development and the diploma presentation.
 *
 * Idempotent: every record has a fixed UUID and is written with `upsert`,
 * so the script can be re-run any number of times on a non-empty database.
 *
 * Run: npm run db:seed
 */
import {
  PrismaClient,
  UserRole,
  ContentType,
  CourseStatus,
  LessonType,
  FileKind,
  StorageProvider,
  QuestionType,
  EnrollmentSource,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  BalanceEntryType,
  ModerationAction,
  NotificationType,
  ProgressStatus,
} from '@prisma/client';
import { hashPassword } from '../src/modules/auth/password.service.js';

const prisma = new PrismaClient();

/** Default platform commission, 15.00% (TZ section 16). */
const DEFAULT_COMMISSION_BPS = 1500;

/** UAH -> kopiykas. All money in the DB is an integer. */
const uah = (value: number): number => Math.round(value * 100);

/**
 * Single source of truth for the money split. The same formula lives in
 * OrdersService later — commission is rounded down, the author gets the rest,
 * so commission + authorAmount always equals the price.
 */
const splitPrice = (
  priceAmount: number,
  commissionRateBps: number,
): { commissionAmount: number; authorAmount: number } => {
  const commissionAmount = Math.floor((priceAmount * commissionRateBps) / 10_000);
  return { commissionAmount, authorAmount: priceAmount - commissionAmount };
};

/** Fixed ids keep the seed idempotent and make manual SQL checks easy. */
const id = {
  users: {
    admin: '10000000-0000-4000-8000-000000000001',
    oksana: '10000000-0000-4000-8000-000000000002',
    dmytro: '10000000-0000-4000-8000-000000000003',
    iryna: '10000000-0000-4000-8000-000000000004',
    oleh: '10000000-0000-4000-8000-000000000005',
  },
  categories: {
    school: '20000000-0000-4000-8000-000000000001',
    english: '20000000-0000-4000-8000-000000000002',
    math: '20000000-0000-4000-8000-000000000003',
    nmt: '20000000-0000-4000-8000-000000000004',
    health: '20000000-0000-4000-8000-000000000005',
  },
  subjects: {
    english: '30000000-0000-4000-8000-000000000001',
    math: '30000000-0000-4000-8000-000000000002',
  },
  topics: {
    presentPerfect: '31000000-0000-4000-8000-000000000001',
    quadratic: '31000000-0000-4000-8000-000000000002',
  },
  files: {
    coverMath: '40000000-0000-4000-8000-000000000001',
    coverEnglish: '40000000-0000-4000-8000-000000000002',
    videoIntro: '40000000-0000-4000-8000-000000000003',
    pdfSummary: '40000000-0000-4000-8000-000000000004',
    pptxLesson: '40000000-0000-4000-8000-000000000005',
  },
  courses: {
    mathNmt: '50000000-0000-4000-8000-000000000001',
    englishMaterial: '50000000-0000-4000-8000-000000000002',
    draftPsychology: '50000000-0000-4000-8000-000000000003',
  },
  modules: {
    mathBasics: '51000000-0000-4000-8000-000000000001',
    mathEquations: '51000000-0000-4000-8000-000000000002',
  },
  lessons: {
    mathIntro: '52000000-0000-4000-8000-000000000001',
    mathTheory: '52000000-0000-4000-8000-000000000002',
    mathQuiz: '52000000-0000-4000-8000-000000000003',
  },
  quiz: '53000000-0000-4000-8000-000000000001',
  questions: {
    q1: '54000000-0000-4000-8000-000000000001',
    q2: '54000000-0000-4000-8000-000000000002',
  },
  moderationLog: {
    submitted: '55000000-0000-4000-8000-000000000001',
    approved: '55000000-0000-4000-8000-000000000002',
  },
  notifications: {
    authorSale: '65000000-0000-4000-8000-000000000001',
    studentAccess: '65000000-0000-4000-8000-000000000002',
  },
  order: '60000000-0000-4000-8000-000000000001',
  orderItem: '61000000-0000-4000-8000-000000000001',
  payment: '62000000-0000-4000-8000-000000000001',
  enrollment: '63000000-0000-4000-8000-000000000001',
  review: '64000000-0000-4000-8000-000000000001',
} as const;

async function seedUsers(): Promise<void> {
  const demoPasswordHash = await hashPassword('Vexa12345!');
  const now = new Date();

  const users = [
    {
      id: id.users.admin,
      email: 'admin@vexa.ua',
      fullName: 'Адміністратор Платформи',
      roles: [UserRole.ADMIN, UserRole.STUDENT],
    },
    {
      id: id.users.oksana,
      email: 'oksana@vexa.ua',
      fullName: 'Оксана Ковальчук',
      roles: [UserRole.STUDENT],
    },
    {
      id: id.users.dmytro,
      email: 'dmytro@vexa.ua',
      fullName: 'Дмитро Шевченко',
      roles: [UserRole.STUDENT],
    },
    {
      id: id.users.iryna,
      email: 'iryna@vexa.ua',
      fullName: 'Ірина Мельник',
      roles: [UserRole.STUDENT, UserRole.AUTHOR],
    },
    {
      id: id.users.oleh,
      email: 'oleh@vexa.ua',
      fullName: 'Олег Бондаренко',
      roles: [UserRole.STUDENT, UserRole.AUTHOR],
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { fullName: user.fullName, roles: user.roles },
      create: { ...user, passwordHash: demoPasswordHash, emailVerifiedAt: now },
    });
  }

  // Author profiles + zero balances for both authors.
  const authors = [
    {
      userId: id.users.iryna,
      displayName: 'Ірина Мельник',
      headline: 'Репетитор з математики, 8 років досвіду',
      bio: 'Готую до НМТ з математики. Понад 300 учнів, середній бал 180+.',
      isVerified: true,
    },
    {
      userId: id.users.oleh,
      displayName: 'Олег Бондаренко',
      headline: 'Учитель англійської мови, НУШ',
      bio: 'Створюю готові матеріали до уроків за програмою НУШ для 5–9 класів.',
      isVerified: false,
    },
  ];

  for (const author of authors) {
    await prisma.authorProfile.upsert({
      where: { userId: author.userId },
      update: { headline: author.headline, bio: author.bio },
      create: {
        ...author,
        verifiedAt: author.isVerified ? now : null,
        commissionRateBps: null,
      },
    });
    await prisma.balance.upsert({
      where: { userId: author.userId },
      update: {},
      create: { userId: author.userId },
    });
  }
}

async function seedTaxonomy(): Promise<void> {
  const categories = [
    { id: id.categories.school, parentId: null, slug: 'shkilni-predmety', nameUk: 'Шкільні предмети', sortOrder: 1 },
    { id: id.categories.english, parentId: id.categories.school, slug: 'anhliiska-mova', nameUk: 'Англійська мова', sortOrder: 1 },
    { id: id.categories.math, parentId: id.categories.school, slug: 'matematyka', nameUk: 'Математика', sortOrder: 2 },
    { id: id.categories.nmt, parentId: null, slug: 'pidhotovka-nmt', nameUk: 'Підготовка до НМТ', sortOrder: 2 },
    { id: id.categories.health, parentId: null, slug: 'sport-i-zdorovia', nameUk: 'Спорт і здоров’я', sortOrder: 3 },
  ];

  // Parents first: the self-referencing FK requires it.
  for (const category of categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: { nameUk: category.nameUk, sortOrder: category.sortOrder },
      create: category,
    });
  }

  const subjects = [
    { id: id.subjects.english, slug: 'anhliiska-mova', nameUk: 'Англійська мова' },
    { id: id.subjects.math, slug: 'matematyka', nameUk: 'Математика' },
  ];
  for (const subject of subjects) {
    await prisma.curriculumSubject.upsert({
      where: { id: subject.id },
      update: { nameUk: subject.nameUk },
      create: subject,
    });
  }

  const topics = [
    { id: id.topics.presentPerfect, subjectId: id.subjects.english, grade: 7, title: 'Present Perfect', sortOrder: 1 },
    { id: id.topics.quadratic, subjectId: id.subjects.math, grade: 9, title: 'Квадратні рівняння', sortOrder: 1 },
  ];
  for (const topic of topics) {
    await prisma.curriculumTopic.upsert({
      where: { id: topic.id },
      update: { title: topic.title },
      create: topic,
    });
  }
}

async function seedFiles(): Promise<void> {
  const files = [
    {
      id: id.files.coverMath,
      kind: FileKind.COVER,
      provider: StorageProvider.S3,
      storageKey: 'covers/demo-math-nmt.jpg',
      originalName: 'math-nmt-cover.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 184_320n,
      uploadedById: id.users.iryna,
    },
    {
      id: id.files.coverEnglish,
      kind: FileKind.COVER,
      provider: StorageProvider.S3,
      storageKey: 'covers/demo-present-perfect.jpg',
      originalName: 'present-perfect-cover.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 151_200n,
      uploadedById: id.users.oleh,
    },
    {
      id: id.files.videoIntro,
      kind: FileKind.VIDEO,
      provider: StorageProvider.CLOUDFLARE_STREAM,
      // For Cloudflare Stream storageKey holds the video UID, not an S3 key.
      storageKey: 'demo-stream-uid-0001',
      originalName: 'lesson-01-intro.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 48_234_496n,
      durationSec: 612,
      uploadedById: id.users.iryna,
    },
    {
      id: id.files.pdfSummary,
      kind: FileKind.ATTACHMENT,
      provider: StorageProvider.S3,
      storageKey: 'materials/present-perfect-konspekt.pdf',
      originalName: 'Present Perfect — конспект.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1_204_224n,
      uploadedById: id.users.oleh,
    },
    {
      id: id.files.pptxLesson,
      kind: FileKind.ATTACHMENT,
      provider: StorageProvider.S3,
      storageKey: 'materials/present-perfect-presentation.pptx',
      originalName: 'Present Perfect — презентація.pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      sizeBytes: 5_662_310n,
      uploadedById: id.users.oleh,
    },
  ];

  for (const file of files) {
    await prisma.file.upsert({
      where: { id: file.id },
      update: { storageKey: file.storageKey },
      create: file,
    });
  }
}

/** Online course: modules -> lessons -> quiz. */
async function seedCourseWithPlayer(): Promise<void> {
  const publishedAt = new Date('2026-06-01T10:00:00Z');

  await prisma.course.upsert({
    where: { id: id.courses.mathNmt },
    update: { status: CourseStatus.PUBLISHED },
    create: {
      id: id.courses.mathNmt,
      authorId: id.users.iryna,
      categoryId: id.categories.nmt,
      coverFileId: id.files.coverMath,
      type: ContentType.COURSE,
      status: CourseStatus.PUBLISHED,
      slug: 'pidhotovka-do-nmt-matematyka',
      title: 'Підготовка до НМТ: математика з нуля',
      shortDescription: 'Повний курс підготовки до НМТ з математики: теорія, розбір задач і тести за форматом тестування.',
      description:
        'Курс охоплює всі теми НМТ з математики. Кожен модуль містить відеоурок, конспект і тест для самоперевірки. ' +
        'Після кожного блоку — розбір типових помилок та завдання минулих років.',
      outcomes: [
        'Розв’язувати всі типи завдань НМТ з математики',
        'Правильно розподіляти час на тестуванні',
        'Закрити прогалини зі шкільної програми 7–11 класів',
      ],
      grade: 11,
      priceAmount: uah(1490),
      lessonsCount: 3,
      durationSec: 612,
      submittedAt: new Date('2026-05-28T09:00:00Z'),
      publishedAt,
    },
  });

  const modules = [
    { id: id.modules.mathBasics, courseId: id.courses.mathNmt, title: 'Модуль 1. Числа та вирази', sortOrder: 1 },
    { id: id.modules.mathEquations, courseId: id.courses.mathNmt, title: 'Модуль 2. Рівняння та нерівності', sortOrder: 2 },
  ];
  for (const module of modules) {
    await prisma.module.upsert({
      where: { id: module.id },
      update: { title: module.title },
      create: module,
    });
  }

  const lessons = [
    {
      id: id.lessons.mathIntro,
      moduleId: id.modules.mathBasics,
      type: LessonType.VIDEO,
      title: 'Урок 1. Вступ: структура НМТ з математики',
      sortOrder: 1,
      isFreePreview: true, // free preview for guests (TZ 14.1)
      videoFileId: id.files.videoIntro,
      durationSec: 612,
    },
    {
      id: id.lessons.mathTheory,
      moduleId: id.modules.mathBasics,
      type: LessonType.TEXT,
      title: 'Урок 2. Дії з дробами: конспект',
      sortOrder: 2,
      isFreePreview: false,
      textContent: '## Дії з дробами\n\nЩоб додати дроби з різними знаменниками, зведіть їх до спільного знаменника...',
    },
    {
      id: id.lessons.mathQuiz,
      moduleId: id.modules.mathEquations,
      type: LessonType.QUIZ,
      title: 'Тест до модуля 2',
      sortOrder: 1,
      isFreePreview: false,
    },
  ];
  for (const lesson of lessons) {
    await prisma.lesson.upsert({
      where: { id: lesson.id },
      update: { title: lesson.title },
      create: lesson,
    });
  }

  await prisma.quiz.upsert({
    where: { id: id.quiz },
    update: {},
    create: {
      id: id.quiz,
      lessonId: id.lessons.mathQuiz,
      title: 'Квадратні рівняння: перевірка знань',
      passScore: 60,
      timeLimitSec: 900,
    },
  });

  const questions = [
    {
      id: id.questions.q1,
      quizId: id.quiz,
      type: QuestionType.SINGLE,
      text: 'Скільки коренів має рівняння x² + 4x + 4 = 0?',
      sortOrder: 1,
      options: [
        { text: 'Один', isCorrect: true },
        { text: 'Два різних', isCorrect: false },
        { text: 'Жодного', isCorrect: false },
      ],
    },
    {
      id: id.questions.q2,
      quizId: id.quiz,
      type: QuestionType.MULTIPLE,
      text: 'Які з наведених рівнянь є квадратними?',
      sortOrder: 2,
      options: [
        { text: '2x² − 3x + 1 = 0', isCorrect: true },
        { text: 'x³ − 1 = 0', isCorrect: false },
        { text: 'x² = 9', isCorrect: true },
      ],
    },
  ];

  for (const question of questions) {
    const { options, ...data } = question;
    await prisma.question.upsert({
      where: { id: data.id },
      update: { text: data.text },
      create: data,
    });
    // Options have no natural key: rewrite the set on every run.
    await prisma.answerOption.deleteMany({ where: { questionId: data.id } });
    await prisma.answerOption.createMany({
      data: options.map((option, index) => ({
        questionId: data.id,
        text: option.text,
        isCorrect: option.isCorrect,
        sortOrder: index + 1,
      })),
    });
  }

  await prisma.courseTopic.upsert({
    where: { courseId_topicId: { courseId: id.courses.mathNmt, topicId: id.topics.quadratic } },
    update: {},
    create: { courseId: id.courses.mathNmt, topicId: id.topics.quadratic },
  });

  const moderationEntries = [
    {
      id: id.moderationLog.submitted,
      courseId: id.courses.mathNmt,
      moderatorId: null,
      action: ModerationAction.SUBMITTED,
      fromStatus: CourseStatus.DRAFT,
      toStatus: CourseStatus.MODERATION,
    },
    {
      id: id.moderationLog.approved,
      courseId: id.courses.mathNmt,
      moderatorId: id.users.admin,
      action: ModerationAction.APPROVED,
      fromStatus: CourseStatus.MODERATION,
      toStatus: CourseStatus.PUBLISHED,
      comment: 'Контент відповідає правилам платформи.',
    },
  ];
  for (const entry of moderationEntries) {
    await prisma.moderationLog.upsert({
      where: { id: entry.id },
      update: {},
      create: entry,
    });
  }
}

/** Downloadable material: no modules, a flat file pack. */
async function seedDownloadableMaterial(): Promise<void> {
  await prisma.course.upsert({
    where: { id: id.courses.englishMaterial },
    update: { status: CourseStatus.PUBLISHED },
    create: {
      id: id.courses.englishMaterial,
      authorId: id.users.oleh,
      categoryId: id.categories.english,
      coverFileId: id.files.coverEnglish,
      type: ContentType.MATERIAL,
      status: CourseStatus.PUBLISHED,
      slug: 'present-perfect-7-klas-material',
      title: 'Present Perfect, 7 клас: презентація + конспект + завдання',
      shortDescription: 'Готовий комплект матеріалів до уроку англійської мови за програмою НУШ, 7 клас.',
      description:
        'Комплект містить презентацію на 24 слайди, конспект уроку для вчителя та роздатковий матеріал ' +
        'із завданнями трьох рівнів складності. Формати: PPTX і PDF.',
      outcomes: ['Готовий план уроку на 45 хвилин', 'Роздатковий матеріал для класу'],
      grade: 7,
      priceAmount: uah(80),
      publishedAt: new Date('2026-06-10T08:30:00Z'),
      submittedAt: new Date('2026-06-09T18:00:00Z'),
    },
  });

  const courseFiles = [
    { fileId: id.files.pptxLesson, title: 'Презентація до уроку (24 слайди)', sortOrder: 1 },
    { fileId: id.files.pdfSummary, title: 'Конспект уроку та роздатковий матеріал', sortOrder: 2 },
  ];
  for (const courseFile of courseFiles) {
    await prisma.courseFile.upsert({
      where: { courseId_fileId: { courseId: id.courses.englishMaterial, fileId: courseFile.fileId } },
      update: { title: courseFile.title },
      create: { courseId: id.courses.englishMaterial, ...courseFile },
    });
  }

  await prisma.courseTopic.upsert({
    where: { courseId_topicId: { courseId: id.courses.englishMaterial, topicId: id.topics.presentPerfect } },
    update: {},
    create: { courseId: id.courses.englishMaterial, topicId: id.topics.presentPerfect },
  });

  // A draft course to exercise the moderation queue in the admin panel.
  await prisma.course.upsert({
    where: { id: id.courses.draftPsychology },
    update: { status: CourseStatus.MODERATION },
    create: {
      id: id.courses.draftPsychology,
      authorId: id.users.iryna,
      categoryId: id.categories.health,
      type: ContentType.COURSE,
      status: CourseStatus.MODERATION,
      slug: 'zdorovyi-son-shkoliara',
      title: 'Здоровий сон школяра: як відновити режим',
      shortDescription: 'Короткий курс для батьків і підлітків про режим сну під час підготовки до іспитів.',
      description: 'Чернетка на модерації. Використовується для демонстрації черги модерації в адмін-панелі.',
      priceAmount: uah(390),
      submittedAt: new Date('2026-07-20T12:00:00Z'),
    },
  });
}

/**
 * Full purchase flow in one transaction, exactly as the payment webhook will do it:
 * order -> payment SUCCESS -> order item money snapshot -> enrollment -> ledger.
 */
async function seedPurchase(): Promise<void> {
  const price = uah(80);
  const { commissionAmount, authorAmount } = splitPrice(price, DEFAULT_COMMISSION_BPS);
  const paidAt = new Date('2026-07-15T19:24:00Z');

  await prisma.$transaction(async (tx) => {
    await tx.order.upsert({
      where: { id: id.order },
      update: { status: OrderStatus.PAID },
      create: {
        id: id.order,
        userId: id.users.oksana,
        status: OrderStatus.PAID,
        totalAmount: price,
        paidAt,
      },
    });

    await tx.orderItem.upsert({
      where: { id: id.orderItem },
      update: {},
      create: {
        id: id.orderItem,
        orderId: id.order,
        courseId: id.courses.englishMaterial,
        authorId: id.users.oleh,
        titleSnapshot: 'Present Perfect, 7 клас: презентація + конспект + завдання',
        priceAmount: price,
        commissionRateBps: DEFAULT_COMMISSION_BPS,
        commissionAmount,
        authorAmount,
      },
    });

    await tx.payment.upsert({
      where: { id: id.payment },
      update: { status: PaymentStatus.SUCCESS },
      create: {
        id: id.payment,
        orderId: id.order,
        provider: PaymentProvider.LIQPAY,
        providerPaymentId: 'sandbox-2026-0715-0001',
        status: PaymentStatus.SUCCESS,
        amount: price,
        processedAt: paidAt,
        payload: { sandbox: true, action: 'pay', status: 'sandbox' },
      },
    });

    await tx.enrollment.upsert({
      where: { id: id.enrollment },
      update: {},
      create: {
        id: id.enrollment,
        userId: id.users.oksana,
        courseId: id.courses.englishMaterial,
        orderItemId: id.orderItem,
        source: EnrollmentSource.PURCHASE,
        progressPercent: 100,
        completedAt: paidAt,
      },
    });

    // Ledger entry + cached balance are always written together.
    const existingEntry = await tx.balanceEntry.findFirst({
      where: { orderItemId: id.orderItem, type: BalanceEntryType.SALE },
    });
    if (!existingEntry) {
      await tx.balanceEntry.create({
        data: {
          userId: id.users.oleh,
          type: BalanceEntryType.SALE,
          amount: authorAmount,
          orderItemId: id.orderItem,
          comment: 'Продаж матеріалу «Present Perfect, 7 клас»',
        },
      });
      await tx.balance.update({
        where: { userId: id.users.oleh },
        data: { availableAmount: { increment: authorAmount } },
      });
    }

    await tx.course.update({
      where: { id: id.courses.englishMaterial },
      data: { studentsCount: 1 },
    });
  });

  await prisma.review.upsert({
    where: { id: id.review },
    update: {},
    create: {
      id: id.review,
      courseId: id.courses.englishMaterial,
      userId: id.users.oksana,
      rating: 5,
      text: 'Готовий комплект, нічого не довелося переробляти. Зекономила вечір підготовки.',
      authorReply: 'Дякую за відгук! Наступного тижня додам варіант для 8 класу.',
      authorRepliedAt: new Date('2026-07-16T09:10:00Z'),
    },
  });

  await prisma.course.update({
    where: { id: id.courses.englishMaterial },
    data: { ratingAvg: 5, reviewsCount: 1 },
  });
  await prisma.authorProfile.update({
    where: { userId: id.users.oleh },
    data: { ratingAvg: 5, reviewsCount: 1, studentsCount: 1 },
  });

  const notifications = [
    {
      id: id.notifications.authorSale,
      userId: id.users.oleh,
      type: NotificationType.PURCHASE,
      title: 'Новий продаж: Present Perfect, 7 клас',
      body: 'На ваш баланс нараховано 68,00 грн.',
      payload: { orderItemId: id.orderItem },
    },
    {
      id: id.notifications.studentAccess,
      userId: id.users.oksana,
      type: NotificationType.PURCHASE,
      title: 'Матеріал доступний для завантаження',
      payload: { courseId: id.courses.englishMaterial },
    },
  ];
  for (const notification of notifications) {
    await prisma.notification.upsert({
      where: { id: notification.id },
      update: {},
      create: notification,
    });
  }
}

/** Second student mid-way through the online course, for player screenshots. */
async function seedInProgressStudent(): Promise<void> {
  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: id.users.dmytro, courseId: id.courses.mathNmt } },
    update: {},
    create: {
      userId: id.users.dmytro,
      courseId: id.courses.mathNmt,
      source: EnrollmentSource.ADMIN_GRANT,
      progressPercent: 33,
      lastLessonId: id.lessons.mathTheory,
    },
  });

  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: id.lessons.mathIntro } },
    update: {},
    create: {
      enrollmentId: enrollment.id,
      lessonId: id.lessons.mathIntro,
      status: ProgressStatus.COMPLETED,
      watchedSeconds: 612,
      completedAt: new Date('2026-07-22T07:40:00Z'),
    },
  });

  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: id.lessons.mathTheory } },
    update: {},
    create: {
      enrollmentId: enrollment.id,
      lessonId: id.lessons.mathTheory,
      status: ProgressStatus.IN_PROGRESS,
    },
  });

  await prisma.course.update({
    where: { id: id.courses.mathNmt },
    data: { studentsCount: 1 },
  });
}

async function main(): Promise<void> {
  await seedUsers();
  await seedTaxonomy();
  await seedFiles();
  await seedCourseWithPlayer();
  await seedDownloadableMaterial();
  await seedPurchase();
  await seedInProgressStudent();

  const [users, courses, orders] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.order.count(),
  ]);
  console.log(`Seed done: ${users} users, ${courses} courses, ${orders} orders.`);
  console.log('Demo login for every account: password "Vexa12345!"');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
