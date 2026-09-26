import type { RequestHandler } from 'express';
import { getCurriculumTree } from './curriculum.service.js';

export const curriculumTreeHandler: RequestHandler = async (_req, res) => {
  const result = await getCurriculumTree();

  res.json(result);
};
