/**
 * Files routes. Everything requires a signed-in user: the bucket is private
 * and a signature is only ever issued after a server-side permission check
 * (SRS 20.2).
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/authenticate.js';
import { confirmUploadHandler, createUploadUrlHandler, downloadUrlHandler } from './files.controller.js';

export const filesRouter: Router = Router();

/**
 * Each upload-url call creates a DB row and reserves a key in the bucket.
 * 60 per hour is generous for an author building a course and useless for
 * someone trying to fill the table with pending rows.
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many uploads, try again later' } },
});

// No requireRoles here: the allowed role depends on `kind` in the body
// (AVATAR is open to every account, COVER/ATTACHMENT to authors), and the
// router cannot see the body. The service enforces it per request.
filesRouter.post('/upload-url', authenticate, uploadLimiter, createUploadUrlHandler);

// The service checks the caller is the uploader — that is the only right
// that matters for confirm, and it is per row, not per role.
filesRouter.post('/:id/confirm', authenticate, confirmUploadHandler);

// A STUDENT with an enrollment is the main consumer. The service decides
// per file.
filesRouter.get('/:id/download-url', authenticate, downloadUrlHandler);
