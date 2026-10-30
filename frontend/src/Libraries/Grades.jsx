import { useEffect, useMemo, useState, useRef } from "react";
import "../Stylesheets/Grades.css";
import { API_BASE_URL } from "../api/axios";

function percentageToNumberGrade(value) {
  if (value === null || value === undefined || value === "" || value === "--") {
    return "--";
  }

  if (typeof value === "object") {
    if (value.value !== undefined && value.value !== null) value = value.value;
    else if (value.grade !== undefined && value.grade !== null) value = value.grade;
    else if (value.equivalent !== undefined && value.equivalent !== null) value = value.equivalent;
    else return "--";
  }

  const num = Number(value);
  if (isNaN(num)) return "--";

  if (num <= 5.0) {
    return num.toFixed(2);
  }

  if (num >= 99) return "1.00";
  if (num >= 96) return "1.25";
  if (num >= 93) return "1.50";
  if (num >= 90) return "1.75";
  if (num >= 87) return "2.00";
  if (num >= 84) return "2.25";
  if (num >= 81) return "2.50";
  if (num >= 77) return "2.75";
  if (num >= 75) return "3.00";
  return "5.00";
}

export default function Grades() {
  const [gradesData, setGradesData] = useState({});
  const [scheduleData, setScheduleData] = useState({});
  const [selectedTerm, setSelectedTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isTermDropdownOpen, setIsTermDropdownOpen] = useState(false);
  const termDropdownRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll(".reveal-on-scroll");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [selectedTerm, isLoading]);

  useEffect(() => {
    const fetchAcademicData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/";
        return;
      }

      try {
        const gradesRes = await fetch(`${API_BASE_URL}/api/student/grades`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const gData = await gradesRes.json();
        const grades = gData.grades || {};
        setGradesData(grades);

        const scheduleRes = await fetch(`${API_BASE_URL}/api/student/schedule`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const sData = await scheduleRes.json();
        const schedules = sData.schedules || {};
        setScheduleData(schedules);

        const fetchedTerms = Array.from(new Set([...Object.keys(grades), ...Object.keys(schedules)]));
        if (fetchedTerms.length > 0) {
          setSelectedTerm(fetchedTerms[0]);
        }
      } catch (error) {
        console.error("Cannot connect to backend server matrices.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAcademicData();

    const handleOutsideClick = (e) => {
      if (termDropdownRef.current && !termDropdownRef.current.contains(e.target)) {
        setIsTermDropdownOpen(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const sortedTermsList = useMemo(() => {
    return Array.from(new Set([...Object.keys(scheduleData), ...Object.keys(gradesData)]));
  }, [scheduleData, gradesData]);

  const handleSelectTerm = (termValue) => {
    setSelectedTerm(termValue);
    setIsTermDropdownOpen(false);
  };

  const combinedRows = useMemo(() => {
    if (!selectedTerm) return [];

    const termSchedule = scheduleData[selectedTerm]?.subjects || [];
    const termGrades = gradesData[selectedTerm] || [];

    const uniqueMap = new Map();

    termSchedule.forEach((schedSub) => {
      const code = (schedSub.code || "").toUpperCase();
      if (!uniqueMap.has(code)) {
        const recordedGrade = termGrades.find((g) => (g.code || "").toUpperCase() === code);
        uniqueMap.set(code, {
          code: schedSub.code,
          title: schedSub.title,
          units: schedSub.units,
          prof: schedSub.prof || "--",
          email: schedSub.email || "--",
          prelim: percentageToNumberGrade(recordedGrade?.prelim),
          midterm: percentageToNumberGrade(recordedGrade?.midterm),
          prefinal: percentageToNumberGrade(recordedGrade?.prefinal),
          final: percentageToNumberGrade(recordedGrade?.final),
        });
      }
    });

    termGrades.forEach((gradeSub) => {
      const code = (gradeSub.code || "").toUpperCase();
      if (!uniqueMap.has(code)) {
        uniqueMap.set(code, {
          code: gradeSub.code,
          title: gradeSub.title || code,
          units: gradeSub.units || 3,
          prof: gradeSub.prof || "--",
          email: gradeSub.email || "--",
          prelim: percentageToNumberGrade(gradeSub.prelim),
          midterm: percentageToNumberGrade(gradeSub.midterm),
          prefinal: percentageToNumberGrade(gradeSub.prefinal),
          final: percentageToNumberGrade(gradeSub.final),
        });
      }
    });

    return Array.from(uniqueMap.values());
  }, [selectedTerm, gradesData, scheduleData]);

  const gwa = useMemo(() => {
    const gradedRows = combinedRows.filter(
      (row) => row.final && row.final !== "--" && !isNaN(Number(row.final))
    );
    if (gradedRows.length === 0) return "--";

    const totalWeighted = gradedRows.reduce((sum, r) => sum + Number(r.final) * Number(r.units || 0), 0);
    const totalUnits = gradedRows.reduce((sum, r) => sum + Number(r.units || 0), 0);

    return totalUnits === 0 ? "--" : (totalWeighted / totalUnits).toFixed(2);
  }, [combinedRows]);

  if (isLoading) {
    return (
      <main className="grades-page-container">
        <h2 className="page-title">Grades</h2>
        <div className="grades-loading-card">
          <div className="grades-spinner-wrapper">
            <div className="grades-circular-spinner"></div>
          </div>
          <div className="grades-skeleton-lines">
            <div className="grades-skeleton-line short"></div>
            <div className="grades-skeleton-line full"></div>
            <div className="grades-skeleton-line full"></div>
            <div className="grades-skeleton-line full"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="grades-page-container">
      <div className="grades-page-header reveal-on-scroll">
        <div>
          <h2 className="page-title">Grades</h2>
          <p className="grades-note">
            Printed or screenshot copies of this report card are unofficial. For an official copy, please go to the Registrar’s Office.
          </p>
        </div>

        <div className="academic-year-select-group" ref={termDropdownRef}>
          <span className="input-label">Academic Year</span>
          <div className="grades-select-wrap">
            <div 
              className={`grades-custom-select-trigger ${isTermDropdownOpen ? "open" : ""}`}
              onClick={() => setIsTermDropdownOpen(!isTermDropdownOpen)}
            >
              <span>{selectedTerm || "Select academic term"}</span>
              <span className="grades-chevron" aria-hidden="true">▾</span>
            </div>
            
            {isTermDropdownOpen && (
              <div className="grades-custom-dropdown-list">
                {sortedTermsList.map((term) => (
                  <div 
                    key={term} 
                    className="grades-custom-option"
                    onClick={() => handleSelectTerm(term)}
                  >
                    {term}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grades-table-wrapper reveal-on-scroll delay-1">
        <table className="grades-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Units</th>
              <th>Prelim</th>
              <th>Midterm</th>
              <th>Pre-final</th>
              <th>Final</th>
              <th>Faculty / Professor</th>
            </tr>
          </thead>
          <tbody>
            {combinedRows.length > 0 ? (
              combinedRows.map((r, idx) => (
                <tr key={`${r.code}-${idx}`}>
                  <td>
                    <span className="course-code">({r.code})</span>
                    <br />
                    <span className="course-title">{r.title}</span>
                  </td>
                  <td className="num">{r.units}</td>
                  <td className="num">{r.prelim}</td>
                  <td className="num">{r.midterm}</td>
                  <td className="num">{r.prefinal}</td>
                  <td className={`num final-grade-val ${r.final === "--" ? "red-dash" : "numeric-grade"}`}>
                    {r.final}
                  </td>
                  <td>
                    <span className="prof-name">{r.prof}</span>
                    <br />
                    <span className="email">{r.email}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="grades-empty">No classes scheduled or grades available for this term.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grades-summary reveal-on-scroll delay-2">
        <div className="gwa-card">
          <span className="gwa-label">GWA</span>
          <span className="gwa-value">{gwa}</span>
        </div>
      </div>
    </main>
  );
}