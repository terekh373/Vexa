import apiClient from '../api/client.js';

export const createLessonQuiz = async (lessonId, payload) => {
  const { data } = await apiClient.post(`/author/lessons/${lessonId}/quiz`, payload);
  return data;
};

export const updateQuiz = async (quizId, patch) => {
  const { data } = await apiClient.patch(`/author/quizzes/${quizId}`, patch);
  return data;
};

export const createQuizQuestion = async (quizId, payload) => {
  const { data } = await apiClient.post(`/author/quizzes/${quizId}/questions`, payload);
  return data;
};

export const updateQuizQuestion = async (questionId, patch) => {
  const { data } = await apiClient.patch(`/author/questions/${questionId}`, patch);
  return data;
};

export const deleteQuizQuestion = async (questionId) => {
  await apiClient.delete(`/author/questions/${questionId}`);
};
