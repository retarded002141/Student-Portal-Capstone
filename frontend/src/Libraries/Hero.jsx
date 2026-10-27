import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import studentsBg from "../assets/IMG_1350.jpg";
import iitiLogo from "../assets/iitilogo.png";
import "../Stylesheets/Hero.css";

import Modal from "./Modal";
import Login from "./Login";

function Hero() {
  const [activeModal, setActiveModal] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [studentName, setStudentName] = useState(""); // Stores name for greeting

  const isLoggedIn = !!localStorage.getItem("token");

  useEffect(() => {
    if (searchParams.get("login") === "required" && !isLoggedIn) {
      setActiveModal("login");
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, isLoggedIn]);

  // Fetch name only if logged in
  useEffect(() => {
    if (isLoggedIn) {
      const fetchName = async () => {
        try {
          const res = await fetch("http://127.0.0.1:8000/api/student/profile", {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          });
          const data = await res.json();
          if (res.ok) setStudentName(data.first_name || "Student");
        } catch (e) { console.error("Failed to fetch name", e); }
      };
      fetchName();
    }
  }, [isLoggedIn]);

  // Dynamic greeting logic
  const getGreeting = () => {
    if (!isLoggedIn) return "Welcome to the IITI Student Portal, BTECHENYO!";
    return `Welcome back, ${studentName}!`;
  };

  return (
    <>
      <section
        className="hero"
        style={{ 
          backgroundImage: `linear-gradient(rgba(13, 28, 13, 0.47), rgba(13, 28, 13, 0.08)), url(${studentsBg})` 
        }}
      >
        <div className="hero-capsule">
          <div className="hero-content">
            <div className="hero-logo-wrapper">
              <img className="iitiLogo" src={iitiLogo} alt="BTECH Logo" />
            </div>

            <div className="heroTexts">
              <div className="heroTextsInner">
                {/* IMPROVED: Dynamic greeting implementation */}
                <h1>{getGreeting()}</h1>
                <h2 className="hero-subheadline">Institute of Information Technology and Innovation</h2>

                <p className="heroP">
                  An academic unit at Baliwag Polytechnic College that offers a comprehensive
                  Information Technology education program, dedicated to developing highly
                  skilled, innovative, and ethically responsible individuals. It aims to equip
                  students with the necessary knowledge, technical competencies, and critical
                  thinking abilities to adapt to the rapidly evolving digital world and to
                  contribute effectively to the advancement of technology and society.
                </p>

                {!isLoggedIn && (
                  <button
                    className="loginButton"
                    onClick={() => setActiveModal("login")}
                  >
                    Login
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Modal
        isOpen={activeModal === "login"}
        onClose={() => setActiveModal(null)}
        ariaLabel="Student Portal Login"
      >
        <Login onLoginSuccess={() => setActiveModal(null)} />
      </Modal>
    </>
  );
}

export default Hero;