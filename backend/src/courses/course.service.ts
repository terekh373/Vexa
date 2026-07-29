import {
  ContentType,
  CourseStatus,
  PrismaClient,
  ReviewStatus,
  StorageProvider,
} from '@prisma/client';
import type { AuthUser } from '../auth/optional-auth.js';
import { HttpError } from '../http/errors.js';
import type { ReviewsPagination } from './course.validation.js';

const publicFileSelect = {
  id: true,
  provider: true,
  storageKey: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  durationSec: true,
  isReady: true,
} as const;

const encodeStoragePath = (storageKey: string): string =>
  storageKey
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

const buildPublicAssetUrl = (
  file: { provider: StorageProvider; storageKey: string } | null,
): string | null => {
  if (!file || file.provider !== StorageProvider.S3) {
    return null;
  }

  const baseUrl = process.env.PUBLIC_ASSET_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    return null;
  }
  return `${baseUrl}/${encodeStoragePath(file.storageKey)}`;
};

const toSafeByteCount = (value: bigint): number => {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new HttpError(
      500,
      'FILE_SIZE_OUT_OF_RANGE',
      'Розмір файлу перевищує безпечний діапазон JSON-чисел.',
    );
  }
  return Number(value);
};

const getFileFormat = (originalName: string, mimeType: string): string => {
  const extensionIndex = originalName.lastIndexOf('.');
  if (extensionIndex >= 0 && extensionIndex < originalName.length - 1) {
    return originalName.slice(extensionIndex + 1).toLowerCase();
  }
  return mimeType.split('/').at(-1)?.split(';')[0]?.toLowerCase() ?? 'file';
};

const mapFileMetadata = (file: {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: bigint;
}) => ({
  id: file.id,
  name: file.originalName,
  format: getFileFormat(file.originalName, file.mimeType),
  mimeType: file.mimeType,
  sizeBytes: toSafeByteCount(file.sizeBytes),
});

const mapPublicImage = (
  file: {
    id: string;
    provider: StorageProvider;
    storageKey: string;
    originalName: string;
    mimeType: string;
  } | null,
) =>
  file
    ? {
        id: file.id,
        name: file.originalName,
        mimeType: file.mimeType,
        url: buildPublicAssetUrl(file),
      }
    : null;

export class CourseService {
  public constructor(private readonly database: PrismaClient) {}

  public async getCourseDetails(courseId: string, authUser?: AuthUser) {
    const course = await this.database.course.findFirst({
      where: {
        id: courseId,
        deletedAt: null,
      },
      include: {
        category: {
          select: { id: true, slug: true, nameUk: true },
        },
        cover: {
          select: publicFileSelect,
        },
        author: {
          select: {
            id: true,
            fullName: true,
            avatar: { select: publicFileSelect },
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
          where: { deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            lessons: {
              where: { deletedAt: null },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
              include: {
                video: { select: publicFileSelect },
                files: {
                  orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
                  include: { file: { select: publicFileSelect } },
                },
                quiz: {
                  include: {
                    questions: {
                      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
                      include: {
                        options: {
                          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
                          select: { id: true, text: true, sortOrder: true },
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
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: { file: { select: publicFileSelect } },
        },
      },
    });

    const isAuthor = authUser?.id === course?.authorId;
    const canSeeUnpublished = Boolean(isAuthor);

    if (
      !course ||
      (course.status !== CourseStatus.PUBLISHED && !canSeeUnpublished)
    ) {
      throw new HttpError(404, 'COURSE_NOT_FOUND', 'Курс не знайдено.');
    }

    const activeEnrollment =
      authUser && !isAuthor && course.priceAmount > 0
        ? await this.database.enrollment.findFirst({
            where: {
              userId: authUser.id,
              courseId: course.id,
              revokedAt: null,
            },
            select: { id: true },
          })
        : null;

    const hasAccess =
      course.priceAmount === 0 || Boolean(isAuthor) || Boolean(activeEnrollment);

    const modules = course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      sortOrder: module.sortOrder,
      lessons: module.lessons.map((lesson) => {
        const canViewContent = hasAccess || lesson.isFreePreview;
        const baseLesson = {
          id: lesson.id,
          title: lesson.title,
          type: lesson.type,
          sortOrder: lesson.sortOrder,
          durationSec: lesson.durationSec,
          isFreePreview: lesson.isFreePreview,
          isLocked: !canViewContent,
        };

        if (!canViewContent) {
          return baseLesson;
        }

        return {
          ...baseLesson,
          content: {
            text: lesson.textContent,
            video: lesson.video
              ? {
                  id: lesson.video.id,
                  provider: lesson.video.provider,
                  playbackId: lesson.video.storageKey,
                  mimeType: lesson.video.mimeType,
                  durationSec: lesson.video.durationSec,
                  isReady: lesson.video.isReady,
                }
              : null,
            files: lesson.files.map(({ file }) => mapFileMetadata(file)),
            quiz: lesson.quiz
              ? {
                  id: lesson.quiz.id,
                  title: lesson.quiz.title,
                  passScore: lesson.quiz.passScore,
                  timeLimitSec: lesson.quiz.timeLimitSec,
                  attemptsAllowed: lesson.quiz.attemptsAllowed,
                  questions: lesson.quiz.questions.map((question) => ({
                    id: question.id,
                    type: question.type,
                    text: question.text,
                    points: question.points,
                    sortOrder: question.sortOrder,
                    options: question.options.map((option) => ({
                      id: option.id,
                      text: option.text,
                      sortOrder: option.sortOrder,
                    })),
                  })),
                }
              : null,
          },
        };
      }),
    }));

    const materialFiles = course.courseFiles.map((courseFile) => ({
      ...mapFileMetadata(courseFile.file),
      title: courseFile.title,
      sortOrder: courseFile.sortOrder,
    }));

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      shortDescription: course.shortDescription,
      description: course.description,
      outcomes: course.outcomes,
      language: course.language,
      grade: course.grade,
      status: course.status,
      contentType: course.type,
      cover: mapPublicImage(course.cover),
      category: course.category,
      price: {
        amount: course.priceAmount,
        currency: course.currency,
      },
      author: {
        id: course.author.id,
        fullName: course.author.fullName,
        displayName:
          course.author.authorProfile?.displayName ?? course.author.fullName,
        headline: course.author.authorProfile?.headline ?? null,
        bio: course.author.authorProfile?.bio ?? null,
        websiteUrl: course.author.authorProfile?.websiteUrl ?? null,
        isVerified: course.author.authorProfile?.isVerified ?? false,
        avatar: mapPublicImage(course.author.avatar),
        rating: {
          average: Number(course.author.authorProfile?.ratingAvg ?? 0),
          reviewsCount: course.author.authorProfile?.reviewsCount ?? 0,
        },
        studentsCount: course.author.authorProfile?.studentsCount ?? 0,
      },
      rating: {
        average: Number(course.ratingAvg),
        reviewsCount: course.reviewsCount,
      },
      stats: {
        studentsCount: course.studentsCount,
        lessonsCount: course.lessonsCount,
        durationSec: course.durationSec,
      },
      hasAccess,
      program: course.type === ContentType.COURSE ? modules : [],
      materials: course.type === ContentType.MATERIAL ? materialFiles : [],
      publishedAt: course.publishedAt,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  }

  public async getCourseReviews(
    courseId: string,
    pagination: ReviewsPagination,
    authUser?: AuthUser,
  ) {
    const course = await this.database.course.findFirst({
      where: { id: courseId, deletedAt: null },
      select: {
        id: true,
        authorId: true,
        status: true,
        ratingAvg: true,
        reviewsCount: true,
      },
    });

    const canSeeUnpublished = authUser?.id === course?.authorId;
    if (
      !course ||
      (course.status !== CourseStatus.PUBLISHED && !canSeeUnpublished)
    ) {
      throw new HttpError(404, 'COURSE_NOT_FOUND', 'Курс не знайдено.');
    }

    const where = {
      courseId: course.id,
      status: ReviewStatus.PUBLISHED,
    } as const;

    const aggregate = await this.database.review.aggregate({
      where,
      _avg: { rating: true },
      _count: { _all: true },
    });
    const totalItems = aggregate._count._all;
    const reviews = await this.database.review.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      select: {
        id: true,
        rating: true,
        text: true,
        authorReply: true,
        authorRepliedAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            avatar: { select: publicFileSelect },
          },
        },
      },
    });

    return {
      averageRating: Number(aggregate._avg.rating ?? 0),
      reviewsCount: totalItems,
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        text: review.text,
        authorReply: review.authorReply,
        authorRepliedAt: review.authorRepliedAt,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        author: {
          id: review.user.id,
          fullName: review.user.fullName,
          avatar: mapPublicImage(review.user.avatar),
        },
      })),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / pagination.limit),
      },
    };
  }
}
