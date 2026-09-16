// Builders for PATCH /api/author/courses/:id/reorder payloads. Kept separate
// from the drag handlers so each drag scenario sends exactly one minimal,
// duplicate-free request (docs/frontend-api-map.md, "Порядок (reorder)").

export const buildModuleOrderPayload = (orderedModules) => ({
  modules: orderedModules.map((module, index) => ({ id: module.id, sortOrder: index })),
  lessons: [],
});

export const buildLessonOrderWithinModulePayload = (module, orderedLessons) => ({
  modules: [
    {
      id: module.id,
      sortOrder: module.sortOrder,
      lessons: orderedLessons.map((lesson, index) => ({ id: lesson.id, sortOrder: index })),
    },
  ],
  lessons: [],
});

// Moving a lesson to a different module: the reorder endpoint only ever
// writes sortOrder (it never changes a lesson's moduleId), so this is sent
// as a single flat entry rather than nesting it under the target module —
// nesting would fail server-side ownership validation, since the lesson
// still belongs to its original module in the database.
export const buildLessonMovePayload = (lessonId, sortOrder) => ({
  modules: [],
  lessons: [{ id: lessonId, sortOrder }],
});
