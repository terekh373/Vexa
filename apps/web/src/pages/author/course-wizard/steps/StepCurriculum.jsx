import { useEffect, useRef, useState } from 'react';

import styles from '../CourseWizard.module.css';
import {
  buildLessonMovePayload,
  buildLessonOrderWithinModulePayload,
  buildModuleOrderPayload,
} from '../reorderPayload.js';

const LESSON_TYPE_LABELS = {
  VIDEO: 'Відео',
  TEXT: 'Текст',
  FILE: 'Файл',
  QUIZ: 'Тест',
};

const arrayMove = (list, fromIndex, toIndex) => {
  const copy = [...list];
  const [item] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, item);
  return copy;
};

const AddLessonForm = ({ onCreate, disabled }) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setTitle('');
  };

  return (
    <form className={styles.inlineForm} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Назва нового уроку"
        disabled={disabled}
      />
      <button type="submit" className={`${styles.button} ${styles.buttonSecondary}`} disabled={disabled || !title.trim()}>
        + Урок
      </button>
    </form>
  );
};

const LessonRow = ({
  lesson,
  moduleIndex,
  lessonIndex,
  lessonCount,
  readOnly,
  onDragStart,
  onDrop,
  onMove,
  onDelete,
}) => (
  <li
    className={styles.lessonRow}
    draggable={!readOnly}
    onDragStart={() => onDragStart(moduleIndex, lessonIndex)}
    onDragOver={(event) => event.preventDefault()}
    onDrop={(event) => {
      event.preventDefault();
      event.stopPropagation();
      onDrop(moduleIndex, lessonIndex);
    }}
  >
    <span className={styles.dragHandle} aria-hidden="true">
      ⠿
    </span>
    <span className={styles.lessonTypeBadge}>{LESSON_TYPE_LABELS[lesson.type] ?? lesson.type}</span>
    <span className={styles.lessonTitle}>{lesson.title}</span>
    <div className={styles.rowActions}>
      <button
        type="button"
        className={styles.iconButton}
        onClick={() => onMove(moduleIndex, lessonIndex, -1)}
        disabled={readOnly || lessonIndex === 0}
        aria-label="Вгору"
      >
        ↑
      </button>
      <button
        type="button"
        className={styles.iconButton}
        onClick={() => onMove(moduleIndex, lessonIndex, 1)}
        disabled={readOnly || lessonIndex === lessonCount - 1}
        aria-label="Вниз"
      >
        ↓
      </button>
      <button
        type="button"
        className={styles.removeButton}
        onClick={() => onDelete(lesson)}
        disabled={readOnly}
        aria-label="Видалити урок"
      >
        ×
      </button>
    </div>
  </li>
);

const ModuleCard = ({
  module,
  moduleIndex,
  moduleCount,
  readOnly,
  onDragStart,
  onDrop,
  onMoveModule,
  onRenameModule,
  onDeleteModule,
  onCreateLesson,
  onLessonDragStart,
  onLessonDrop,
  onMoveLesson,
  onDeleteLesson,
}) => {
  const [titleDraft, setTitleDraft] = useState(module.title);

  useEffect(() => {
    setTitleDraft(module.title);
  }, [module.title]);

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== module.title) {
      onRenameModule(module.id, trimmed);
    } else {
      setTitleDraft(module.title);
    }
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Видалити модуль «${module.title}» разом з усіма уроками в ньому? Цю дію не можна скасувати.`,
    );
    if (confirmed) onDeleteModule(module.id);
  };

  const handleDeleteLesson = (lesson) => {
    const confirmed = window.confirm(`Видалити урок «${lesson.title}»? Цю дію не можна скасувати.`);
    if (confirmed) onDeleteLesson(lesson.id);
  };

  return (
    <li
      className={styles.moduleCard}
      draggable={!readOnly}
      onDragStart={() => onDragStart(moduleIndex)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(moduleIndex);
      }}
    >
      <div className={styles.moduleHeader}>
        <span className={styles.dragHandle} aria-hidden="true">
          ⠿
        </span>
        <input
          className={styles.input}
          value={titleDraft}
          onChange={(event) => setTitleDraft(event.target.value)}
          onBlur={commitTitle}
          disabled={readOnly}
        />
        <div className={styles.rowActions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => onMoveModule(moduleIndex, -1)}
            disabled={readOnly || moduleIndex === 0}
            aria-label="Вгору"
          >
            ↑
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => onMoveModule(moduleIndex, 1)}
            disabled={readOnly || moduleIndex === moduleCount - 1}
            aria-label="Вниз"
          >
            ↓
          </button>
          <button
            type="button"
            className={styles.removeButton}
            onClick={handleDelete}
            disabled={readOnly}
            aria-label="Видалити модуль"
          >
            ×
          </button>
        </div>
      </div>

      <ul
        className={styles.lessonList}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onLessonDrop(moduleIndex, module.lessons.length);
        }}
      >
        {module.lessons.map((lesson, lessonIndex) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            moduleIndex={moduleIndex}
            lessonIndex={lessonIndex}
            lessonCount={module.lessons.length}
            readOnly={readOnly}
            onDragStart={onLessonDragStart}
            onDrop={onLessonDrop}
            onMove={onMoveLesson}
            onDelete={handleDeleteLesson}
          />
        ))}
        {module.lessons.length === 0 && <li className={styles.emptyLessonList}>Немає уроків</li>}
      </ul>

      <AddLessonForm onCreate={(title) => onCreateLesson(module.id, title)} disabled={readOnly} />
    </li>
  );
};

const StepCurriculum = ({
  modules,
  readOnly,
  onCreateModule,
  onRenameModule,
  onDeleteModule,
  onCreateLesson,
  onDeleteLesson,
  onReorder,
}) => {
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const dragRef = useRef(null);

  const handleAddModule = (event) => {
    event.preventDefault();
    const trimmed = newModuleTitle.trim();
    if (!trimmed) return;
    onCreateModule(trimmed);
    setNewModuleTitle('');
  };

  const handleModuleDragStart = (index) => {
    dragRef.current = { type: 'module', index };
  };

  const handleModuleDrop = (targetIndex) => {
    const dragged = dragRef.current;
    dragRef.current = null;
    if (!dragged || dragged.type !== 'module' || dragged.index === targetIndex) return;

    const previous = modules;
    const next = arrayMove(modules, dragged.index, targetIndex);
    onReorder(next, buildModuleOrderPayload(next), previous);
  };

  const handleMoveModule = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const previous = modules;
    const next = arrayMove(modules, index, targetIndex);
    onReorder(next, buildModuleOrderPayload(next), previous);
  };

  const handleLessonDragStart = (moduleIndex, lessonIndex) => {
    dragRef.current = { type: 'lesson', moduleIndex, lessonIndex };
  };

  const handleLessonDrop = (targetModuleIndex, targetLessonIndex) => {
    const dragged = dragRef.current;
    dragRef.current = null;
    if (!dragged || dragged.type !== 'lesson') return;

    const previous = modules;
    const sourceModule = modules[dragged.moduleIndex];
    const targetModule = modules[targetModuleIndex];
    const movedLesson = sourceModule.lessons[dragged.lessonIndex];
    if (!movedLesson) return;

    if (dragged.moduleIndex === targetModuleIndex) {
      if (dragged.lessonIndex === targetLessonIndex) return;
      const nextLessons = arrayMove(sourceModule.lessons, dragged.lessonIndex, targetLessonIndex);
      const nextModules = modules.map((module, index) =>
        index === targetModuleIndex ? { ...module, lessons: nextLessons } : module,
      );
      onReorder(nextModules, buildLessonOrderWithinModulePayload(targetModule, nextLessons), previous);
      return;
    }

    const nextSourceLessons = sourceModule.lessons.filter((_, index) => index !== dragged.lessonIndex);
    const insertAt = Math.min(targetLessonIndex, targetModule.lessons.length);
    const nextTargetLessons = [...targetModule.lessons];
    nextTargetLessons.splice(insertAt, 0, movedLesson);

    const nextModules = modules.map((module, index) => {
      if (index === dragged.moduleIndex) return { ...module, lessons: nextSourceLessons };
      if (index === targetModuleIndex) return { ...module, lessons: nextTargetLessons };
      return module;
    });

    onReorder(nextModules, buildLessonMovePayload(movedLesson.id, insertAt), previous);
  };

  const handleMoveLesson = (moduleIndex, lessonIndex, direction) => {
    const module = modules[moduleIndex];
    const targetIndex = lessonIndex + direction;
    if (targetIndex < 0 || targetIndex >= module.lessons.length) return;

    const previous = modules;
    const nextLessons = arrayMove(module.lessons, lessonIndex, targetIndex);
    const nextModules = modules.map((item, index) =>
      index === moduleIndex ? { ...item, lessons: nextLessons } : item,
    );
    onReorder(nextModules, buildLessonOrderWithinModulePayload(module, nextLessons), previous);
  };

  return (
    <div className={styles.form}>
      <ul className={styles.moduleList}>
        {modules.map((module, moduleIndex) => (
          <ModuleCard
            key={module.id}
            module={module}
            moduleIndex={moduleIndex}
            moduleCount={modules.length}
            readOnly={readOnly}
            onDragStart={handleModuleDragStart}
            onDrop={handleModuleDrop}
            onMoveModule={handleMoveModule}
            onRenameModule={onRenameModule}
            onDeleteModule={onDeleteModule}
            onCreateLesson={onCreateLesson}
            onLessonDragStart={handleLessonDragStart}
            onLessonDrop={handleLessonDrop}
            onMoveLesson={handleMoveLesson}
            onDeleteLesson={onDeleteLesson}
          />
        ))}
      </ul>

      {modules.length === 0 && <p className={styles.placeholder}>У курсі ще немає модулів</p>}

      <form className={styles.inlineForm} onSubmit={handleAddModule}>
        <input
          className={styles.input}
          value={newModuleTitle}
          onChange={(event) => setNewModuleTitle(event.target.value)}
          placeholder="Назва нового модуля"
          disabled={readOnly}
        />
        <button
          type="submit"
          className={`${styles.button} ${styles.buttonPrimary}`}
          disabled={readOnly || !newModuleTitle.trim()}
        >
          + Модуль
        </button>
      </form>
    </div>
  );
};

export default StepCurriculum;
