import { createServer, type Server } from 'node:http';
import { CourseService } from './courses/course.service.js';
import { handleCourseRoutes } from './courses/course.routes.js';
import { isHttpError } from './http/errors.js';
import { sendJson } from './http/json.js';
import { prisma } from './prisma.js';

const courseService = new CourseService(prisma);

export const createApp = (): Server =>
  createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');

      if (request.method === 'GET' && url.pathname === '/health') {
        sendJson(response, 200, { status: 'ok' });
        return;
      }

      if (await handleCourseRoutes(request, response, courseService)) {
        return;
      }

      sendJson(response, 404, {
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: 'Маршрут не знайдено.',
        },
      });
    } catch (error: unknown) {
      if (isHttpError(error)) {
        sendJson(response, error.statusCode, {
          error: {
            code: error.code,
            message: error.message,
            ...(error.details === undefined ? {} : { details: error.details }),
          },
        });
        return;
      }

      console.error('Unhandled request error:', error);
      sendJson(response, 500, {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Внутрішня помилка сервера.',
        },
      });
    }
  });
