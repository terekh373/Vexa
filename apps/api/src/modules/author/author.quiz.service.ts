import {
  CourseStatus,
  LessonType,
  QuestionType,
  type Prisma,
} from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import type {
  CreateQuestionInput,
  CreateQuizInput,
  UpdateQuestionInput,
  UpdateQuizInput,
} from './author.quiz.validation.js';

const EDITABLE_STATUSES = new Set<CourseStatus>([
  CourseStatus.DRAFT,
  CourseStatus.REJECTED,
]);

type DbClient = Prisma.TransactionClient | typeof prisma;

const authorQuestionSelect = {
  id: true,
  quizId: true,
  type: true,
  text: true,
  points: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  options: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    select: {
      id: true,
      questionId: true,
      text: true,
      isCorrect: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.QuestionSelect;

const authorQuizSelect = {
  id: true,
  lessonId: true,
  title: true,
  passScore: true,
  timeLimitSec: true,
  attemptsAllowed: true,
  createdAt: true,
  updatedAt: true,
  questions: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    select: authorQuestionSelect,
  },
} satisfies Prisma.QuizSelect;

function assertEditable(status: CourseStatus): void {
  if (!EDITABLE_STATUSES.has(status)) {
    throw AppError.conflict('Course can be edited only in DRAFT or REJECTED status');
  }
}

async function findLessonForAuthor(db: DbClient, lessonId: string, userId: string) {
  const lesson = await db.lesson.findFirst({
    where: {
      id: lessonId,
      deletedAt: null,
      module: {
        deletedAt: null,
        course: { deletedAt: null },
      },
    },
    select: {
      id: true,
      title: true,
      type: true,
      module: {
        select: {
          course: {
            select: {
              authorId: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (lesson === null) throw AppError.notFound('Lesson not found');
  if (lesson.module.course.authorId !== userId) {
    throw AppError.forbidden('Lesson belongs to another author');
  }

  return lesson;
}

async function findQuizForAuthor(db: DbClient, quizId: string, userId: string) {
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      lessonId: true,
      lesson: {
        select: {
          deletedAt: true,
          module: {
            select: {
              deletedAt: true,
              course: {
                select: {
                  authorId: true,
                  status: true,
                  deletedAt: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (
    quiz === null ||
    quiz.lesson.deletedAt !== null ||
    quiz.lesson.module.deletedAt !== null ||
    quiz.lesson.module.course.deletedAt !== null
  ) {
    throw AppError.notFound('Quiz not found');
  }

  if (quiz.lesson.module.course.authorId !== userId) {
    throw AppError.forbidden('Quiz belongs to another author');
  }

  return quiz;
}

async function findQuestionForAuthor(db: DbClient, questionId: string, userId: string) {
  const question = await db.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      type: true,
      quizId: true,
      quiz: {
        select: {
          lesson: {
            select: {
              deletedAt: true,
              module: {
                select: {
                  deletedAt: true,
                  course: {
                    select: {
                      authorId: true,
                      status: true,
                      deletedAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (
    question === null ||
    question.quiz.lesson.deletedAt !== null ||
    question.quiz.lesson.module.deletedAt !== null ||
    question.quiz.lesson.module.course.deletedAt !== null
  ) {
    throw AppError.notFound('Question not found');
  }

  if (question.quiz.lesson.module.course.authorId !== userId) {
    throw AppError.forbidden('Question belongs to another author');
  }

  return question;
}

async function nextQuestionSortOrder(db: DbClient, quizId: string): Promise<number> {
  const result = await db.question.aggregate({
    where: { quizId },
    _max: { sortOrder: true },
  });
  return (result._max.sortOrder ?? -1) + 1;
}

function assertOptionsForType(
  type: QuestionType,
  options: Array<{ isCorrect: boolean }>,
): void {
  if (options.length < 2) {
    throw AppError.validation('At least two answer options are required');
  }

  const correctCount = options.filter((option) => option.isCorrect).length;
  if (correctCount < 1) {
    throw AppError.validation('At least one answer option must be correct');
  }
  if (type === QuestionType.SINGLE && correctCount !== 1) {
    throw AppError.validation('SINGLE question must have exactly one correct answer');
  }
}

export async function createAuthorQuiz(
  userId: string,
  lessonId: string,
  input: CreateQuizInput,
) {
  return prisma.$transaction(async (tx) => {
    const lesson = await findLessonForAuthor(tx, lessonId, userId);
    assertEditable(lesson.module.course.status);

    if (lesson.type !== LessonType.QUIZ) {
      throw AppError.validation('Quiz can only be created for a QUIZ lesson');
    }

    const existing = await tx.quiz.findUnique({
      where: { lessonId },
      select: { id: true },
    });
    if (existing !== null) {
      throw AppError.conflict('This lesson already has a quiz');
    }

    return tx.quiz.create({
      data: {
        lessonId,
        title: lesson.title,
        passScore: input.passScore ?? 60,
        attemptsAllowed: input.attemptsAllowed ?? null,
      },
      select: authorQuizSelect,
    });
  });
}

export async function updateAuthorQuiz(
  userId: string,
  quizId: string,
  input: UpdateQuizInput,
) {
  return prisma.$transaction(async (tx) => {
    const quiz = await findQuizForAuthor(tx, quizId, userId);
    assertEditable(quiz.lesson.module.course.status);

    return tx.quiz.update({
      where: { id: quizId },
      data: input,
      select: authorQuizSelect,
    });
  });
}

export async function deleteAuthorQuiz(userId: string, quizId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const quiz = await findQuizForAuthor(tx, quizId, userId);
    assertEditable(quiz.lesson.module.course.status);
    await tx.quiz.delete({ where: { id: quizId } });
  });
}

export async function createAuthorQuestion(
  userId: string,
  quizId: string,
  input: CreateQuestionInput,
) {
  return prisma.$transaction(async (tx) => {
    const quiz = await findQuizForAuthor(tx, quizId, userId);
    assertEditable(quiz.lesson.module.course.status);
    assertOptionsForType(input.type, input.options);

    const sortOrder = input.sortOrder ?? (await nextQuestionSortOrder(tx, quizId));
    return tx.question.create({
      data: {
        quizId,
        text: input.text,
        type: input.type,
        sortOrder,
        options: {
          create: input.options.map((option, index) => ({
            text: option.text,
            isCorrect: option.isCorrect,
            sortOrder: option.sortOrder ?? index,
          })),
        },
      },
      select: authorQuestionSelect,
    });
  });
}

export async function updateAuthorQuestion(
  userId: string,
  questionId: string,
  input: UpdateQuestionInput,
) {
  return prisma.$transaction(async (tx) => {
    const question = await findQuestionForAuthor(tx, questionId, userId);
    assertEditable(question.quiz.lesson.module.course.status);

    const resultingType = input.type ?? question.type;
    let optionsForValidation = input.options;

    if (optionsForValidation === undefined && input.type !== undefined) {
      optionsForValidation = await tx.answerOption.findMany({
        where: { questionId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { text: true, isCorrect: true, sortOrder: true },
      });
    }

    if (optionsForValidation !== undefined) {
      assertOptionsForType(resultingType, optionsForValidation);
    }

    return tx.question.update({
      where: { id: questionId },
      data: {
        ...(input.text === undefined ? {} : { text: input.text }),
        ...(input.type === undefined ? {} : { type: input.type }),
        ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
        ...(input.options === undefined
          ? {}
          : {
              options: {
                deleteMany: {},
                create: input.options.map((option, index) => ({
                  text: option.text,
                  isCorrect: option.isCorrect,
                  sortOrder: option.sortOrder ?? index,
                })),
              },
            }),
      },
      select: authorQuestionSelect,
    });
  });
}

export async function deleteAuthorQuestion(
  userId: string,
  questionId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const question = await findQuestionForAuthor(tx, questionId, userId);
    assertEditable(question.quiz.lesson.module.course.status);
    await tx.question.delete({ where: { id: questionId } });
  });
}
