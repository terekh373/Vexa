import {
  CourseStatus,
  EnrollmentSource,
  ReviewStatus,
  UserRole,
  type Prisma,
} from '@prisma/client';

import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { notifyNewReview } from '../notifications/notifications.service.js';
import type {
  CreateCourseReviewInput,
  UpdateCourseReviewInput,
} from './course.validation.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REVIEW_ELIGIBLE_SOURCES: EnrollmentSource[] = [
  EnrollmentSource.PURCHASE,
  EnrollmentSource.FREE,
];

const REVIEW_ELIGIBLE_ROLES = new Set<UserRole>([
  UserRole.STUDENT,
  UserRole.AUTHOR,
]);

function extensionFromName(name: string): string | null {
  const lastDot = name.lastIndexOf('.');

  if (lastDot <= 0 || lastDot === name.length - 1) {
    return null;
  }

  return name.slice(lastDot + 1).toLowerCase();
}

function publicAssetUrl(storageKey: string): string | null {
  const base = process.env.PUBLIC_ASSET_BASE_URL?.replace(/\/$/, '');

  if (base === undefined || base.length === 0) {
    return null;
  }

  return `${base}/${storageKey.replace(/^\//, '')}`;
}

const publicReviewSelect = {
  id: true,
  rating: true,
  text: true,
  authorReply: true,
  authorRepliedAt: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      fullName: true,
      avatar: {
        select: {
          id: true,
          storageKey: true,
          originalName: true,
          mimeType: true,
        },
      },
    },
  },
} satisfies Prisma.ReviewSelect;

type PublicReviewRecord = Prisma.ReviewGetPayload<{
  select: typeof publicReviewSelect;
}>;

function mapPublicReview(review: PublicReviewRecord) {
  return {
    id: review.id,
    rating: review.rating,
    text: review.text,
    createdAt: review.createdAt,
    authorReply: review.authorReply,
    authorRepliedAt: review.authorRepliedAt,
    author: {
      id: review.user.id,
      name: review.user.fullName,
      avatar: review.user.avatar
        ? {
            id: review.user.avatar.id,
            fileName: review.user.avatar.originalName,
            mimeType: review.user.avatar.mimeType,
            url: publicAssetUrl(review.user.avatar.storageKey),
          }
        : null,
    },
  };
}

type LockedCourseRow = {
  id: string;
  authorId: string;
};

async function lockCourseAndAuthorProfile(
  tx: Prisma.TransactionClient,
  courseId: string,
): Promise<LockedCourseRow> {
  const rows = await tx.$queryRaw<LockedCourseRow[]>`
    SELECT id, author_id AS "authorId"
    FROM courses
    WHERE id = ${courseId}::uuid
    FOR UPDATE
  `;

  const course = rows[0];

  if (course === undefined) {
    throw AppError.notFound('Course not found');
  }

  // Keep the lock order stable for every review write: course first,
  // then the author's profile. This prevents two concurrent reviews from
  // persisting stale denormalized counters.
  await tx.$queryRaw`
    SELECT id
    FROM author_profiles
    WHERE user_id = ${course.authorId}::uuid
    FOR UPDATE
  `;

  return course;
}

async function recalculateReviewRatings(
  tx: Prisma.TransactionClient,
  courseId: string,
  authorId: string,
) {
  const courseWhere = {
    courseId,
    status: ReviewStatus.PUBLISHED,
  } as const;

  const courseCount = await tx.review.count({ where: courseWhere });
  const courseAggregate = await tx.review.aggregate({
    where: courseWhere,
    _avg: { rating: true },
  });
  const courseAverage = courseAggregate._avg.rating ?? 0;

  await tx.course.update({
    where: { id: courseId },
    data: {
      ratingAvg: courseAverage,
      reviewsCount: courseCount,
    },
  });

  const authorWhere = {
    status: ReviewStatus.PUBLISHED,
    course: {
      authorId,
      deletedAt: null,
    },
  } as const;

  const authorCount = await tx.review.count({ where: authorWhere });
  const authorAggregate = await tx.review.aggregate({
    where: authorWhere,
    _avg: { rating: true },
  });
  const authorAverage = authorAggregate._avg.rating ?? 0;

  await tx.authorProfile.updateMany({
    where: { userId: authorId },
    data: {
      ratingAvg: authorAverage,
      reviewsCount: authorCount,
    },
  });

  return {
    average: Number(courseAverage),
    count: courseCount,
  };
}

const courseDetailsSelect = {
  id: true,
  authorId: true,
  type: true,
  slug: true,
  title: true,
  shortDescription: true,
  description: true,
  outcomes: true,
  language: true,
  grade: true,
  priceAmount: true,
  currency: true,
  ratingAvg: true,
  reviewsCount: true,
  studentsCount: true,
  lessonsCount: true,
  durationSec: true,
  publishedAt: true,

  cover: {
    select: {
      id: true,
      storageKey: true,
      originalName: true,
      mimeType: true,
    },
  },

  category: {
    select: {
      id: true,
      slug: true,
      nameUk: true,
      nameEn: true,
    },
  },

  author: {
    select: {
      id: true,
      fullName: true,

      avatar: {
        select: {
          id: true,
          storageKey: true,
          originalName: true,
          mimeType: true,
        },
      },

      authorProfile: {
        select: {
          displayName: true,
          headline: true,
          bio: true,
          websiteUrl: true,
          isVerified: true,
          ratingAvg: true,
          reviewsCount: true,
          studentsCount: true,
        },
      },
    },
  },

  modules: {
    where: {
      deletedAt: null,
    },

    orderBy: {
      sortOrder: 'asc' as const,
    },

    select: {
      id: true,
      title: true,
      sortOrder: true,

      lessons: {
        where: {
          deletedAt: null,
        },

        orderBy: {
          sortOrder: 'asc' as const,
        },

        select: {
          id: true,
          type: true,
          title: true,
          sortOrder: true,
          isFreePreview: true,
          textContent: true,
          durationSec: true,

          video: {
            select: {
              id: true,
              originalName: true,
              mimeType: true,
              sizeBytes: true,
              durationSec: true,
            },
          },

          files: {
            orderBy: {
              sortOrder: 'asc' as const,
            },

            select: {
              id: true,
              sortOrder: true,

              file: {
                select: {
                  id: true,
                  originalName: true,
                  mimeType: true,
                  sizeBytes: true,
                },
              },
            },
          },

          quiz: {
            select: {
              id: true,
              passScore: true,
              attemptsAllowed: true,
              questions: {
                orderBy: {
                  sortOrder: 'asc' as const,
                },
                select: {
                  id: true,
                  type: true,
                  text: true,
                  points: true,
                  sortOrder: true,
                  options: {
                    orderBy: {
                      sortOrder: 'asc' as const,
                    },
                    select: {
                      id: true,
                      text: true,
                      sortOrder: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  courseFiles: {
    orderBy: {
      sortOrder: 'asc' as const,
    },

    select: {
      id: true,
      title: true,
      sortOrder: true,

      file: {
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
        },
      },
    },
  },
} as const;

export async function getCourseDetails(
  idOrSlug: string,
  currentUserId?: string,
) {
  const identifier = UUID_RE.test(idOrSlug)
    ? { id: idOrSlug }
    : { slug: idOrSlug };

  const course = await prisma.course.findFirst({
    where: {
      ...identifier,
      status: CourseStatus.PUBLISHED,
      deletedAt: null,
    },

    select: courseDetailsSelect,
  });

  if (course === null) {
    return null;
  }

  let hasAccess =
    course.priceAmount === 0 ||
    currentUserId === course.authorId;
  let canReview = false;

  if (currentUserId !== undefined) {
    const [currentUser, enrollment, existingReview] = await Promise.all([
      prisma.user.findUnique({
        where: { id: currentUserId },
        select: { roles: true },
      }),
      prisma.enrollment.findFirst({
        where: {
          userId: currentUserId,
          courseId: course.id,
          revokedAt: null,
        },
        select: {
          id: true,
          source: true,
        },
      }),
      prisma.review.findUnique({
        where: {
          courseId_userId: {
            courseId: course.id,
            userId: currentUserId,
          },
        },
        select: { id: true },
      }),
    ]);

    const hasReviewRole =
      currentUser?.roles.some((role) => REVIEW_ELIGIBLE_ROLES.has(role)) ?? false;
    const hasReviewEnrollment =
      enrollment !== null &&
      REVIEW_ELIGIBLE_SOURCES.includes(enrollment.source);

    hasAccess = hasAccess || enrollment !== null;
    canReview =
      hasReviewRole &&
      hasReviewEnrollment &&
      existingReview === null;
  }

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    shortDescription: course.shortDescription,
    description: course.description,
    outcomes: course.outcomes,
    type: course.type,
    language: course.language,
    grade: course.grade,

    price: {
      amount: course.priceAmount,
      currency: course.currency,
    },

    cover: course.cover
      ? {
          id: course.cover.id,
          fileName: course.cover.originalName,
          mimeType: course.cover.mimeType,
          url: publicAssetUrl(course.cover.storageKey),
        }
      : null,

    category: course.category,

    author: {
      id: course.author.id,

      name:
        course.author.authorProfile?.displayName ??
        course.author.fullName,

      headline:
        course.author.authorProfile?.headline ?? null,

      bio:
        course.author.authorProfile?.bio ?? null,

      websiteUrl:
        course.author.authorProfile?.websiteUrl ?? null,

      isVerified:
        course.author.authorProfile?.isVerified ?? false,

      rating: Number(
        course.author.authorProfile?.ratingAvg ?? 0,
      ),

      reviewsCount:
        course.author.authorProfile?.reviewsCount ?? 0,

      studentsCount:
        course.author.authorProfile?.studentsCount ?? 0,

      avatar: course.author.avatar
        ? {
            id: course.author.avatar.id,
            fileName: course.author.avatar.originalName,
            mimeType: course.author.avatar.mimeType,
            url: publicAssetUrl(
              course.author.avatar.storageKey,
            ),
          }
        : null,
    },

    rating: {
      average: Number(course.ratingAvg),
      count: course.reviewsCount,
    },

    studentsCount: course.studentsCount,
    lessonsCount: course.lessonsCount,
    durationSec: course.durationSec,
    publishedAt: course.publishedAt,
    hasAccess,
    canReview,

    modules: course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      position: module.sortOrder,

      lessons: module.lessons.map((lesson) => {
        const canView =
          hasAccess || lesson.isFreePreview;

        return {
          id: lesson.id,
          type: lesson.type,
          title: lesson.title,
          position: lesson.sortOrder,
          isPreview: lesson.isFreePreview,
          isLocked: !canView,
          durationSec: lesson.durationSec,

          ...(canView
            ? {
                content: {
                  text: lesson.textContent,

                  video: lesson.video
                    ? {
                        id: lesson.video.id,
                        fileName:
                          lesson.video.originalName,
                        mimeType:
                          lesson.video.mimeType,
                        sizeBytes:
                          lesson.video.sizeBytes.toString(),
                        durationSec:
                          lesson.video.durationSec,
                      }
                    : null,

                  materials: lesson.files.map(
                    (attachment) => ({
                      id: attachment.id,
                      fileId: attachment.file.id,
                      name:
                        attachment.file.originalName,
                      format: extensionFromName(
                        attachment.file.originalName,
                      ),
                      mimeType:
                        attachment.file.mimeType,
                      sizeBytes:
                        attachment.file.sizeBytes.toString(),
                    }),
                  ),

                  quiz: lesson.quiz
                    ? {
                        id: lesson.quiz.id,
                        passScore: lesson.quiz.passScore,
                        attemptsAllowed:
                          lesson.quiz.attemptsAllowed,
                        questions: lesson.quiz.questions.map(
                          (question) => ({
                            id: question.id,
                            type: question.type,
                            text: question.text,
                            points: question.points,
                            position: question.sortOrder,
                            options: question.options.map(
                              (option) => ({
                                id: option.id,
                                text: option.text,
                                position: option.sortOrder,
                              }),
                            ),
                          }),
                        ),
                      }
                    : null,
                },
              }
            : {}),
        };
      }),
    })),

    materials: course.courseFiles.map(
      (courseFile) => ({
        id: courseFile.id,
        fileId: courseFile.file.id,
        title: courseFile.title,
        name: courseFile.file.originalName,
        format: extensionFromName(
          courseFile.file.originalName,
        ),
        mimeType: courseFile.file.mimeType,
        sizeBytes:
          courseFile.file.sizeBytes.toString(),
      }),
    ),
  };
}

export async function getCourseReviews(
  courseId: string,
  page: number,
  limit: number,
) {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      status: CourseStatus.PUBLISHED,
      deletedAt: null,
    },

    select: {
      id: true,
    },
  });

  if (course === null) {
    return null;
  }

  const where = {
    courseId,
    status: ReviewStatus.PUBLISHED,
  } as const;

  const [reviews, count, aggregate] =
    await prisma.$transaction([
      prisma.review.findMany({
        where,

        orderBy: {
          createdAt: 'desc',
        },

        skip: (page - 1) * limit,
        take: limit,

        select: publicReviewSelect,
      }),

      prisma.review.count({
        where,
      }),

      prisma.review.aggregate({
        where,

        _avg: {
          rating: true,
        },
      }),
    ]);

  return {
    averageRating: aggregate._avg.rating ?? 0,
    reviewsCount: count,

    reviews: reviews.map(mapPublicReview),

    pagination: {
      page,
      limit,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

export async function createCourseReview(
  courseId: string,
  userId: string,
  input: CreateCourseReviewInput,
) {
  return prisma.$transaction(async (tx) => {
    const lockedCourse = await lockCourseAndAuthorProfile(tx, courseId);

    const course = await tx.course.findFirst({
      where: {
        id: courseId,
        status: CourseStatus.PUBLISHED,
        deletedAt: null,
      },
      select: { id: true, title: true },
    });

    if (course === null) {
      throw AppError.notFound('Course not found');
    }

    const enrollment = await tx.enrollment.findFirst({
      where: {
        userId,
        courseId,
        revokedAt: null,
        source: { in: REVIEW_ELIGIBLE_SOURCES },
      },
      select: { id: true },
    });

    if (enrollment === null) {
      throw AppError.forbidden('Course enrollment is required to leave a review');
    }

    const existingReview = await tx.review.findUnique({
      where: {
        courseId_userId: { courseId, userId },
      },
      select: { id: true },
    });

    if (existingReview !== null) {
      throw AppError.conflict('You have already reviewed this course');
    }

    const review = await tx.review.create({
      data: {
        courseId,
        userId,
        rating: input.rating,
        text: input.text && input.text.length > 0 ? input.text : null,
      },
      select: publicReviewSelect,
    });

    const rating = await recalculateReviewRatings(tx, courseId, lockedCourse.authorId);

    if (lockedCourse.authorId !== userId) {
      await notifyNewReview(
        {
          authorId: lockedCourse.authorId,
          courseId,
          courseTitle: course.title,
          reviewId: review.id,
          rating: review.rating,
        },
        tx,
      );
    }

    return {
      review: mapPublicReview(review),
      rating,
    };
  });
}

export async function updateMyCourseReview(
  courseId: string,
  userId: string,
  input: UpdateCourseReviewInput,
) {
  return prisma.$transaction(async (tx) => {
    const lockedCourse = await lockCourseAndAuthorProfile(tx, courseId);

    const course = await tx.course.findFirst({
      where: {
        id: courseId,
        status: CourseStatus.PUBLISHED,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (course === null) {
      throw AppError.notFound('Course not found');
    }

    const enrollment = await tx.enrollment.findFirst({
      where: {
        userId,
        courseId,
        revokedAt: null,
        source: { in: REVIEW_ELIGIBLE_SOURCES },
      },
      select: { id: true },
    });

    if (enrollment === null) {
      throw AppError.forbidden('Course enrollment is required to edit a review');
    }

    const existingReview = await tx.review.findUnique({
      where: {
        courseId_userId: { courseId, userId },
      },
      select: { id: true },
    });

    if (existingReview === null) {
      throw AppError.notFound('Review not found');
    }

    const review = await tx.review.update({
      where: { id: existingReview.id },
      data: {
        ...(input.rating === undefined ? {} : { rating: input.rating }),
        ...(input.text === undefined
          ? {}
          : { text: input.text.length > 0 ? input.text : null }),
      },
      select: publicReviewSelect,
    });

    const rating = await recalculateReviewRatings(tx, courseId, lockedCourse.authorId);

    return {
      review: mapPublicReview(review),
      rating,
    };
  });
}

