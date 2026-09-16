import type { RequestHandler } from 'express';
import {
  createCategoryEntry,
  deleteCategoryEntry,
  listCategories,
  updateCategoryEntry,
} from './admin.categories.service.js';
import {
  categoryIdParamsSchema,
  createCategorySchema,
  updateCategorySchema,
} from './admin.categories.validation.js';

export const listCategoriesHandler: RequestHandler = async (_req, res) => {
  const result = await listCategories();
  res.status(200).json(result);
};

export const createCategoryHandler: RequestHandler = async (req, res) => {
  const input = createCategorySchema.parse(req.body);
  const category = await createCategoryEntry(input);
  res.status(201).json(category);
};

export const updateCategoryHandler: RequestHandler = async (req, res) => {
  const { id } = categoryIdParamsSchema.parse(req.params);
  const input = updateCategorySchema.parse(req.body);
  const category = await updateCategoryEntry(id, input);
  res.status(200).json(category);
};

export const deleteCategoryHandler: RequestHandler = async (req, res) => {
  const { id } = categoryIdParamsSchema.parse(req.params);
  await deleteCategoryEntry(id);
  res.status(204).send();
};
