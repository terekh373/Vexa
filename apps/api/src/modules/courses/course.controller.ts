import type { RequestHandler } from 'express';
import { getCourseDetails, getCourseReviews } from './course.service.js';
import { courseIdParamsSchema, courseReviewsQuerySchema } from './course.validation.js';

export const courseDetailsController: RequestHandler = async (req, res) => {
  const params = courseIdParamsSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'Invalid course id' });
    return;
  }

  try {
    const userId = typeof res.locals.userId === 'string' ? res.locals.userId : undefined;
    const course = await getCourseDetails(params.data.id, userId);
    if (course === null) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    res.json(course);
  } catch (error) {
    console.error('Failed to load course details', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const courseReviewsController: RequestHandler = async (req, res) => {
  const params = courseIdParamsSchema.safeParse(req.params);
  const query = courseReviewsQuerySchema.safeParse(req.query);

  if (!params.success) {
    res.status(400).json({ error: 'Invalid course id' });
    return;
  }
  if (!query.success) {
    res.status(400).json({
      error: 'Invalid pagination parameters',
      details: query.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const result = await getCourseReviews(params.data.id, query.data.page, query.data.limit);
    if (result === null) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error('Failed to load course reviews', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
