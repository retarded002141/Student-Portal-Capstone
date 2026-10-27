// src/Libraries/Profile.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom"; 
import Cropper from "react-easy-crop";
import "../Stylesheets/Profile.css";
import Settings from "./Settings.jsx";

// Helper function to generate the cropped image file using canvas
const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = new Image();
  image.src = imageSrc;
  image.crossOrigin = "anonymous"; 

  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas is empty"));
        return;
      }
      resolve(blob);
    }, "image/jpeg");
  });
};

export default function Profile() {
  const [activeTab, setActiveTab] = useState("personal");
  const [student, setStudent] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const location = useLocation();

  // Avatar Modal & Cropping States
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [tempFile, setTempFile] = useState(null); 
  const [tempPreview, setTempPreview] = useState(null); 
  const [isRemoving, setIsRemoving] = useState(false); 
  const [isSaving, setIsSaving] = useState(false); 
  
  // Cropper specific state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCroppingMode, setIsCroppingMode] = useState(false);

  const fileInputRef = useRef(null);

  // Scroll Reveal Observer
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
  }, [student, activeTab]);

  const fetchProfile = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/";
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/student/profile", {
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
        alert(data.detail || "Failed to load profile.");
        return;
      }

      setStudent(data);

      setTimeout(() => {
        window.dispatchEvent(new Event("layoutAdjust"));
      }, 30);

    } catch (error) {
      alert("Cannot connect to backend.");
    }
  };

  useEffect(() => {
    fetchProfile();

    if (window.history.state && window.history.state.usr && window.history.state.usr.defaultTab) {
      setActiveTab(window.history.state.usr.defaultTab);
    }
  }, [location]);

  useEffect(() => {
    const handleTabSwitchEvent = (e) => {
      if (e.detail && e.detail.tab) {
        setActiveTab(e.detail.tab);
      }
    };

    window.addEventListener("tabSwitch", handleTabSwitchEvent);
    return () => {
      window.removeEventListener("tabSwitch", handleTabSwitchEvent);
    };
  }, []);

  const handleOpenAvatarModal = () => {
    setTempFile(null);
    setTempPreview(null);
    setIsRemoving(false);
    setIsCroppingMode(false);
    setIsSaving(false);
    setZoom(1);
    setShowAvatarModal(true);
  };

  const handleTriggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large. Please select an image under 2MB.");
      return;
    }

    setTempFile(file);
    setTempPreview(URL.createObjectURL(file));
    setIsRemoving(false);
    setIsCroppingMode(true); 
  };

  const handleMarkForRemoval = () => {
    setTempFile(null);
    setTempPreview(null);
    setIsRemoving(true);
    setIsCroppingMode(false);
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCloseAvatarModal = () => {
    if (isSaving) return; 

    const hasUnsavedChanges = tempFile !== null || isRemoving === true;

    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm(
        "You have unsaved changes. Are you sure you want to discard them?"
      );
      if (!confirmDiscard) return;
    }

    if (tempPreview) {
      URL.revokeObjectURL(tempPreview);
    }
    setShowAvatarModal(false);
    setTempFile(null);
    setTempPreview(null);
    setIsRemoving(false);
    setIsCroppingMode(false);
  };

  const handleSaveAvatar = async () => {
    const token = localStorage.getItem("token");

    try {
      if (isRemoving) {
        const response = await fetch("http://127.0.0.1:8000/api/student/profile/avatar/remove", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const data = await response.json();
          alert(data.detail || "Failed to remove profile picture.");
          return;
        }
      } else if (tempFile && croppedAreaPixels) {
        const croppedImageBlob = await getCroppedImg(tempPreview, croppedAreaPixels);
        const formData = new FormData();
        formData.append("avatar", croppedImageBlob, "avatar.jpg");

        const response = await fetch("http://127.0.0.1:8000/api/student/profile/avatar", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          alert(data.detail || "Failed to upload profile picture.");
          return;
        }
      } else {
        setShowAvatarModal(false);
        return;
      }

      setIsSaving(true);
      setIsCroppingMode(false);
      setTempFile(null);
      if (tempPreview) {
        URL.revokeObjectURL(tempPreview);
      }
      setTempPreview(null);
      setIsRemoving(false);

      setTimeout(() => {
        setShowAvatarModal(false);
        window.location.reload();
      }, 3000);

    } catch (error) {
      alert("Error connecting to server while saving image.");
    }
  };

  const handleLogoutSubmit = () => {
    setIsLoggingOut(true);

    setTimeout(() => {
      localStorage.clear();
      window.location.href = "/";
    }, 2000);
  };

  const personal = student?.personal_information || {};
  const education = student?.educational_background || {};

  // SKELETON LOADING STATE WITH CIRCULAR SPINNER
  if (!student) {
    return (
      <main className="profile-page">
        <h2 className="page-title">Student Profile</h2>
        
        <div className="profile-loading-wrapper">
          <div className="profile-skeleton-sidebar">
            <div className="profile-spinner-box">
              <div className="profile-circular-spinner"></div>
            </div>
            <div className="profile-skeleton-line title"></div>
            <div className="profile-skeleton-line short"></div>
          </div>

          <div className="profile-skeleton-body">
            <div className="profile-skeleton-line header"></div>
            <div className="profile-skeleton-grid">
              <div className="profile-skeleton-line full"></div>
              <div className="profile-skeleton-line full"></div>
              <div className="profile-skeleton-line full"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const currentAvatarUrl = student.avatar_url
    ? `http://127.0.0.1:8000${student.avatar_url}?t=${Date.now()}`
    : null;

  let modalAvatarPreview = currentAvatarUrl;
  if (isRemoving) {
    modalAvatarPreview = null;
  } else if (tempPreview) {
    modalAvatarPreview = tempPreview;
  }

  return (
    <main className="profile-page">
      <h2 className="page-title reveal-on-scroll">Student Profile</h2>
      <br />

      <div className="profile-shell">
        <aside className="profile-sidebar reveal-on-scroll">
          <div className="sidebar-top">
            <div className="avatar-wrapper">
              <div className="avatar">
                {currentAvatarUrl ? (
                  <img src={currentAvatarUrl} alt="Student Avatar" className="avatar-img" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M12 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4"
                    />
                  </svg>
                )}
              </div>

              <button 
                className="edit-avatar" 
                type="button" 
                onClick={handleOpenAvatarModal}
                title="Edit Profile Picture"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            </div>

            <div className="student-name">
              {student.last_name}, {student.first_name} {student.middle_initial}. 
              <span className="profile-year-level">
                (BSIT {student.year_level ? student.year_level.match(/\d+/)?.[0] || "" : ""}{student.section || "A"})
              </span>
            </div>

            {/* Student Number & Academic Status Side-by-Side */}
            <div className="student-credentials-row">
              <span className="student-number">Student no: {student.student_number}</span>
              <span className={`status-pill ${student.status?.toLowerCase() === "irregular" ? "irregular" : "regular"}`}>
                {student.status || "Regular"}
              </span>
            </div>

            <div className="profile-menu">
              <button
                className={`menu-item ${activeTab === "personal" ? "active" : ""}`}
                onClick={() => setActiveTab("personal")}
                type="button"
              >
                Personal Information
              </button>

              <button
                className={`menu-item ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
                type="button"
              >
                Security Settings
              </button>
            </div>
          </div>

          <button
            className="logout-btn"
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
          >
            Log out
          </button>
        </aside>

        <section className="profile-content">
          {activeTab === "personal" && (
            <>
              <h3 className="section-title reveal-on-scroll">Personal Information (Read-Only)</h3>

              <div className="form-section reveal-on-scroll delay-1">
                <div className="form-section-title">Personal Records</div>

                {/* Row 1: Name, Contact No, Civil Status */}
                <div className="row-3">
                  <div className="input-group">
                    <label className="input-label">Name (PRINT)</label>
                    <input className="ro-input" disabled value={personal.student_name || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Contact No.</label>
                    <input className="ro-input" disabled value={personal.contact_no || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Civil Status</label>
                    <input className="ro-input" disabled value={personal.civil_status || "Single"} />
                  </div>
                </div>

                {/* Row 2: Permanent Address (Full Width) */}
                <div className="row-1">
                  <div className="input-group">
                    <label className="input-label">Permanent Address</label>
                    <input className="ro-input" disabled value={personal.home_address || ""} />
                  </div>
                </div>

                {/* Row 3: Present Address (Full Width, Stacked Below Permanent) */}
                <div className="row-1">
                  <div className="input-group">
                    <label className="input-label">Present Address</label>
                    <input className="ro-input" disabled value={personal.boarding_house_address || ""} />
                  </div>
                </div>

                {/* Row 4: Age, Religion, Nationality */}
                <div className="row-3">
                  <div className="input-group">
                    <label className="input-label">Age</label>
                    <input className="ro-input" disabled value={personal.age || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Religion</label>
                    <input className="ro-input" disabled value={personal.religion || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Nationality</label>
                    <input className="ro-input" disabled value={personal.nationality || ""} />
                  </div>
                </div>

                {/* Row 5: Date of Birth, Place of Birth */}
                <div className="row-2-even">
                  <div className="input-group">
                    <label className="input-label">Date of Birth (mm/dd/yy)</label>
                    <input className="ro-input" disabled value={personal.date_of_birth || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Place of Birth</label>
                    <input className="ro-input" disabled value={personal.place_of_birth || ""} />
                  </div>
                </div>

                {/* Row 6: Father's Details */}
                <div className="row-3">
                  <div className="input-group">
                    <label className="input-label">Father's Name</label>
                    <input className="ro-input" disabled value={personal.father_name || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Occupation</label>
                    <input className="ro-input" disabled value={personal.father_occupation || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Tel. No.</label>
                    <input className="ro-input" disabled value={personal.father_tel_no || ""} />
                  </div>
                </div>

                {/* Row 7: Mother's Details */}
                <div className="row-3">
                  <div className="input-group">
                    <label className="input-label">Mother's Maiden Name</label>
                    <input className="ro-input" disabled value={personal.mother_name || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Occupation</label>
                    <input className="ro-input" disabled value={personal.mother_occupation || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Tel. No.</label>
                    <input className="ro-input" disabled value={personal.mother_tel_no || ""} />
                  </div>
                </div>

                {/* Row 8: Guardian Details */}
                <div className="row-2-even">
                  <div className="input-group">
                    <label className="input-label">Guardian</label>
                    <input className="ro-input" disabled value={personal.guardian || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Relation to Guardian</label>
                    <input className="ro-input" disabled value={personal.relation_to_guardian || ""} />
                  </div>
                </div>

                {/* Row 9: Guardian Address & Tel */}
                <div className="row-2">
                  <div className="input-group">
                    <label className="input-label">Guardian's Address</label>
                    <input className="ro-input" disabled value={personal.guardian_address || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Tel. No.</label>
                    <input className="ro-input" disabled value={personal.guardian_tel_no || ""} />
                  </div>
                </div>
              </div>

              <div className="form-section reveal-on-scroll delay-2">
                <div className="form-section-title">Educational Background</div>

                <div className="row-3-edu">
                  <div className="input-group">
                    <label className="input-label">Elementary School</label>
                    <input className="ro-input" disabled value={education.elementary_school || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Location</label>
                    <input className="ro-input" disabled value={education.elementary_location || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Date Graduated</label>
                    <input className="ro-input" disabled value={education.elementary_graduated || ""} />
                  </div>
                </div>

                <div className="row-3-edu">
                  <div className="input-group">
                    <label className="input-label">High School</label>
                    <input className="ro-input" disabled value={education.high_school || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Location</label>
                    <input className="ro-input" disabled value={education.high_school_location || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Date Graduated</label>
                    <input className="ro-input" disabled value={education.high_school_graduated || ""} />
                  </div>
                </div>

                <div className="row-3-edu">
                  <div className="input-group">
                    <label className="input-label">Senior High School</label>
                    <input className="ro-input" disabled value={education.senior_high_school || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Location</label>
                    <input className="ro-input" disabled value={education.senior_high_location || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Date Graduated</label>
                    <input className="ro-input" disabled value={education.senior_high_graduated || ""} />
                  </div>
                </div>

                <div className="row-3-edu">
                  <div className="input-group">
                    <label className="input-label">University / College</label>
                    <input className="ro-input" disabled value={education.college || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Location</label>
                    <input className="ro-input" disabled value={education.college_location || ""} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Date Graduated</label>
                    <input className="ro-input" disabled value={education.college_graduated || ""} />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "settings" && <Settings />}
        </section>
      </div>

      {/* AVATAR EDIT MODAL */}
      {showAvatarModal && (
        <div className="avatar-modal-overlay" onClick={handleCloseAvatarModal}>
          <div className="avatar-modal" onClick={(e) => e.stopPropagation()}>
            {isSaving ? (
              <div className="modal-loading-screen">
                <div className="portal-spinner"></div>
                <p>Applying profile updates...</p>
              </div>
            ) : (
              <>
                <button className="close-corner-btn" onClick={handleCloseAvatarModal}>×</button>
                <h3>Edit Profile Picture</h3>
                
                <div className="modal-preview-wrapper">
                  {isCroppingMode && tempPreview ? (
                    <div className="cropper-container">
                      <Cropper
                        image={tempPreview}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                      />
                    </div>
                  ) : (
                    <div className="modal-avatar-preview">
                      {modalAvatarPreview ? (
                        <img src={modalAvatarPreview} alt="Preview" className="avatar-img" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="currentColor"
                            d="M12 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4"
                          />
                        </svg>
                      )}
                    </div>
                  )}
                </div>

                {isCroppingMode && tempPreview && (
                  <div className="cropper-zoom-slider">
                    <span>Zoom:</span>
                    <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.1}
                      aria-label="Zoom"
                      onChange={(e) => setZoom(Number(e.target.value))}
                    />
                  </div>
                )}

                <div className="avatar-modal-actions">
                  <button 
                    type="button" 
                    className="modal-action-btn primary-action" 
                    onClick={handleTriggerFileSelect}
                  >
                    {modalAvatarPreview ? "Change Photo" : "Upload from Device"}
                  </button>

                  {modalAvatarPreview && (
                    <button 
                      type="button" 
                      className="modal-action-btn danger-action" 
                      onClick={handleMarkForRemoval}
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handleFileChange}
                />

                <div className="avatar-modal-footer">
                  <button className="modal-cancel-btn" onClick={handleCloseAvatarModal}>
                    Cancel
                  </button>
                  <button 
                    className="modal-save-btn" 
                    onClick={handleSaveAvatar}
                    disabled={tempFile === null && !isRemoving}
                  >
                    Save Changes
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            {isLoggingOut ? (
              <div className="nav-logout-loading-wrapper">
                <div className="nav-portal-spinner"></div>
                <h3 style={{ marginTop: "20px" }}>Logging Out...</h3>
                <p style={{ margin: "10px 0 0", color: "#6b7280" }}>Disconnecting from your student account..</p>
              </div>
            ) : (
              <>
                <h3>Log out</h3>
                <p>Are you sure you want to log out?</p>
                <div className="logout-modal-buttons">
                  <button
                    className="cancel-btn"
                    type="button"
                    onClick={() => setShowLogoutConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="confirm-btn"
                    type="button"
                    onClick={handleLogoutSubmit}
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}