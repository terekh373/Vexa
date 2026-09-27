import { apiClient } from '../api/client.js';

export const getEnrollments = async (type) => {
  const { data } = await apiClient.get('/me/enrollments', {
    params: { type },
  });

  return data;
};

export const getCourseEnrollments = async () => {
  const data = await getEnrollments('COURSE');

  return data.items ?? [];
};

export const getLearningCourse = async (courseId) => {
  const { data } = await apiClient.get(`/learn/courses/${courseId}`);

  return data;
};

export const getLearningLesson = async (lessonId) => {
  const { data } = await apiClient.get(`/learn/lessons/${lessonId}`);

  return data.lesson;
};

export const completeLesson = async (lessonId) => {
  const { data } = await apiClient.post(`/learn/lessons/${lessonId}/complete`);

  return data;
};

export const enrollFreeCourse = async (courseId) => {
  const { data } = await apiClient.post(`/learn/courses/${courseId}/enroll`);

  return data;
};

export const submitQuizAttempt = async (quizId, answers) => {
  const { data } = await apiClient.post(
    `/learn/quizzes/${quizId}/attempts`,
    { answers },
  );

  return data;
};


export const getMaterialEnrollments = async () => {
  const data = await getEnrollments('MATERIAL');

  return data.items ?? [];
};

export const getFileDownloadUrl = async (fileId) => {
  const { data } = await apiClient.get(
    `/files/${fileId}/download-url`,
  );

  return data;
};