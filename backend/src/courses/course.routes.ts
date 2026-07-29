import type { IncomingMessage, ServerResponse } from 'node:http';
import { getOptionalAuthUser } from '../auth/optional-auth.js';
import { sendJson } from '../http/json.js';
import { CourseService } from './course.service.js';
import { parseCourseId, parseReviewsPagination } from './course.validation.js';

const COURSE_ROUTE = /^\/(?:api\/)?courses\/([^/]+)\/?$/;
const REVIEWS_ROUTE = /^\/(?:api\/)?courses\/([^/]+)\/reviews\/?$/;

export const handleCourseRoutes = async (
  request: IncomingMessage,
  response: ServerResponse,
  service: CourseService,
): Promise<boolean> => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const courseMatch = url.pathname.match(COURSE_ROUTE);
  const reviewsMatch = url.pathname.match(REVIEWS_ROUTE);

  if (!courseMatch && !reviewsMatch) {
    return false;
  }

  if (request.method !== 'GET') {
    response.setHeader('allow', 'GET');
    sendJson(response, 405, {
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Для цього маршруту дозволено лише метод GET.',
      },
    });
    return true;
  }

  const authUser = getOptionalAuthUser(request);

  if (reviewsMatch?.[1]) {
    const courseId = parseCourseId(reviewsMatch[1]);
    const pagination = parseReviewsPagination(url);
    const result = await service.getCourseReviews(courseId, pagination, authUser);
    sendJson(response, 200, result);
    return true;
  }

  if (courseMatch?.[1]) {
    const courseId = parseCourseId(courseMatch[1]);
    const result = await service.getCourseDetails(courseId, authUser);
    sendJson(response, 200, result);
    return true;
  }

  return false;
};
