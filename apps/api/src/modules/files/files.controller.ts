/**
 * Files controllers: parse the request, call the service, shape the reply.
 * No storage or Prisma calls here.
 */
import type { RequestHandler } from 'express';
import { AppError } from '../../lib/errors.js';
import type { Actor } from './files.service.js';
import { confirmUpload, createDownloadUrl, createUploadUrl } from './files.service.js';
import { createUploadUrlSchema, fileIdParamsSchema } from './files.validation.js';

/**
 * req.auth is optional in the type because public routes exist; every route
 * in this module sits behind `authenticate`, so its absence is a wiring bug.
 */
function requireActor(auth: Express.Request['auth']): Actor {
  if (auth === undefined) {
    throw AppError.unauthorized('Authentication required');
  }
  return auth;
}

export const createUploadUrlHandler: RequestHandler = async (req, res) => {
  const actor = requireActor(req.auth);
  const body = createUploadUrlSchema.safeParse(req.body);

  if (!body.success) {
    throw AppError.validation(
      'Invalid upload request',
      body.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  const result = await createUploadUrl(actor, body.data);

  res.status(201).json(result);
};

export const confirmUploadHandler: RequestHandler = async (req, res) => {
  const actor = requireActor(req.auth);
  const params = fileIdParamsSchema.safeParse(req.params);

  if (!params.success) {
    throw AppError.validation('Invalid file id');
  }

  const file = await confirmUpload(actor, params.data.id);

  res.json({ file });
};

export const downloadUrlHandler: RequestHandler = async (req, res) => {
  const actor = requireActor(req.auth);
  const params = fileIdParamsSchema.safeParse(req.params);

  if (!params.success) {
    throw AppError.validation('Invalid file id');
  }

  const result = await createDownloadUrl(actor, params.data.id);

  res.json(result);
};
