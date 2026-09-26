import { CourseStatus, UserStatus, type Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const publicAuthorSelect = {
  userId: true,
  displayName: true,
  headline: true,
  bio: true,
  isVerified: true,
  ratingAvg: true,
  reviewsCount: true,
  studentsCount: true,
  user: {
    select: {
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
} satisfies Prisma.AuthorProfileSelect;

const publicAuthorCourseSelect = {
  id: true,
  slug: true,
  title: true,
  shortDescription: true,
  type: true,
  language: true,
  grade: true,
  tags: true,
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
    },
  },
} satisfies Prisma.CourseSelect;

export type PublicAuthorRecord = Prisma.AuthorProfileGetPayload<{
  select: typeof publicAuthorSelect;
}>;

export type PublicAuthorCourseRecord = Prisma.CourseGetPayload<{
  select: typeof publicAuthorCourseSelect;
}>;

export async function findPublicAuthorByUserId(
  userId: string,
): Promise<PublicAuthorRecord | null> {
  return prisma.authorProfile.findFirst({
    where: {
      userId,
      user: {
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    },
    select: publicAuthorSelect,
  });
}

export async function listPublishedAuthorCourses(
  userId: string,
): Promise<PublicAuthorCourseRecord[]> {
  return prisma.course.findMany({
    where: {
      authorId: userId,
      status: CourseStatus.PUBLISHED,
      deletedAt: null,
      category: {
        isActive: true,
      },
    },
    orderBy: [
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    select: publicAuthorCourseSelect,
  });
}
