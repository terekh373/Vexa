import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { routes } from '@vexa/shared';

import {
  createAuthorCourse,
  createAuthorLesson,
  createAuthorModule,
  deleteAuthorLesson,
  deleteAuthorModule,
  getAuthorCourse,
  reorderAuthorCourse,
  submitAuthorCourse,
  updateAuthorCourse,
  updateAuthorLesson,
  updateAuthorModule,
} from '../../../services/authorCoursesService.js';
import { getCategories } from '../../../services/categoriesService.js';
import { getFileDownloadUrl } from '../../../services/filesService.js';

import styles from './CourseWizard.module.css';
import {
  apiFieldErrors,
  buildDiffableState,
  diffFields,
  emptyFormState,
  pickTrackedFields,
  toFormState,
} from './courseFormState.js';
import StepBasicInfo from './steps/StepBasicInfo.jsx';
import StepCurriculum from './steps/StepCurriculum.jsx';
import StepLessonContent from './steps/StepLessonContent.jsx';
import StepMaterialFiles from './steps/StepMaterialFiles.jsx';
import StepPricing from './steps/StepPricing.jsx';
import StepPublish from './steps/StepPublish.jsx';
import { useMaterialFiles } from './useMaterialFiles.js';

const COURSE_STEPS = [
  { key: 'basic', label: 'Основна інформація' },
  { key: 'curriculum', label: 'Модулі' },
  { key: 'lessons', label: 'Уроки' },
  { key: 'pricing', label: 'Ціна' },
  { key: 'publish', label: 'Публікація' },
];

const MATERIAL_STEPS = [
  { key: 'basic', label: 'Основна інформація' },
  { key: 'materialFiles', label: 'Файли матеріалу' },
  { key: 'pricing', label: 'Ціна' },
  { key: 'publish', label: 'Публікація' },
];

const findCategoryName = (categories, categoryId) => {
  for (const node of categories) {
    if (node.id === categoryId) return node.nameUk;
    const child = node.children?.find((candidate) => candidate.id === categoryId);
    if (child) return child.nameUk;
  }
  return '';
};

const CourseWizard = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [courseId, setCourseId] = useState(id ?? null);
  const [step, setStep] = useState('basic');
  const [formState, setFormState] = useState(emptyFormState());
  const [categories, setCategories] = useState([]);
  const [categoriesError, setCategoriesError] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitProblems, setSubmitProblems] = useState([]);

  const [coverName, setCoverName] = useState('');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);
  const [coverError, setCoverError] = useState('');

  const [modules, setModules] = useState([]);
  const [modulesError, setModulesError] = useState('');

  const materialFiles = useMaterialFiles(courseId);
  const { setFiles: setMaterialFiles } = materialFiles;

  // Last server-confirmed subset of fields, diffed against live form state so
  // autosave only ever sends what actually changed. Null until the course
  // record exists.
  const savedRef = useRef(null);

  useEffect(() => {
    let active = true;

    getCategories()
      .then((items) => {
        if (active) setCategories(items);
      })
      .catch(() => {
        if (active) setCategoriesError('Не вдалося завантажити категорії.');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);

    getAuthorCourse(id)
      .then((course) => {
        if (!active) return;
        const nextFormState = toFormState(course);
        savedRef.current = pickTrackedFields(course);
        setFormState(nextFormState);
        setCourseId(course.id);
        setIsReadOnly(nextFormState.status !== 'draft');
        setModules(course.modules ?? []);
        setMaterialFiles(course.courseFiles ?? []);

        if (course.cover) {
          setCoverName(course.cover.originalName);
          getFileDownloadUrl(course.cover.id)
            .then((downloadUrl) => {
              if (active) setCoverPreviewUrl(downloadUrl);
            })
            .catch(() => {
              // Preview is a convenience; the cover stays saved either way.
            });
        }
      })
      .catch((error) => {
        if (!active) return;
        const status = error.response?.status;
        if (status === 403) setFormError('Потрібно активувати профіль автора');
        else if (status === 404) setFormError('Курс не знайдено.');
        else setFormError('Не вдалося завантажити курс.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, setMaterialFiles]);

  const applySaveError = (error) => {
    const status = error.response?.status;
    const fromApi = apiFieldErrors(error);

    if (Object.keys(fromApi).length > 0) {
      setFieldErrors(fromApi);
    }

    if (status === 403) {
      setFormError('Потрібно активувати профіль автора');
    } else if (Object.keys(fromApi).length === 0) {
      setFormError('Не вдалося зберегти зміни. Спробуйте ще раз.');
    }
  };

  const persistChanges = async () => {
    if (isReadOnly) return true;

    const currentSnapshot = buildDiffableState(formState);

    if (!courseId) {
      const title = formState.title.trim();
      const errors = {};
      if (!title) errors.title = 'Вкажіть назву курсу.';
      if (!formState.categoryId) errors.categoryId = 'Оберіть категорію.';

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return false;
      }

      try {
        setSaving(true);
        const created = await createAuthorCourse({
          type: formState.type,
          title,
          categoryId: formState.categoryId,
        });
        const createdSnapshot = pickTrackedFields(created);
        savedRef.current = createdSnapshot;
        setCourseId(created.id);
        navigate(routes.authorCourseEdit(created.id), { replace: true });

        const remainingPatch = diffFields(currentSnapshot, createdSnapshot);
        if (Object.keys(remainingPatch).length > 0) {
          const updated = await updateAuthorCourse(created.id, remainingPatch);
          savedRef.current = { ...createdSnapshot, ...pickTrackedFields(updated) };
        }

        setFieldErrors({});
        setFormError('');
        return true;
      } catch (error) {
        applySaveError(error);
        return false;
      } finally {
        setSaving(false);
      }
    }

    const patch = diffFields(currentSnapshot, savedRef.current);
    if (Object.keys(patch).length === 0) return true;

    try {
      setSaving(true);
      const updated = await updateAuthorCourse(courseId, patch);
      savedRef.current = { ...savedRef.current, ...pickTrackedFields(updated) };
      setFieldErrors({});
      setFormError('');
      return true;
    } catch (error) {
      applySaveError(error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const steps = formState.type === 'MATERIAL' ? MATERIAL_STEPS : COURSE_STEPS;
  // A stored key can be missing from the current list (the type was switched
  // on the first step), in which case the wizard falls back to the first step.
  const activeIndex = Math.max(
    steps.findIndex((item) => item.key === step),
    0,
  );
  const activeKey = steps[activeIndex].key;

  const goToStep = async (targetKey) => {
    if (targetKey === activeKey) return;

    if (!isReadOnly) {
      const ok = await persistChanges();
      if (!ok) return;
    }

    setStep(targetKey);
  };

  const handleFieldChange = (name, value) => {
    setFormState((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setFormError('');
  };

  const handleOutcomeChange = (index, value) => {
    setFormState((current) => {
      const outcomes = [...current.outcomes];
      outcomes[index] = value;
      return { ...current, outcomes };
    });
  };

  const handleAddOutcome = () => {
    setFormState((current) => ({ ...current, outcomes: [...current.outcomes, ''] }));
  };

  const handleRemoveOutcome = (index) => {
    setFormState((current) => ({
      ...current,
      outcomes:
        current.outcomes.length > 1
          ? current.outcomes.filter((_, outcomeIndex) => outcomeIndex !== index)
          : current.outcomes,
    }));
  };

  const handleCoverUploaded = async (fileDto) => {
    setCoverError('');
    try {
      // Cover is saved the moment it is confirmed, independent of the rest
      // of the autosave diff — the PATCH carries only coverFileId.
      await updateAuthorCourse(courseId, { coverFileId: fileDto.id });
      setCoverName(fileDto.originalName);
    } catch {
      setCoverError('Не вдалося зберегти обкладинку. Спробуйте ще раз.');
    }
  };

  const refreshModules = async () => {
    try {
      const course = await getAuthorCourse(courseId);
      setModules(course.modules ?? []);
      setModulesError('');
    } catch {
      setModulesError('Не вдалося оновити структуру курсу.');
    }
  };

  const handleCreateModule = async (title) => {
    try {
      await createAuthorModule(courseId, { title });
      await refreshModules();
    } catch {
      setModulesError('Не вдалося створити модуль.');
    }
  };

  const handleRenameModule = async (moduleId, title) => {
    try {
      await updateAuthorModule(moduleId, { title });
      await refreshModules();
    } catch {
      setModulesError('Не вдалося перейменувати модуль.');
    }
  };

  const handleDeleteModule = async (moduleId) => {
    try {
      await deleteAuthorModule(moduleId);
      await refreshModules();
    } catch {
      setModulesError('Не вдалося видалити модуль.');
    }
  };

  const handleCreateLesson = async (moduleId, title) => {
    try {
      await createAuthorLesson(moduleId, { type: 'TEXT', title });
      await refreshModules();
    } catch {
      setModulesError('Не вдалося створити урок.');
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    try {
      await deleteAuthorLesson(lessonId);
      await refreshModules();
    } catch {
      setModulesError('Не вдалося видалити урок.');
    }
  };

  // Optimistic reorder: the caller has already computed the new module tree
  // and the matching PATCH payload. Only a request failure rolls the order
  // back — a successful response is not re-synced from the server so a
  // same-session cross-module move (see reorderPayload.js) keeps showing
  // where the user dropped it.
  const handleReorder = async (nextModules, payload, previousModules) => {
    setModules(nextModules);
    setModulesError('');
    try {
      await reorderAuthorCourse(courseId, payload);
    } catch {
      setModules(previousModules);
      setModulesError('Не вдалося зберегти порядок. Спробуйте ще раз.');
    }
  };

  const handleUpdateLesson = async (lessonId, patch) => {
    const updated = await updateAuthorLesson(lessonId, patch);
    await refreshModules();
    return updated;
  };

  const handleSubmitForModeration = async () => {
    const ok = await persistChanges();
    if (!ok) return;

    setSubmitError('');
    setSubmitMessage('');
    setSubmitProblems([]);

    try {
      setSubmitting(true);
      await submitAuthorCourse(courseId);
      setIsReadOnly(true);
      setFormState((current) => ({ ...current, status: 'moderation' }));
      setSubmitProblems([]);
      setSubmitMessage('Курс подано на модерацію.');
    } catch (error) {
      const status = error.response?.status;
      const details = error.response?.data?.error?.details;
      if (status === 400 && Array.isArray(details) && details.length > 0) {
        setSubmitProblems(details);
      } else if (status === 409) {
        setSubmitError('Курс уже на модерації');
      } else if (status === 403) {
        setFormError('Потрібно активувати профіль автора');
      } else {
        setSubmitError('Не вдалося подати курс на модерацію. Спробуйте ще раз.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const categoryName = useMemo(
    () => findCategoryName(categories, formState.categoryId),
    [categories, formState.categoryId],
  );

  if (loading) {
    return (
      <section className={styles.page}>
        <p role="status">Завантаження курсу...</p>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <h1 className={styles.heading}>{courseId ? 'Редагування курсу' : 'Новий курс'}</h1>

      <ul className={styles.stepper}>
        {steps.map((item, index) => {
          const disabled = item.key !== 'basic' && !courseId;
          return (
            <li key={item.key}>
              <button
                type="button"
                className={`${styles.step} ${activeKey === item.key ? styles.stepActive : ''}`}
                onClick={() => goToStep(item.key)}
                disabled={disabled}
              >
                <span className={styles.stepNumber}>{index + 1}</span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      <div className={styles.card}>
        {formError && <p className={styles.formError}>{formError}</p>}
        {activeKey === 'basic' && coverError && <p className={styles.formError}>{coverError}</p>}

        {activeKey === 'basic' && (
          <StepBasicInfo
            formState={formState}
            onChange={handleFieldChange}
            onOutcomeChange={handleOutcomeChange}
            onAddOutcome={handleAddOutcome}
            onRemoveOutcome={handleRemoveOutcome}
            categories={categories}
            categoriesError={categoriesError}
            fieldErrors={fieldErrors}
            readOnly={isReadOnly}
            coverName={coverName}
            coverPreviewUrl={coverPreviewUrl}
            coverUploadDisabled={isReadOnly || !courseId}
            coverUploadDisabledHint={!courseId ? 'Спочатку натисніть «Далі», щоб зберегти курс.' : ''}
            onCoverUploaded={handleCoverUploaded}
          />
        )}

        {activeKey === 'curriculum' && (
          <>
            {modulesError && <p className={styles.formError}>{modulesError}</p>}
            <StepCurriculum
              modules={modules}
              readOnly={isReadOnly}
              onCreateModule={handleCreateModule}
              onRenameModule={handleRenameModule}
              onDeleteModule={handleDeleteModule}
              onCreateLesson={handleCreateLesson}
              onDeleteLesson={handleDeleteLesson}
              onReorder={handleReorder}
            />
          </>
        )}

        {activeKey === 'lessons' && (
          <>
            {modulesError && <p className={styles.formError}>{modulesError}</p>}
            <StepLessonContent
              modules={modules}
              readOnly={isReadOnly}
              onUpdateLesson={handleUpdateLesson}
              onRefresh={refreshModules}
            />
          </>
        )}

        {activeKey === 'materialFiles' && (
          <StepMaterialFiles
            files={materialFiles.files}
            readOnly={isReadOnly}
            error={materialFiles.error}
            onAttach={materialFiles.attach}
            onRename={materialFiles.rename}
            onRemove={materialFiles.remove}
            onMove={materialFiles.move}
          />
        )}

        {activeKey === 'pricing' && (
          <StepPricing
            formState={formState}
            onChange={handleFieldChange}
            fieldErrors={fieldErrors}
            readOnly={isReadOnly}
          />
        )}

        {activeKey === 'publish' && (
          <StepPublish
            formState={formState}
            categoryName={categoryName}
            status={formState.status}
            isReadOnly={isReadOnly}
            submitting={submitting}
            submitError={submitError}
            submitMessage={submitMessage}
            problems={submitProblems}
            onSubmit={handleSubmitForModeration}
          />
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => goToStep(steps[activeIndex - 1].key)}
            disabled={activeIndex === 0 || saving}
          >
            Назад
          </button>

          {activeIndex < steps.length - 1 && (
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => goToStep(steps[activeIndex + 1].key)}
              disabled={saving}
            >
              {saving ? 'Зберігаємо...' : 'Далі'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default CourseWizard;
