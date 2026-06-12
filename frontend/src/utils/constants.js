// Use environment variable in production, fallback to localhost for development
export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8008";