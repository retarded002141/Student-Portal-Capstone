import { useEffect, useMemo, useState } from "react";
import "../Stylesheets/Title_audit.css";
import { API_BASE_URL } from "../axios";

const convertToNumberGrade = (item) => {
  if (!item) return "--";

  const isCredited =
    (typeof item === "object" &&
      (item.equivalent === "Credited" ||
        item.status === "credited" ||
        item.final === "Credited")) ||
    item === "Credited";

  if (isCredited) return "Credited";

  const raw = typeof item === "object" ? item.final : item;

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
  const [gradesData, setGradesData] = useState({});
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
  }, [gradesData, isLoading]);

  useEffect(() => {
    const fetchAuditGrades = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/";
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/student/grades`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.grades) {
            setGradesData(data.grades);
          }
        }
      } catch (error) {
        console.error("Cannot connect to grades server for Title Audit.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditGrades();
  }, []);

  const { creditedSubjects, semesterTerms } = useMemo(() => {
    let credited = [];
    const terms = {};

    Object.keys(gradesData).forEach((termKey) => {
      const list = gradesData[termKey] || [];

      if (termKey.toLowerCase().includes("credited") || termKey.toLowerCase().includes("transferred")) {
        credited = [...credited, ...list];
      } else {
        const validForAudit = list.filter((sub) => {
          const isCred = sub.equivalent === "Credited" || sub.status === "credited" || sub.final === "Credited";
          if (isCred) {
            credited.push(sub);
            return false;
          }
          return sub.final && sub.final !== "--";
        });

        if (validForAudit.length > 0) {
          terms[termKey] = validForAudit;
        }
      }
    });

    return { creditedSubjects: credited, semesterTerms: terms };
  }, [gradesData]);

  const calculateUnits = (subjects = []) => {
    return subjects.reduce((sum, item) => sum + Number(item.units || 0), 0);
  };

  if (isLoading) {
    return (
      <main className="curriculum-container">
        <h2 className="page-title">Title Audit Report</h2>
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

  const termKeys = Object.keys(semesterTerms);
  const totalCreditedUnits = calculateUnits(creditedSubjects);
  const hasRecords = creditedSubjects.length > 0 || termKeys.length > 0;

  return (
    <main className="curriculum-container">
      <div className="curriculum-header reveal-on-scroll">
        <div>
          <h2 className="page-title">Title Audit Report</h2>
          <p className="curriculum-note">
            Printed or screenshot copies of this title audit are unofficial. For an official copy, please go to the Registrar’s Office.
          </p>
        </div>
      </div>

      {hasRecords ? (
        <>
          {creditedSubjects.length > 0 && (
            <div className="curriculum-year-group reveal-on-scroll">

              <div className="curriculum-table-wrapper desktop-only">
                <table className="curriculum-table">
                  <thead>
                    <tr>
                      <th className="col-code">Subject Code</th>
                      <th className="col-title">Subject Description</th>
                      <th className="col-num">No. of Units</th>
                      <th className="col-grade">Status / Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditedSubjects.map((item, idx) => (
                      <tr key={`cred-${item.code}-${idx}`}>
                        <td className="code-cell">
                          <strong>{item.code}</strong>
                        </td>
                        <td className="title-cell" title={item.title}>
                          {item.title}
                        </td>
                        <td className="num">{item.units}</td>
                        <td className="grade credited-grade-text">
                          <span className="credited-pill">Credited</span>
                        </td>
                      </tr>
                    ))}

                    <tr className="totals-row">
                      <td colSpan={2} className="totals-label"></td>
                      <td className="num totals-val">{totalCreditedUnits}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mobile-cards-container mobile-only">
                {creditedSubjects.map((item, idx) => (
                  <div className="audit-card" key={`mob-cred-${item.code}-${idx}`}>
                    <div className="audit-card-top">
                      <span className="code-cell">
                        <strong>{item.code}</strong>
                      </span>
                      <span className="audit-grade-pill credited">Credited</span>
                    </div>
                    <div className="audit-card-title">{item.title}</div>
                    <div className="audit-card-units">{item.units} Units</div>
                  </div>
                ))}
                <div className="audit-mobile-totals">
                  <span>Total Credited Units:</span>
                  <strong>{totalCreditedUnits}</strong>
                </div>
              </div>
            </div>
          )}

          {termKeys.map((termLabel) => {
            const subjects = semesterTerms[termLabel] || [];
            const totalUnits = calculateUnits(subjects);

            return (
              <div className="curriculum-year-group reveal-on-scroll" key={termLabel}>
                <div className="school-year-banner">{termLabel}</div>

                <div className="curriculum-table-wrapper desktop-only">
                  <table className="curriculum-table">
                    <thead>
                      <tr>
                        <th className="col-code">Subject Code</th>
                        <th className="col-title">Subject Description</th>
                        <th className="col-num">No. of Units</th>
                        <th className="col-grade">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((item, idx) => {
                        const gradeDisplay = convertToNumberGrade(item);
                        const isFailing = gradeDisplay === "5.00";

                        return (
                          <tr key={`${item.code}-${idx}`}>
                            <td className="code-cell"><strong>{item.code}</strong></td>
                            <td className="title-cell" title={item.title}>
                              {item.title}
                            </td>
                            <td className="num">{item.units}</td>
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
                      })}

                      <tr className="totals-row">
                        <td colSpan={2} className="totals-label">Total Semester Units:</td>
                        <td className="num totals-val">{totalUnits}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mobile-cards-container mobile-only">
                  {subjects.map((item, idx) => {
                    const gradeDisplay = convertToNumberGrade(item);
                    return (
                      <div className="audit-card" key={`mob-a-${item.code}-${idx}`}>
                        <div className="audit-card-top">
                          <span className="code-cell"><strong>{item.code}</strong></span>
                          <span className="audit-grade-pill">{gradeDisplay}</span>
                        </div>
                        <div className="audit-card-title">{item.title}</div>
                        <div className="audit-card-units">{item.units} Units</div>
                      </div>
                    );
                  })}
                  <div className="audit-mobile-totals">
                    <span>Total Semester Units:</span>
                    <strong>{totalUnits}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div className="audit-empty-state reveal-on-scroll">
          No graded or credited subjects recorded yet in your student profile history.
        </div>
      )}
    </main>
  );
}