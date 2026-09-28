import type { RequestHandler } from 'express';
import { submitSupportContact } from './support.service.js';
import { supportContactSchema } from './support.validation.js';

export const supportContactHandler: RequestHandler = async (req, res) => {
  const input = supportContactSchema.parse(req.body);
  await submitSupportContact(input);

  res.status(204).send();
};
