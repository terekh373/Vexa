/**
 * Frontend route map — the single source of truth for URLs.
 *
 * Both clients build links through these helpers rather than writing paths
 * inline, so renaming a route is one edit here instead of a grep across three
 * packages. The web app feeds these into React Router; the mobile app uses
 * them for deep links, its own navigation being screen-name based.
 *
 * Adding a language prefix later (`/en/courses`) means changing `build` alone.
 */

/** Prefixed to every path. Empty on MVP — Ukrainian is the only locale. */
const BASE = '';

function build(path: string): string {
  return `${BASE}${path}`;
}

/**
 * Catalog filters, mirroring the query parameters of the catalog endpoint
 * (SRS 15.3). Kept as a type so a typo in a filter name fails the build.
 */
export interface CatalogQuery {
  q?: string;
  category?: string;
  type?: 'COURSE' | 'MATERIAL';
  grade?: number;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  language?: string;
  sort?: 'relevance' | 'popular' | 'rating' | 'newest' | 'price_asc' | 'price_desc';
  page?: number;
}

function toQueryString(query: CatalogQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    // Skip empties so the URL stays clean and cacheable: `?q=&page=` and
    // `?q=algebra` must not be two different cache entries.
    if (value === undefined || value === '') continue;
    params.set(key, String(value));
  }

  const serialised = params.toString();

  return serialised.length > 0 ? `?${serialised}` : '';
}

export const routes = {
  // --- Public ---------------------------------------------------------------
  home: (): string => build('/'),

  catalog: (query: CatalogQuery = {}): string => build(`/courses${toQueryString(query)}`),
  forAuthors: (): string => build('/for-authors'),
  vexaAi: (): string => build('/vexa-ai'),

  /** Category landing page — separate from a filtered catalog for SEO. */
  category: (slug: string): string => build(`/categories/${slug}`),

  /** School curriculum navigation: subject -> grade -> topic (SRS 15.3). */
  curriculumSubject: (subjectSlug: string): string => build(`/curriculum/${subjectSlug}`),
  curriculumGrade: (subjectSlug: string, grade: number): string =>
    build(`/curriculum/${subjectSlug}/${grade}`),

  /**
   * Course or material page.
   *
   * Takes a course id today: the API validates a uuid. Slug support is in the
   * backlog (SRS 20.4 requires human-readable URLs), and this signature
   * already allows one, so client code will not change.
   */
  course: (idOrSlug: string): string => build(`/courses/${idOrSlug}`),

  /**
   * Public author portfolio. Takes a user id; author_profiles has no slug
   * column yet — same backlog item as above.
   */
  authorProfile: (idOrSlug: string): string => build(`/authors/${idOrSlug}`),

  // --- Auth -----------------------------------------------------------------
  login: (): string => build('/login'),
  register: (): string => build('/register'),
  forgotPassword: (): string => build('/forgot-password'),
  resetPassword: (token: string): string => build(`/reset-password?token=${token}`),
  verifyEmail: (token: string): string => build(`/verify-email?token=${token}`),

  // --- Purchase -------------------------------------------------------------
  cart: (): string => build('/cart'),
  checkout: (): string => build('/checkout'),
  /**
   * The payment provider returns the user here, but access is opened by the
   * webhook — this page only reports status and may show "processing".
   */
  checkoutSuccess: (orderId: string): string => build(`/checkout/success/${orderId}`),
  checkoutFailure: (orderId: string): string => build(`/checkout/failure/${orderId}`),

  // --- Student area ---------------------------------------------------------
  learning: (): string => build('/learning'),
  learningMaterials: (): string => build('/learning/materials'),
  orders: (): string => build('/orders'),
  order: (id: string): string => build(`/orders/${id}`),
  settings: (): string => build('/settings'),

  /**
   * Course player. A top-level segment rather than /courses/:id/learn because
   * it renders in a distraction-free layout with no site header.
   */
  player: (courseId: string): string => build(`/learn/${courseId}`),
  playerLesson: (courseId: string, lessonId: string): string =>
    build(`/learn/${courseId}/${lessonId}`),

  // --- Author area ----------------------------------------------------------
  authorDashboard: (): string => build('/author'),
  authorCourses: (): string => build('/author/courses'),
  authorCourseNew: (): string => build('/author/courses/new'),
  authorCourseEdit: (id: string): string => build(`/author/courses/${id}/edit`),
  authorBalance: (): string => build('/author/balance'),
  authorReviews: (): string => build('/author/reviews'),

  // --- Admin ----------------------------------------------------------------
  adminDashboard: (): string => build('/admin'),
  adminModeration: (): string => build('/admin/moderation'),
  adminModerationCourse: (id: string): string => build(`/admin/moderation/${id}`),
  adminUsers: (): string => build('/admin/users'),
  adminCategories: (): string => build('/admin/categories'),
  adminComplaints: (): string => build('/admin/complaints'),
  adminFinance: (): string => build('/admin/finance'),
  adminAnalytics: (): string => build('/admin/analytics'),

  // --- Static ---------------------------------------------------------------
  faq: (): string => build('/faq'),
  support: (): string => build('/support'),
  offer: (): string => build('/offer'),
  privacy: (): string => build('/privacy'),
  notFound: (): string => build('/404'),
} as const;

/**
 * Route patterns for the router itself, where React Router needs `:param`
 * placeholders rather than filled-in values. Kept beside the builders so the
 * two cannot drift apart.
 */
export const routePatterns = {
  home: '/',
  catalog: '/courses',
  forAuthors: '/for-authors',
  vexaAi: '/vexa-ai',
  course: '/courses/:idOrSlug',
  category: '/categories/:slug',
  curriculumSubject: '/curriculum/:subjectSlug',
  curriculumGrade: '/curriculum/:subjectSlug/:grade',
  authorProfile: '/authors/:idOrSlug',
  order: '/orders/:id',
  checkoutSuccess: '/checkout/success/:orderId',
  checkoutFailure: '/checkout/failure/:orderId',
  player: '/learn/:courseId',
  playerLesson: '/learn/:courseId/:lessonId',
  authorCourseEdit: '/author/courses/:id/edit',
  adminModerationCourse: '/admin/moderation/:id',
} as const;

/**
 * Minimum role required to open a route (SRS table 5).
 *
 * A navigation hint only — it decides which links to render, nothing more.
 * Real authorisation happens server-side on every request.
 */
export const routeAccess = {
  public: [
    '/',
    '/courses',
    '/categories',
    '/curriculum',
    '/authors',
    '/login',
    '/register',
    '/faq',
    '/support',
    '/offer',
    '/privacy',
  ],
  student: ['/cart', '/checkout', '/learning', '/orders', '/settings', '/learn'],
  author: ['/author'],
  admin: ['/admin'],
} as const;