// src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear session data instantly
      localStorage.removeItem('token');
      sessionStorage.clear();

      // Redirect immediately to home page
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;