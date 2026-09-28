import { ContentType } from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import {
  findPublicAuthorByUserId,
  listPublishedAuthorCourses,
  type PublicAuthorCourseRecord,
} from './authors.repository.js';

function publicAssetUrl(storageKey: string): string | null {
  const base = process.env.PUBLIC_ASSET_BASE_URL?.replace(/\/$/, '');

  if (base === undefined || base.length === 0) {
    return null;
  }

  return `${base}/${storageKey.replace(/^\//, '')}`;
}

function toCatalogCard(
  course: PublicAuthorCourseRecord,
  author: { id: string; displayName: string; isVerified: boolean },
) {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    shortDescription: course.shortDescription,
    contentType: course.type === ContentType.COURSE ? 'course' : 'material',
    language: course.language,
    grade: course.grade,
    tags: course.tags,
    cover: course.cover
      ? {
          id: course.cover.id,
          name: course.cover.originalName,
          mimeType: course.cover.mimeType,
          url: publicAssetUrl(course.cover.storageKey),
        }
      : null,
    author,
    category: {
      id: course.category.id,
      slug: course.category.slug,
      name: course.category.nameUk,
    },
    price: {
      amount: course.priceAmount,
      currency: course.currency,
    },
    rating: {
      average: Number(course.ratingAvg),
      reviewsCount: course.reviewsCount,
    },
    studentsCount: course.studentsCount,
    lessonsCount: course.lessonsCount,
    durationSec: course.durationSec,
    publishedAt: course.publishedAt?.toISOString() ?? null,
  };
}

export async function getPublicAuthorProfile(userId: string) {
  const profile = await findPublicAuthorByUserId(userId);

  if (profile === null) {
    throw AppError.notFound('Author profile not found');
  }

  const courses = await listPublishedAuthorCourses(userId);
  const author = {
    id: profile.userId,
    displayName: profile.displayName,
    isVerified: profile.isVerified,
  };

  return {
    id: profile.userId,
    displayName: profile.displayName,
    headline: profile.headline,
    bio: profile.bio,
    avatar: profile.user.avatar
      ? {
          id: profile.user.avatar.id,
          fileName: profile.user.avatar.originalName,
          mimeType: profile.user.avatar.mimeType,
          url: publicAssetUrl(profile.user.avatar.storageKey),
        }
      : null,
    isVerified: profile.isVerified,
    ratingAvg: Number(profile.ratingAvg),
    reviewsCount: profile.reviewsCount,
    studentsCount: profile.studentsCount,
    courses: courses.map((course) => toCatalogCard(course, author)),
  };
}
