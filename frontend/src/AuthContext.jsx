import { useEffect } from 'react';

// Helper function to decode JWT payload
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch (e) {
    return null;
  }
}

export function useAuthAutoLogout() {
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const decoded = parseJwt(token);
    if (!decoded || !decoded.exp) return;

    // Convert exp (seconds) to milliseconds
    const expiresAt = decoded.exp * 1000;
    const timeout = expiresAt - Date.now();

    if (timeout <= 0) {
      // Token is already expired! Clear and redirect
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else {
      // Set timer to automatically logout the moment it expires
      const timer = setTimeout(() => {
        localStorage.removeItem('token');
        alert("Your session has expired. Please log in again.");
        window.location.href = '/login';
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, []);
}