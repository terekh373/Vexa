import courses from '../data/courses.json'

export const getCourses = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(courses)
    }, 2800)
  })
}