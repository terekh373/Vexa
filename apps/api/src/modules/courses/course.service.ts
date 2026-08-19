import { CourseStatus, ReviewStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

function extensionFromName(name: string): string | null {
  const lastDot = name.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === name.length - 1) return null;
  return name.slice(lastDot + 1).toLowerCase();
}

function publicAssetUrl(storageKey: string): string | null {
  const base = process.env.PUBLIC_ASSET_BASE_URL?.replace(/\/$/, '');
  if (base === undefined || base.length === 0) return null;
  return `${base}/${storageKey.replace(/^\//, '')}`;
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
    where: { deletedAt: null },
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      title: true,
      sortOrder: true,
      lessons: {
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' as const },
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
            orderBy: { sortOrder: 'asc' as const },
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
        },
      },
    },
  },
  courseFiles: {
    orderBy: { sortOrder: 'asc' as const },
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

export async function getCourseDetails(courseId: string, currentUserId?: string) {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      status: CourseStatus.PUBLISHED,
      deletedAt: null,
    },
    select: courseDetailsSelect,
  });

  if (course === null) return null;

  let hasAccess = course.priceAmount === 0 || currentUserId === course.authorId;

  if (!hasAccess && currentUserId !== undefined) {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: currentUserId,
        courseId,
        revokedAt: null,
      },
      select: { id: true },
    });
    hasAccess = enrollment !== null;
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
    price: { amount: course.priceAmount, currency: course.currency },
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
      name: course.author.authorProfile?.displayName ?? course.author.fullName,
      headline: course.author.authorProfile?.headline ?? null,
      bio: course.author.authorProfile?.bio ?? null,
      websiteUrl: course.author.authorProfile?.websiteUrl ?? null,
      isVerified: course.author.authorProfile?.isVerified ?? false,
      rating: Number(course.author.authorProfile?.ratingAvg ?? 0),
      reviewsCount: course.author.authorProfile?.reviewsCount ?? 0,
      studentsCount: course.author.authorProfile?.studentsCount ?? 0,
      avatar: course.author.avatar
        ? {
            id: course.author.avatar.id,
            fileName: course.author.avatar.originalName,
            mimeType: course.author.avatar.mimeType,
            url: publicAssetUrl(course.author.avatar.storageKey),
          }
        : null,
    },
    rating: { average: Number(course.ratingAvg), count: course.reviewsCount },
    studentsCount: course.studentsCount,
    lessonsCount: course.lessonsCount,
    durationSec: course.durationSec,
    publishedAt: course.publishedAt,
    hasAccess,
    modules: course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      position: module.sortOrder,
      lessons: module.lessons.map((lesson) => {
        const canView = hasAccess || lesson.isFreePreview;
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
                        fileName: lesson.video.originalName,
                        mimeType: lesson.video.mimeType,
                        sizeBytes: lesson.video.sizeBytes.toString(),
                        durationSec: lesson.video.durationSec,
                      }
                    : null,
                  materials: lesson.files.map((attachment) => ({
                    id: attachment.id,
                    fileId: attachment.file.id,
                    name: attachment.file.originalName,
                    format: extensionFromName(attachment.file.originalName),
                    mimeType: attachment.file.mimeType,
                    sizeBytes: attachment.file.sizeBytes.toString(),
                  })),
                },
              }
            : {}),
        };
      }),
    })),
    materials: course.courseFiles.map((courseFile) => ({
      id: courseFile.id,
      fileId: courseFile.file.id,
      title: courseFile.title,
      name: courseFile.file.originalName,
      format: extensionFromName(courseFile.file.originalName),
      mimeType: courseFile.file.mimeType,
      sizeBytes: courseFile.file.sizeBytes.toString(),
    })),
  };
}

export async function getCourseReviews(courseId: string, page: number, limit: number) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, status: CourseStatus.PUBLISHED, deletedAt: null },
    select: { id: true },
  });
  if (course === null) return null;

  const where = { courseId, status: ReviewStatus.PUBLISHED } as const;
  const [reviews, count, aggregate] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
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
              select: { id: true, storageKey: true, originalName: true, mimeType: true },
            },
          },
        },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({ where, _avg: { rating: true } }),
  ]);

  return {
    averageRating: aggregate._avg.rating ?? 0,
    reviewsCount: count,
    reviews: reviews.map((review) => ({
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
    })),
    pagination: {
      page,
      limit,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}
