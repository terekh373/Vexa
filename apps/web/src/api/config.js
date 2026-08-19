// Base API URL. Set VITE_API_URL in .env.local and in Vercel project settings.
export const API = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api`;