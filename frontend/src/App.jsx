import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom"; // Added useLocation
import { useEffect } from "react"; // Added useEffect

import Header from "./Libraries/Header.jsx";
import Navigation from "./Libraries/Navigation.jsx";

import Home from "./Pages/Home.jsx";
import Class_schedule from "./Libraries/Class_schedule.jsx";
import Grades from "./Libraries/Grades.jsx";
import Title_audit from "./Libraries/Title_audit.jsx";
import Records_request from "./Libraries/Records_request.jsx";
import Profile from "./Libraries/Profile.jsx";

// Helper function to check if the JWT token is expired
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(base64));

    // 'exp' is in seconds, convert Date.now() to seconds
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return true; // Token has expired!
    }
    return false; // Token is still valid
  } catch (error) {
    return true; // Invalid token format
  }
}

function ProtectedRoute() {
  const token = localStorage.getItem("token");

  // Check if token is missing OR if the 8-hour timer has expired
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("token"); // Clean up stale token
    return <Navigate to="/?login=required" replace />;
  }

  return <Outlet />;
}

function StudentLayout() {
  const { pathname } = useLocation();

  // Reset scroll position to top whenever the route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Header />
      <Navigation />
      <Outlet />
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<StudentLayout />}>
        <Route path="/" element={<Home />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/Class_schedule" element={<Class_schedule />} />
          <Route path="/Grades" element={<Grades />} />
          <Route path="/Title_audit" element={<Title_audit />} />
          <Route path="/Records_request" element={<Records_request />} />
          <Route path="/Profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;