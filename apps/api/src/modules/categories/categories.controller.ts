import type { RequestHandler } from 'express';
import { getCategoryTree } from './categories.service.js';

export const categoryTreeHandler: RequestHandler = async (_req, res) => {
  const result = await getCategoryTree();

  res.json(result);
};
