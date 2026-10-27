// src/Libraries/Title_audit.jsx
import { useEffect, useMemo, useState } from "react";
import "../Stylesheets/Title_audit.css";

// BPC Official Grading Conversion Table
const convertToNumberGrade = (raw) => {
  if (raw === undefined || raw === null || raw === "" || raw === "--") {
    return "--";
  }

  const num = Number(raw);
  if (isNaN(num)) return String(raw);

  if (num >= 1.0 && num <= 5.0 && String(raw).includes(".")) {
    return num.toFixed(2);
  }

  const rounded = Math.round(num);

  if (rounded >= 99) return "1.00";
  if (rounded >= 96) return "1.25";
  if (rounded >= 93) return "1.50";
  if (rounded >= 90) return "1.75";
  if (rounded >= 87) return "2.00";
  if (rounded >= 84) return "2.25";
  if (rounded >= 81) return "2.50";
  if (rounded >= 77) return "2.75";
  if (rounded >= 75) return "3.00";
  return "5.00";
};

export default function Title_audit() {
  const [backendGrades, setBackendGrades] = useState({});
  const [backendSchedules, setBackendSchedules] = useState({});
  const [isLoading, setIsLoading] = useState(true);

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
  }, [backendGrades, backendSchedules, isLoading]);

  useEffect(() => {
    const fetchAuditData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/";
        return;
      }

      try {
        // Fetch both Grades and Schedule simultaneously
        const [gradesRes, scheduleRes] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/student/grades", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://127.0.0.1:8000/api/student/schedule", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (gradesRes.ok) {
          const gradesData = await gradesRes.json();
          if (gradesData.grades) setBackendGrades(gradesData.grades);
        }

        if (scheduleRes.ok) {
          const scheduleData = await scheduleRes.json();
          if (scheduleData.schedules) setBackendSchedules(scheduleData.schedules);
        }
      } catch (error) {
        console.error("Cannot connect to backend matrices for Title Audit updates.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditData();
  }, []);

  const calculateSemesterUnits = (rows = []) => {
    return rows.reduce((acc, r) => acc + Number(r.units || 0), 0);
  };

  // Merge enrolled schedule subjects with grade records
  const mergedAuditData = useMemo(() => {
    const allTerms = Array.from(
      new Set([...Object.keys(backendSchedules), ...Object.keys(backendGrades)])
    );

    const merged = {};

    allTerms.forEach((termKey) => {
      const schedSubjects = backendSchedules[termKey]?.subjects || [];
      const gradeSubjects = backendGrades[termKey] || [];

      const subjectMap = new Map();

      // 1. Add enrolled subjects from Schedule
      schedSubjects.forEach((sub) => {
        const code = (sub.code || "").toUpperCase();
        if (!subjectMap.has(code)) {
          subjectMap.set(code, {
            code: sub.code,
            title: sub.title,
            units: sub.units,
            final: "--",
          });
        }
      });

      // 2. Overlay recorded grades from Grades
      gradeSubjects.forEach((gradeSub) => {
        const code = (gradeSub.code || "").toUpperCase();
        if (subjectMap.has(code)) {
          subjectMap.get(code).final = gradeSub.final;
        } else {
          subjectMap.set(code, {
            code: gradeSub.code,
            title: gradeSub.title,
            units: gradeSub.units,
            final: gradeSub.final,
          });
        }
      });

      merged[termKey] = Array.from(subjectMap.values());
    });

    return merged;
  }, [backendGrades, backendSchedules]);

  const groupedBySchoolYear = useMemo(() => {
    const groups = {};

    Object.keys(mergedAuditData).forEach((termKey) => {
      const syMatch = termKey.match(/(\d{4})\s*-\s*(\d{4})/);
      const syKey = syMatch ? `SY ${syMatch[1]}-${syMatch[2]}` : "Other Academic Terms";
      const lowerKey = termKey.toLowerCase();
      const subjects = mergedAuditData[termKey] || [];

      if (!groups[syKey]) {
        groups[syKey] = { firstSem: [], secondSem: [] };
      }

      if (lowerKey.includes("1st") || lowerKey.includes("first")) {
        groups[syKey].firstSem = [...groups[syKey].firstSem, ...subjects];
      } else if (lowerKey.includes("2nd") || lowerKey.includes("second")) {
        groups[syKey].secondSem = [...groups[syKey].secondSem, ...subjects];
      } else {
        groups[syKey].firstSem = [...groups[syKey].firstSem, ...subjects];
      }
    });

    return groups;
  }, [mergedAuditData]);

  const sortedSchoolYears = useMemo(() => {
    return Object.keys(groupedBySchoolYear).sort();
  }, [groupedBySchoolYear]);

  if (isLoading) {
    return (
      <main className="curriculum-container">
        <h2 className="page-title">Title Audit</h2>
        <div className="audit-loading-card">
          <div className="audit-spinner-wrapper">
            <div className="audit-circular-spinner"></div>
          </div>
          <div className="audit-skeleton-lines">
            <div className="audit-skeleton-line short"></div>
            <div className="audit-skeleton-line full"></div>
            <div className="audit-skeleton-line full"></div>
            <div className="audit-skeleton-line full"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="curriculum-container">
      <div className="curriculum-header reveal-on-scroll">
        <div>
          <h2 className="page-title">Title Audit</h2>
          <p className="curriculum-note">
            Printed or screenshot copies of this title audit are unofficial. For an official copy, please go to the Registrar’s Office.
          </p>
        </div>
      </div>

      {sortedSchoolYears.length > 0 ? (
        sortedSchoolYears.map((syKey) => {
          const { firstSem, secondSem } = groupedBySchoolYear[syKey];
          const firstTotals = calculateSemesterUnits(firstSem);
          const secondTotals = calculateSemesterUnits(secondSem);

          return (
            <div className="curriculum-year-group reveal-on-scroll" key={syKey}>
              <div className="school-year-banner">{syKey}</div>

              <div className="semester-split-row">
                {/* 1st Semester Column */}
                <div className="semester-column">
                  <div className="semester-sub-bar">1st Semester</div>
                  <div className="curriculum-table-wrapper">
                    <table className="curriculum-table">
                      <thead>
                        <tr>
                          <th className="col-code">CODE</th>
                          <th className="col-title">TITLE</th>
                          <th className="col-num">UNITS</th>
                          <th className="col-grade">GRADE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {firstSem.length > 0 ? (
                          firstSem.map((r, idx) => {
                            const gradeDisplay = convertToNumberGrade(r.final);
                            const isFailing = gradeDisplay === "5.00";
                            return (
                              <tr key={`${r.code}-${idx}`}>
                                <td>{r.code}</td>
                                <td className="title-cell" title={r.title}>
                                  {r.title}
                                </td>
                                <td className="num">{r.units}</td>
                                <td
                                  className={`grade ${
                                    gradeDisplay === "--" ? "red-dash" : "numeric-grade"
                                  }`}
                                  style={
                                    isFailing ? { color: "#dc2626", fontWeight: "700" } : {}
                                  }
                                >
                                  {gradeDisplay}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="4" className="grades-empty">
                              No subjects taken or scheduled.
                            </td>
                          </tr>
                        )}
                        {firstSem.length > 0 && (
                          <tr className="totals-row">
                            <td colSpan={2}></td>
                            <td className="num">{firstTotals}</td>
                            <td></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2nd Semester Column */}
                <div className="semester-column">
                  <div className="semester-sub-bar">2nd Semester</div>
                  <div className="curriculum-table-wrapper">
                    <table className="curriculum-table">
                      <thead>
                        <tr>
                          <th className="col-code">CODE</th>
                          <th className="col-title">TITLE</th>
                          <th className="col-num">UNITS</th>
                          <th className="col-grade">GRADE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {secondSem.length > 0 ? (
                          secondSem.map((r, idx) => {
                            const gradeDisplay = convertToNumberGrade(r.final);
                            const isFailing = gradeDisplay === "5.00";
                            return (
                              <tr key={`${r.code}-${idx}`}>
                                <td>{r.code}</td>
                                <td className="title-cell" title={r.title}>
                                  {r.title}
                                </td>
                                <td className="num">{r.units}</td>
                                <td
                                  className={`grade ${
                                    gradeDisplay === "--" ? "red-dash" : "numeric-grade"
                                  }`}
                                  style={
                                    isFailing ? { color: "#dc2626", fontWeight: "700" } : {}
                                  }
                                >
                                  {gradeDisplay}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="4" className="grades-empty">
                              No subjects taken or scheduled.
                            </td>
                          </tr>
                        )}
                        {secondSem.length > 0 && (
                          <tr className="totals-row">
                            <td colSpan={2}></td>
                            <td className="num">{secondTotals}</td>
                            <td></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="audit-empty-state reveal-on-scroll">
          No historical grades or curriculum tracking details available for this profile record.
        </div>
      )}
    </main>
  );
}