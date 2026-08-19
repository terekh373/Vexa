# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

<!-- npm install styled-components -->
<!-- npm install react-router-dom -->
<!-- npm install axios -->

<!-- export const COURSE_CATEGORIES = [
  'programming',
  'design',
  'marketing',
] as const

export type CourseCategory =
  (typeof COURSE_CATEGORIES)[number]


export const COURSE_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
] as const

export type CourseLevel =
  (typeof COURSE_LEVELS)[number]


export const COURSE_FORMATS = [
  'video',
  'webinar',
  'text',
] as const

export type CourseFormat =
  (typeof COURSE_FORMATS)[number]


export const COURSE_LANGUAGES = [
  'uk',
  'en',
] as const

export type CourseLanguage =
  (typeof COURSE_LANGUAGES)[number]


export type Course = {
  id: number
  title: string
  description: string
  author: string
  image: string

  rating: number
  reviews: number
  price: number

  isNew: boolean
  isBookmarked: boolean

  category: CourseCategory
  level: CourseLevel
  format: CourseFormat
  language: CourseLanguage

  status: CourseStatus
} -->
