import { ContentType, Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import type { CourseCatalogQuery } from './catalog.validation.js';

interface CatalogCountRow {
  total: number;
}

interface CatalogCourseRow {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  contentType: ContentType;
  language: string;
  grade: number | null;
  tags: string[];
  priceAmount: number;
  currency: string;
  ratingAverage: number;
  reviewsCount: number;
  studentsCount: number;
  lessonsCount: number;
  durationSec: number;
  publishedAt: Date | null;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  authorId: string;
  authorDisplayName: string;
  authorIsVerified: boolean;
  coverId: string | null;
  coverStorageKey: string | null;
  coverOriginalName: string | null;
  coverMimeType: string | null;
  relevance: number;
}

function publicAssetUrl(storageKey: string): string | null {
  const base = process.env.PUBLIC_ASSET_BASE_URL?.replace(/\/$/, '');

  if (base === undefined || base.length === 0) {
    return null;
  }

  return `${base}/${storageKey.replace(/^\//, '')}`;
}

const buildCategoryCte = (category?: string): Prisma.Sql =>
  category
    ? Prisma.sql`
        WITH RECURSIVE selected_categories AS (
          SELECT category.id
          FROM categories AS category
          WHERE category.is_active = TRUE
            AND (
              category.slug = ${category}
              OR category.id::text = ${category}
            )

          UNION

          SELECT child.id
          FROM categories AS child
          INNER JOIN selected_categories AS parent
            ON child.parent_id = parent.id
          WHERE child.is_active = TRUE
        )
      `
    : Prisma.sql``;

const buildOrderBy = (query: CourseCatalogQuery): Prisma.Sql => {
  const sort = query.sort ?? 'relevance';

  switch (sort) {
    case 'popularity':
      return Prisma.sql`
        c.students_count DESC,
        c.rating_avg DESC,
        c.published_at DESC NULLS LAST,
        c.id ASC
      `;

    case 'rating':
      return Prisma.sql`
        c.rating_avg DESC,
        c.reviews_count DESC,
        c.students_count DESC,
        c.id ASC
      `;

    case 'date':
      return Prisma.sql`
        c.published_at DESC NULLS LAST,
        c.created_at DESC,
        c.id ASC
      `;

    case 'price_asc':
      return Prisma.sql`
        c.price_amount ASC,
        c.rating_avg DESC,
        c.id ASC
      `;

    case 'price_desc':
      return Prisma.sql`
        c.price_amount DESC,
        c.rating_avg DESC,
        c.id ASC
      `;

    case 'relevance':
    default:
      return query.q
        ? Prisma.sql`
            relevance DESC,
            c.students_count DESC,
            c.rating_avg DESC,
            c.published_at DESC NULLS LAST,
            c.id ASC
          `
        : Prisma.sql`
            c.students_count DESC,
            c.rating_avg DESC,
            c.published_at DESC NULLS LAST,
            c.id ASC
          `;
  }
};

const toApiContentType = (
  value: ContentType,
): 'course' | 'material' =>
  value === ContentType.COURSE ? 'course' : 'material';

export async function getCatalog(query: CourseCatalogQuery) {
  const filters: Prisma.Sql[] = [
    Prisma.sql`c.status = 'PUBLISHED'::"CourseStatus"`,
    Prisma.sql`c.deleted_at IS NULL`,
  ];

  if (query.q) {
    filters.push(
      Prisma.sql`
        vexa_course_search_vector(
          c.title,
          c.short_description,
          c.description,
          c.tags
        ) @@ websearch_to_tsquery(
          'simple'::regconfig,
          ${query.q}
        )
      `,
    );
  }

  if (query.type) {
    const databaseType =
      query.type === 'course'
        ? ContentType.COURSE
        : ContentType.MATERIAL;

    filters.push(
      Prisma.sql`c.type = ${databaseType}::"ContentType"`,
    );
  }

  if (query.category) {
    filters.push(
      Prisma.sql`
        c.category_id IN (
          SELECT id FROM selected_categories
        )
      `,
    );
  }

  if (query.grade !== undefined) {
    filters.push(
      Prisma.sql`c.grade = ${query.grade}`,
    );
  }

  if (query.priceMin !== undefined) {
    filters.push(
      Prisma.sql`c.price_amount >= ${query.priceMin}`,
    );
  }

  if (query.priceMax !== undefined) {
    filters.push(
      Prisma.sql`c.price_amount <= ${query.priceMax}`,
    );
  }

  if (query.rating !== undefined) {
    filters.push(
      Prisma.sql`c.rating_avg >= ${query.rating}`,
    );
  }

  if (query.language) {
    filters.push(
      Prisma.sql`LOWER(c.language) = ${query.language}`,
    );
  }

  const categoryCte = buildCategoryCte(query.category);

  const whereClause = Prisma.sql`
    WHERE ${Prisma.join(filters, ' AND ')}
  `;

  const relevanceExpression = query.q
    ? Prisma.sql`
        ts_rank_cd(
          vexa_course_search_vector(
            c.title,
            c.short_description,
            c.description,
            c.tags
          ),
          websearch_to_tsquery(
            'simple'::regconfig,
            ${query.q}
          )
        )
      `
    : Prisma.sql`0::real`;

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const [countRows, rows] = await Promise.all([
    prisma.$queryRaw<CatalogCountRow[]>(Prisma.sql`
      ${categoryCte}

      SELECT COUNT(*)::integer AS total
      FROM courses AS c

      INNER JOIN categories AS category
        ON category.id = c.category_id
        AND category.is_active = TRUE

      INNER JOIN users AS author
        ON author.id = c.author_id
        AND author.deleted_at IS NULL
        AND author.status = 'ACTIVE'::"UserStatus"

      ${whereClause}
    `),

    prisma.$queryRaw<CatalogCourseRow[]>(Prisma.sql`
      ${categoryCte}

      SELECT
        c.id,
        c.slug,
        c.title,
        c.short_description AS "shortDescription",
        c.type AS "contentType",
        c.language,
        c.grade,
        c.tags,
        c.price_amount AS "priceAmount",
        c.currency,
        c.rating_avg::double precision AS "ratingAverage",
        c.reviews_count AS "reviewsCount",
        c.students_count AS "studentsCount",
        c.lessons_count AS "lessonsCount",
        c.duration_sec AS "durationSec",
        c.published_at AS "publishedAt",

        category.id AS "categoryId",
        category.slug AS "categorySlug",
        category.name_uk AS "categoryName",

        author.id AS "authorId",
        COALESCE(
          profile.display_name,
          author.full_name
        ) AS "authorDisplayName",

        COALESCE(
          profile.is_verified,
          FALSE
        ) AS "authorIsVerified",

        cover.id AS "coverId",
        cover.storage_key AS "coverStorageKey",
        cover.original_name AS "coverOriginalName",
        cover.mime_type AS "coverMimeType",

        ${relevanceExpression} AS relevance

      FROM courses AS c

      INNER JOIN categories AS category
        ON category.id = c.category_id
        AND category.is_active = TRUE

      INNER JOIN users AS author
        ON author.id = c.author_id
        AND author.deleted_at IS NULL
        AND author.status = 'ACTIVE'::"UserStatus"

      LEFT JOIN author_profiles AS profile
        ON profile.user_id = author.id

      LEFT JOIN files AS cover
        ON cover.id = c.cover_file_id
        AND cover.deleted_at IS NULL
        AND cover.is_ready = TRUE

      ${whereClause}

      ORDER BY ${buildOrderBy(query)}

      LIMIT ${limit}
      OFFSET ${offset}
    `),
  ]);

  const total = countRows[0]?.total ?? 0;

  return {
    items: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      shortDescription: row.shortDescription,
      contentType: toApiContentType(row.contentType),
      language: row.language,
      grade: row.grade,
      tags: row.tags,

      cover:
        row.coverId &&
        row.coverStorageKey &&
        row.coverOriginalName &&
        row.coverMimeType
          ? {
              id: row.coverId,
              name: row.coverOriginalName,
              mimeType: row.coverMimeType,
              url: publicAssetUrl(row.coverStorageKey),
            }
          : null,

      author: {
        id: row.authorId,
        displayName: row.authorDisplayName,
        isVerified: row.authorIsVerified,
      },

      category: {
        id: row.categoryId,
        slug: row.categorySlug,
        name: row.categoryName,
      },

      price: {
        amount: row.priceAmount,
        currency: row.currency,
      },

      rating: {
        average: row.ratingAverage,
        reviewsCount: row.reviewsCount,
      },

      studentsCount: row.studentsCount,
      lessonsCount: row.lessonsCount,
      durationSec: row.durationSec,
      publishedAt:
        row.publishedAt?.toISOString() ?? null,
    })),

    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}