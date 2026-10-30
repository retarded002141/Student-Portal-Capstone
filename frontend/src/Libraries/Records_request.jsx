import { useEffect, useMemo, useState, useRef } from "react";
import "../Stylesheets/Records_request.css";
import { API_BASE_URL } from "../api/axios";

const DEFAULT_SEMESTER_OPTIONS = [
  "2024-2025 1st Semester",
  "2024-2025 2nd Semester",
  "2023-2024 1st Semester",
  "2023-2024 2nd Semester",
];

const DEFAULT_DOCUMENTS = [
  "Certificate of Registration (COR)",
  "Certificate of Grades (COG)",
  "Transcript of Records (TOR)",
];

const DEFAULT_COMMON_REASONS = [
  "Scholarship Application / Renewal",
  "Employment",
  "Internship",
  "Licensure Application",
  "Transfer/Honorable Dismissal",
  "Personal Record",
];

export default function Records_request() {
  const [fullName, setFullName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [customDocDetails, setCustomDocDetails] = useState("");
  const [yearSemester, setYearSemester] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  
  const [documentOptions, setDocumentOptions] = useState(DEFAULT_DOCUMENTS);
  const [semesterOptions, setSemesterOptions] = useState(DEFAULT_SEMESTER_OPTIONS);
  const [commonReasons, setCommonReasons] = useState(DEFAULT_COMMON_REASONS);
  
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDocDropdownOpen, setIsDocDropdownOpen] = useState(false);
  const [isSemDropdownOpen, setIsSemDropdownOpen] = useState(false);
  const [isReasonDropdownOpen, setIsReasonDropdownOpen] = useState(false);

  const docDropdownRef = useRef(null);
  const semDropdownRef = useRef(null);
  const reasonDropdownRef = useRef(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [targetRequestId, setTargetRequestId] = useState(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalDesc, setModalDesc] = useState("");
  const [isError, setIsError] = useState(false);

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
  }, [history, isLoading]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([fetchStudentInfo(), fetchRecords(), fetchDynamicConfig()]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();

    const interval = setInterval(fetchRecords, 2000);

    const handleOutsideClick = (e) => {
      if (docDropdownRef.current && !docDropdownRef.current.contains(e.target)) {
        setIsDocDropdownOpen(false);
      }
      if (semDropdownRef.current && !semDropdownRef.current.contains(e.target)) {
        setIsSemDropdownOpen(false);
      }
      if (reasonDropdownRef.current && !reasonDropdownRef.current.contains(e.target)) {
        setIsReasonDropdownOpen(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);

    return () => {
      clearInterval(interval);
      window.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  const fetchDynamicConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/student/records/config`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.documents) && data.documents.length > 0) {
          setDocumentOptions(data.documents);
        }
        if (Array.isArray(data.reasons) && data.reasons.length > 0) {
          setCommonReasons(data.reasons);
        }
      }
    } catch (err) {
      console.error("Failed to load request configuration:", err);
    }
  };

  const fetchStudentInfo = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/";
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/student/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.clear();
          window.location.href = "/";
        }
        return;
      }
      
      setFullName(`${data.first_name || data.firstName || ""} ${data.middle_initial || data.middleInitial ? (data.middle_initial || data.middleInitial) + "." : ""} ${data.last_name || data.lastName || ""}`.trim());
      setStudentNumber(data.student_number || data.studentNumber || "");

      let activeTerms = [];

      if (data.grades && typeof data.grades === "object") {
        activeTerms = Object.keys(data.grades);
      } else if (data.class_schedule && typeof data.class_schedule === "object") {
        activeTerms = Object.keys(data.class_schedule);
      } else if (data.schedules && typeof data.schedules === "object") {
        activeTerms = Object.keys(data.schedules);
      } else if (Array.isArray(data.enrolled_semesters)) {
        activeTerms = data.enrolled_semesters;
      }

      activeTerms = activeTerms.filter(Boolean);

      setSemesterOptions(activeTerms);
    } catch (error) {
      console.error("Error fetching student profile:", error);
      setSemesterOptions([]);
    }
  };

  const fetchRecords = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/student/records`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        const raw = data.records_requests || [];
        setHistory(raw);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const finalReasonsList = useMemo(() => {
    const filtered = commonReasons.filter((r) => r !== "Others (Please specify)");
    return [...filtered, "Others (Please specify)"];
  }, [commonReasons]);

  const isCustomDocument = useMemo(() => {
    return documentType && !DEFAULT_DOCUMENTS.includes(documentType);
  }, [documentType]);

  const requiresYearSemester = useMemo(() => {
    return (
      documentType === "Certificate of Registration (COR)" ||
      documentType === "Certificate of Grades (COG)"
    );
  }, [documentType]);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  }, []);

  const handleSelectDocument = (value) => {
    setDocumentType(value);
    setIsDocDropdownOpen(false);
    setCustomDocDetails("");

    if (
      value !== "Certificate of Registration (COR)" &&
      value !== "Certificate of Grades (COG)"
    ) {
      setYearSemester("N/A");
    } else {
      setYearSemester("");
    }
  };

  const handleSelectSemester = (value) => {
    setYearSemester(value);
    setIsSemDropdownOpen(false);
  };

  const handleSelectReason = (value) => {
    setSelectedReason(value);
    setIsReasonDropdownOpen(false);
    if (value !== "Others (Please specify)") {
      setCustomReason("");
    }
  };

  const triggerResult = (title, msg, errorFlag = false) => {
    setModalTitle(title);
    setModalDesc(msg);
    setIsError(errorFlag);
    setShowResultModal(true);
  };

  const handleTriggerCancel = (reqId) => {
    setTargetRequestId(reqId);
    setShowConfirmModal(true);
  };

  const handleConfirmCancel = async () => {
    setShowConfirmModal(false);
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${API_BASE_URL}/api/student/records/delete/${targetRequestId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        triggerResult("Action Failed", data.detail || "Unable to cancel record request.", true);
        return;
      }
      triggerResult("Cancelled", "Your request has been cancelled.", false);
      fetchRecords();
    } catch (error) {
      triggerResult("Connection Fault", "Cannot sync changes to database.", true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!documentType) {
      triggerResult("Validation Error", "Please select a document type.", true);
      return;
    }
    if (isCustomDocument && !customDocDetails.trim()) {
      triggerResult("Validation Error", "Please specify the required details for this document request.", true);
      return;
    }
    if (requiresYearSemester && !yearSemester) {
      triggerResult("Validation Error", "Please select year and semester.", true);
      return;
    }
    if (!selectedReason) {
      triggerResult("Validation Error", "Please select a reason for your request.", true);
      return;
    }

    let finalDocName = documentType;
    if (isCustomDocument && customDocDetails.trim()) {
      finalDocName = `${documentType} (${customDocDetails.trim()})`;
    }

    let finalReason = selectedReason;
    if (selectedReason === "Others (Please specify)") {
      if (!customReason.trim()) {
        triggerResult("Validation Error", "Please specify your reason in the text field.", true);
        return;
      }
      finalReason = customReason.trim();
    }

    setIsSubmitting(true);

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${API_BASE_URL}/api/student/records/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentType: finalDocName,
          yearSemester: requiresYearSemester ? yearSemester : "N/A",
          reason: finalReason,
          dateRequested: todayFormatted,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.clear();
          window.location.href = "/";
          return;
        }
        triggerResult("Submission Failed", data.detail || "Failed to submit request.", true);
        return;
      }
      setDocumentType("");
      setCustomDocDetails("");
      setYearSemester("");
      setSelectedReason("");
      setCustomReason("");
      triggerResult("Request Created", "Your document request has been submitted successfully.", false);
      fetchRecords();
    } catch (error) {
      triggerResult("Network Error", "Cannot connect to server.", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="records-request-container">
        <h2 className="records-page-title">Records Request</h2>
        
        <div className="records-loading-card">
          <div className="records-spinner-wrapper">
            <div className="records-circular-spinner"></div>
          </div>
          <div className="records-skeleton-lines">
            <div className="records-skeleton-line short"></div>
            <div className="records-skeleton-line full"></div>
            <div className="records-skeleton-line full"></div>
            <div className="records-skeleton-line full"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="records-request-container">
      <div className="records-request-header reveal-on-scroll">
        <div>
          <h2 className="records-page-title">Records Request</h2>
          <p className="records-note">
            Fill out the form below to request a copy of your academic record
          </p>
        </div>
      </div>

      <div className="records-form-card reveal-on-scroll delay-1">
        <form className="records-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h4 className="section-sub-title">Personal Records (Read-Only)</h4>
            <div className="row-2-even">
              <div className="input-group">
                <span className="input-label">Full Name</span>
                <input type="text" value={fullName} disabled className="ro-input-disabled" />
              </div>
              <div className="input-group">
                <span className="input-label">Student Number</span>
                <input type="text" value={studentNumber} disabled className="ro-input-disabled" />
              </div>
            </div>
          </div>

          <div className="form-section" style={{ marginTop: "12px" }}>
            <h4 className="section-sub-title">Document Details</h4>
            <div className="row-2-even">
              <div className="input-group" ref={docDropdownRef}>
                <span className="input-label">Document Type</span>
                <div className="records-select-wrap">
                  <div 
                    className={`custom-select-trigger ${isDocDropdownOpen ? "open" : ""}`}
                    onClick={() => setIsDocDropdownOpen(!isDocDropdownOpen)}
                  >
                    <span>{documentType || "Select document to request"}</span>
                    <span className="records-chevron" aria-hidden="true">▾</span>
                  </div>
                  {isDocDropdownOpen && (
                    <div className="custom-dropdown-options-list">
                      {documentOptions.map((doc) => (
                        <div 
                          key={doc} 
                          className="custom-option" 
                          onClick={() => handleSelectDocument(doc)}
                        >
                          {doc}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {requiresYearSemester ? (
                <div className="input-group" ref={semDropdownRef}>
                  <span className="input-label">Year / Semester</span>
                  <div className="records-select-wrap">
                    <div 
                      className={`custom-select-trigger ${isSemDropdownOpen ? "open" : ""}`}
                      onClick={() => setIsSemDropdownOpen(!isSemDropdownOpen)}
                    >
                      <span>{yearSemester || "Select year and semester"}</span>
                      <span className="records-chevron" aria-hidden="true">▾</span>
                    </div>
                    {isSemDropdownOpen && (
                      <div className="custom-dropdown-options-list">
                        {semesterOptions.map((semester) => (
                          <div 
                            key={semester} 
                            className="custom-option" 
                            onClick={() => handleSelectSemester(semester)}
                          >
                            {semester}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="input-group spacer-group"></div>
              )}
            </div>

            {isCustomDocument && (
              <div className="input-group custom-reason-wrapper reveal-sub-input" style={{ marginTop: "10px" }}>
                <div className="custom-reason-label-row">
                  <span className="input-label">Specify Document Purpose / Details</span>
                  <span className={`char-counter ${customDocDetails.length >= 60 ? "limit-reached" : ""}`}>
                    {customDocDetails.length} / 60
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={60}
                  className="records-specify-input"
                  placeholder="Provide required details for this document (max 60 characters)..."
                  value={customDocDetails}
                  onChange={(e) => setCustomDocDetails(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            )}

            <div className="input-group" ref={reasonDropdownRef} style={{ marginTop: "14px" }}>
              <span className="input-label">Reason for Request</span>
              <div className="records-select-wrap">
                <div 
                  className={`custom-select-trigger ${isReasonDropdownOpen ? "open" : ""}`}
                  onClick={() => setIsReasonDropdownOpen(!isReasonDropdownOpen)}
                >
                  <span>{selectedReason || "Select purpose of request"}</span>
                  <span className="records-chevron" aria-hidden="true">▾</span>
                </div>
                {isReasonDropdownOpen && (
                  <div className="custom-dropdown-options-list">
                    {finalReasonsList.map((r) => (
                      <div 
                        key={r} 
                        className="custom-option" 
                        onClick={() => handleSelectReason(r)}
                      >
                        {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedReason === "Others (Please specify)" && (
              <div className="input-group custom-reason-wrapper reveal-sub-input" style={{ marginTop: "10px" }}>
                <div className="custom-reason-label-row">
                  <span className="input-label">Specify Your Reason</span>
                  <span className={`char-counter ${customReason.length >= 60 ? "limit-reached" : ""}`}>
                    {customReason.length} / 60
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={60}
                  className="records-specify-input"
                  placeholder="Type specific reason (max 60 characters)..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            )}
          </div>

          <div className="records-submit-wrap">
            <button 
              type="submit" 
              className="records-submit-btn"
              disabled={isSubmitting}
              style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? "not-allowed" : "pointer" }}
            >
              {isSubmitting ? "Submitting..." : "Submit request"}
            </button>
          </div>
        </form>
      </div>

      <section className="records-history-section reveal-on-scroll delay-2">
        <h3 className="records-history-title">Request History</h3>
        <p className="records-history-note">
          Request history resets every month. Only recent requests within the current month will be displayed.
        </p>

        <div className="records-table-wrapper">
          <table className="records-table">
            <thead>
              <tr>
                <th>Document Type</th>
                <th>Year / Semester</th>
                <th>Reason</th>
                <th>Date Requested</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.length > 0 ? (
                history.map((item, index) => (
                  <tr key={item.id || index}>
                    <td><strong>{item.documentType}</strong></td>
                    <td>{item.yearSemester || "N/A"}</td>
                    
                    <td 
                      style={{ 
                        maxWidth: "200px", 
                        overflow: "hidden", 
                        textOverflow: "ellipsis", 
                        whiteSpace: "nowrap",
                        color: "#475569", 
                        fontSize: "13px" 
                      }}
                      title={item.reason || "—"}
                    >
                      {item.reason || "—"}
                    </td>

                    <td>{item.dateRequested}</td>
                    <td>
                      <span className={`records-status-badge ${item.status ? item.status.toLowerCase().replace(/\s+/g, '-') : 'pending'}`}>
                        {item.status || "Pending"}
                      </span>
                    </td>
                    <td>
                      {(item.status || "").toLowerCase() === "pending" ? (
                        <button 
                          type="button" 
                          className="records-delete-action-btn"
                          onClick={() => handleTriggerCancel(item.id)}
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="records-action-locked">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="records-empty">No requests yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showConfirmModal && (
        <div className="records-modal-overlay">
          <div className="records-modal-card">
            <div className="warning-icon-wrapper">
              <svg 
                width="30" 
                height="30" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#b91c1c" 
                strokeWidth="2.2"
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3>Are you sure?</h3>
            <p>Do you really want to cancel this pending document request? This action cannot be undone.</p>
            <div className="records-modal-twin-btns">
              <button type="button" className="records-secondary-btn" onClick={() => setShowConfirmModal(false)}>No, Back</button>
              <button type="button" className="records-danger-confirm-btn" onClick={handleConfirmCancel}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showResultModal && (
        <div className="records-modal-overlay">
          <div className="records-modal-card">
            <div className={`success-checkmark-icon ${isError ? "error-alert-badge" : ""}`}>
              {isError ? (
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#b91c1c"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <circle cx="12" cy="16" r="0.75" fill="#b91c1c" strokeWidth="1" />
                </svg>
              ) : (
                <svg 
                  width="32" 
                  height="32" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#2e522a" 
                  strokeWidth="2.5"
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <h3>{modalTitle}</h3>
            <p>{modalDesc}</p>
            <div className="records-modal-lone-btn-wrap">
              <button 
                type="button" 
                className={`records-lone-btn ${isError ? "danger-fill" : ""}`} 
                onClick={() => setShowResultModal(false)}
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}