// Fields the wizard tracks and autosaves. Kept as a flat list so the diff
// helper below and the "pick from server response" helper stay in sync.
const TRACKED_FIELDS = [
  'type',
  'title',
  'categoryId',
  'shortDescription',
  'description',
  'outcomes',
  'grade',
  'topicIds',
  'language',
  'priceAmount',
  'currency',
];

// Mirrors assertEditable in apps/api/src/modules/author/author.service.ts.
// The server stays the source of truth; this only hides actions it would reject.
export const EDITABLE_STATUSES = ['draft', 'rejected', 'unpublished'];

export const isEditableStatus = (status) => EDITABLE_STATUSES.includes(status);

export const emptyFormState = () => ({
  type: 'COURSE',
  title: '',
  categoryId: '',
  shortDescription: '',
  description: '',
  outcomes: [''],
  grade: '',
  topicIds: [],
  language: 'uk',
  priceUah: '0',
  status: 'draft',
  rejectionReason: '',
});

// Maps a course DTO (from create/get/patch response) to the editable form
// shape used by the step components.
export const toFormState = (course) => ({
  type: course.type ?? 'COURSE',
  title: course.title ?? '',
  categoryId: course.categoryId ?? '',
  shortDescription: course.shortDescription ?? '',
  description: course.description ?? '',
  outcomes: course.outcomes?.length ? [...course.outcomes] : [''],
  grade: course.grade === null || course.grade === undefined ? '' : String(course.grade),
  topicIds: Array.isArray(course.topics)
    ? course.topics.map((binding) => binding.topic?.id ?? binding.id).filter(Boolean)
    : [],
  language: course.language ?? 'uk',
  priceUah: typeof course.priceAmount === 'number' ? String(course.priceAmount / 100) : '0',
  status: (course.status ?? 'draft').toLowerCase(),
  rejectionReason: course.rejectionReason ?? '',
});

// Maps a course DTO to the subset of API fields the wizard diffs against,
// i.e. the last known persisted server state.
export const pickTrackedFields = (course) => ({
  type: course.type ?? 'COURSE',
  title: course.title ?? '',
  categoryId: course.categoryId ?? '',
  shortDescription: course.shortDescription ?? '',
  description: course.description ?? '',
  outcomes: Array.isArray(course.outcomes) ? course.outcomes : [],
  grade: course.grade === null || course.grade === undefined ? null : course.grade,
  topicIds: Array.isArray(course.topics)
    ? course.topics.map((binding) => binding.topic?.id ?? binding.id).filter(Boolean)
    : [],
  language: course.language ?? 'uk',
  priceAmount: typeof course.priceAmount === 'number' ? course.priceAmount : 0,
  currency: course.currency ?? 'UAH',
});

// Kopiykas must be an integer derived from hryvnias without float drift, so
// the rounding happens in one place, right before the value leaves the form.
export const toKopecks = (uahValue) => {
  const value = Number(uahValue);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
};

// Normalizes live form state into the same shape as pickTrackedFields, so
// the two can be diffed field by field.
export const buildDiffableState = (formState) => ({
  type: formState.type,
  title: formState.title.trim(),
  categoryId: formState.categoryId || '',
  shortDescription: formState.shortDescription.trim(),
  description: formState.description.trim(),
  outcomes: formState.outcomes.map((line) => line.trim()).filter(Boolean),
  grade: formState.grade === '' ? null : Number(formState.grade),
  topicIds: Array.isArray(formState.topicIds) ? formState.topicIds : [],
  language: formState.language,
  priceAmount: toKopecks(formState.priceUah),
  currency: 'UAH',
});

const fieldsEqual = (a, b) => {
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a) === JSON.stringify(b);
  return a === b;
};

export const diffFields = (current, saved) => {
  const patch = {};

  for (const key of TRACKED_FIELDS) {
    if (!fieldsEqual(current[key], saved[key])) {
      patch[key] = current[key];
    }
  }

  // Price and currency form one logical unit on the client (only UAH is
  // offered), so a price change always carries currency along explicitly
  // rather than relying on the diff to also notice it.
  if ('priceAmount' in patch) {
    patch.currency = 'UAH';
  }

  return patch;
};

export const apiFieldErrors = (error) =>
  (error.response?.data?.error?.details ?? []).reduce((result, detail) => {
    if (detail?.field && detail?.message && !result[detail.field]) {
      result[detail.field] = detail.message;
    }
    return result;
  }, {});
