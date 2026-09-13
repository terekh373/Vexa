import axios from 'axios';

// Base API URL. Set VITE_API_URL in .env.local and in Vercel project settings.
export const API = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api`;

// Shared HTTP client for web API services. Keeping the base URL in one place
// makes catalog requests consistent with the rest of the application.
export const apiClient = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});
