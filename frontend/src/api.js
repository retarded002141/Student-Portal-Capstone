// frontend/src/api.js
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Ensures base URL never has a trailing slash
export const API_BASE_URL = BASE_URL.replace(/\/$/, "");