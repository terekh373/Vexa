// import courses from '../data/courses.json'

// export const getCourses = () => {
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       resolve(courses)
//     }, 800)
//   })
// }

import { API } from '../api/config.js'

export const getCourse = async (idOrSlug) => {
  const response = await fetch(`${API}/courses/${idOrSlug}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }

    throw new Error('Failed to fetch course');
  }

  return response.json();
};

export const getCourses = async () => {
  const response = await fetch(`${API}/courses`)

  if (!response.ok) {
    throw new Error('Failed to fetch courses')
  }

  return response.json()
};

export const getCourseReviews = async (id, page = 1, limit = 10) => {
  const response = await fetch(
    `${API}/courses/${id}/reviews?page=${page}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch course reviews');
  }

  return response.json();
};