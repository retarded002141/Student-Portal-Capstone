import { useEffect, useState, useRef, useMemo } from "react";
import "../Stylesheets/Class_schedule.css";
import { API_BASE_URL } from "../api/axios";

export default function Class_schedule() {
  const [allSchedules, setAllSchedules] = useState({});
  const [selectedYear, setSelectedYear] = useState("");
  const [scheduleData, setScheduleData] = useState(null);

  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef(null);

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
  }, [scheduleData]);

  useEffect(() => {
    const fetchSchedule = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        window.location.href = "/";
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/student/schedule`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.clear();
            window.location.href = "/";
            return;
          }

          alert(data.detail || "Failed to load class schedule.");
          return;
        }

        setAllSchedules(data.schedules);

        const latestYear = Object.keys(data.schedules).slice(-1)[0];
        setSelectedYear(latestYear);
        setScheduleData(data.schedules[latestYear]);
      } catch (error) {
        alert("Cannot connect to backend.");
      }
    };

    fetchSchedule();

    const handleOutsideClick = (e) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target)) {
        setIsYearDropdownOpen(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const handleSelectYear = (year) => {
    setSelectedYear(year);
    setScheduleData(allSchedules[year]);
    setIsYearDropdownOpen(false);
  };

  const groupedSubjects = useMemo(() => {
    if (!scheduleData?.subjects) return [];

    const map = new Map();
    scheduleData.subjects.forEach((subj) => {
      const code = (subj.code || "").toUpperCase();
      if (!map.has(code)) {
        map.set(code, {
          code: subj.code,
          title: subj.title,
          units: subj.units,
          prof: subj.prof,
          email: subj.email,
          rooms: [subj.room],
          sections: [subj.section],
          schedules: [subj.schedule],
        });
      } else {
        const existing = map.get(code);
        if (subj.room && !existing.rooms.includes(subj.room)) {
          existing.rooms.push(subj.room);
        }
        if (subj.section && !existing.sections.includes(subj.section)) {
          existing.sections.push(subj.section);
        }
        if (subj.schedule && !existing.schedules.includes(subj.schedule)) {
          existing.schedules.push(subj.schedule);
        }
      }
    });

    return Array.from(map.values());
  }, [scheduleData]);

  if (!scheduleData) {
    return (
      <main className="class-schedule-container">
        <h2 className="page-title">Class Schedule</h2>
        
        <div className="schedule-loading-card">
          <div className="schedule-spinner-wrapper">
            <div className="schedule-circular-spinner"></div>
          </div>
          <div className="schedule-skeleton-lines">
            <div className="schedule-skeleton-line short"></div>
            <div className="schedule-skeleton-line full"></div>
            <div className="schedule-skeleton-line full"></div>
            <div className="schedule-skeleton-line full"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="class-schedule-container">
      <div className="class-schedule-header reveal-on-scroll">
        <div>
          <h2 className="page-title">Class Schedule</h2>
          <p className="schedule-note">
            Please refer to this official schedule of your classes. Any room or professor adjustments will be reflected here.
          </p>
        </div>

        <div className="academic-year-select-group" ref={yearDropdownRef}>
          <span className="input-label">Academic Year</span>
          <div className="schedule-select-wrap">
            <div 
              className={`schedule-custom-select-trigger ${isYearDropdownOpen ? "open" : ""}`}
              onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
            >
              <span>{selectedYear || "Select academic year"}</span>
              <span className="schedule-chevron" aria-hidden="true">▾</span>
            </div>
            
            {isYearDropdownOpen && (
              <div className="schedule-custom-dropdown-list">
                {Object.keys(allSchedules).map((year) => (
                  <div 
                    key={year} 
                    className="schedule-custom-option"
                    onClick={() => handleSelectYear(year)}
                  >
                    {year}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="schedule-table-wrapper reveal-on-scroll delay-1">
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Units</th>
              <th>Room</th>
              <th>Section</th>
              <th>Schedule</th>
              <th>Faculty / Professor</th>
            </tr>
          </thead>

          <tbody>
            {groupedSubjects.map((subject, index) => (
              <tr key={`${subject.code}-${index}`}>
                <td>
                  <span className="course-code">({subject.code})</span>
                  <br />
                  <span className="course-title">{subject.title}</span>
                </td>

                <td className="num">{subject.units}</td>
                
                <td>
                  {subject.rooms.map((rm, idx) => (
                    <div key={idx}>{rm}</div>
                  ))}
                </td>

                <td>
                  {subject.sections.map((sec, idx) => (
                    <div key={idx}>{sec}</div>
                  ))}
                </td>

                <td className="schedule-time">
                  {subject.schedules.map((sch, idx) => (
                    <div key={idx}>{sch}</div>
                  ))}
                </td>

                <td>
                  <span className="prof-name">{subject.prof}</span>
                  <br />
                  <span className="email">{subject.email}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}