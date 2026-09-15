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
import StepContentPlaceholder from './steps/StepContentPlaceholder.jsx';
import StepCurriculum from './steps/StepCurriculum.jsx';
import StepPricing from './steps/StepPricing.jsx';
import StepPublish from './steps/StepPublish.jsx';

const STEPS = [
  { id: 1, label: 'Основна інформація' },
  { id: 2, label: 'Модулі' },
  { id: 3, label: 'Уроки' },
  { id: 4, label: 'Ціна' },
  { id: 5, label: 'Публікація' },
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
  const [step, setStep] = useState(1);
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

  const [coverName, setCoverName] = useState('');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);
  const [coverError, setCoverError] = useState('');

  const [modules, setModules] = useState([]);
  const [modulesError, setModulesError] = useState('');

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
  }, [id]);

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

  const goToStep = async (targetStep) => {
    if (targetStep === step) return;

    if (!isReadOnly) {
      const ok = await persistChanges();
      if (!ok) return;
    }

    setStep(targetStep);
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

  const handleSubmitForModeration = async () => {
    const ok = await persistChanges();
    if (!ok) return;

    setSubmitError('');
    setSubmitMessage('');

    try {
      setSubmitting(true);
      await submitAuthorCourse(courseId);
      setIsReadOnly(true);
      setFormState((current) => ({ ...current, status: 'moderation' }));
      setSubmitMessage('Курс подано на модерацію.');
    } catch (error) {
      const status = error.response?.status;
      if (status === 409) {
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
        {STEPS.map((item) => {
          const disabled = item.id !== 1 && !courseId;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`${styles.step} ${step === item.id ? styles.stepActive : ''}`}
                onClick={() => goToStep(item.id)}
                disabled={disabled}
              >
                <span className={styles.stepNumber}>{item.id}</span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      <div className={styles.card}>
        {formError && <p className={styles.formError}>{formError}</p>}
        {step === 1 && coverError && <p className={styles.formError}>{coverError}</p>}

        {step === 1 && (
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

        {step === 2 && (
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

        {step === 3 && <StepContentPlaceholder />}

        {step === 4 && (
          <StepPricing
            formState={formState}
            onChange={handleFieldChange}
            fieldErrors={fieldErrors}
            readOnly={isReadOnly}
          />
        )}

        {step === 5 && (
          <StepPublish
            formState={formState}
            categoryName={categoryName}
            status={formState.status}
            isReadOnly={isReadOnly}
            submitting={submitting}
            submitError={submitError}
            submitMessage={submitMessage}
            onSubmit={handleSubmitForModeration}
          />
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => goToStep(step - 1)}
            disabled={step === 1 || saving}
          >
            Назад
          </button>

          {step < STEPS.length && (
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => goToStep(step + 1)}
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
