import { useState, useEffect, useRef } from "react";
import "../Stylesheets/Settings.css";
import Modal from "./Modal.jsx";
import { API_BASE_URL } from "../api/axios";

export default function Settings() {
  const [form, setForm] = useState({
    email: "",
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [initialForm, setInitialForm] = useState(form);
  const [isChanged, setIsChanged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailModalMode, setEmailModalMode] = useState("password");
  const [emailConfirmPassword, setEmailConfirmPassword] = useState("");
  const [showConfirmEmailPass, setShowConfirmEmailPass] = useState(false);
  const [otpInput, setOtpInput] = useState("");

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("Success");
  const [modalDesc, setModalDesc] = useState("Changes applied successfully.");
  const [isError, setIsError] = useState(false);
  const [shouldReloadOnClose, setShouldReloadOnClose] = useState(false);

  const emailInputRef = useRef(null);

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
  }, []);

  useEffect(() => {
    const fetchCurrentEmail = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/api/student/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const baseForm = {
            email: data.email || "",
            oldPassword: "",
            newPassword: "",
            confirmPassword: "",
          };
          setForm(baseForm);
          setInitialForm(baseForm);
        }
      } catch (err) {
        console.error("Failed to load initial settings profile state.", err);
      }
    };
    fetchCurrentEmail();
  }, []);

  useEffect(() => {
    const changed = JSON.stringify(form) !== JSON.stringify(initialForm);
    setIsChanged(changed);
  }, [form, initialForm]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const triggerNotification = (title, message, errorFlag = false, autoReload = false) => {
    setModalTitle(title);
    setModalDesc(message);
    setIsError(errorFlag);
    setShouldReloadOnClose(autoReload);
    setShowSuccessModal(true);
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);

    if (isError && modalTitle === "Invalid Format") {
      setForm((prev) => ({ ...prev, email: "" }));

      setTimeout(() => {
        if (emailInputRef.current) {
          emailInputRef.current.focus();
        }
      }, 50);
      return;
    }

    if (shouldReloadOnClose) {
      window.location.reload();
    }
  };

  const handleSaveClick = () => {
    const token = localStorage.getItem("token");

    if (!form.email.trim()) {
      triggerNotification("Validation Error", "Email field cannot be empty.", true, false);
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const trimmedEmail = form.email.trim();

    if (!emailRegex.test(trimmedEmail)) {
      triggerNotification(
        "Invalid Format",
        "Please provide a valid email address structure (e.g., username@email.com).",
        true,
        false
      );
      return;
    }

    if (form.oldPassword || form.newPassword || form.confirmPassword) {
      if (!form.oldPassword) {
        triggerNotification("Authorization Required", "Please enter your old password to authorize this change.", true, false);
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        triggerNotification("Password Mismatch", "New passwords do not match!", true, false);
        return;
      }
      if (form.newPassword.length < 6) {
        triggerNotification("Security Notice", "Your new password must be at least 6 characters long.", true, false);
        return;
      }

      handleSavePasswordUpdate(token);
      return;
    }

    if (form.email !== initialForm.email) {
      setEmailConfirmPassword("");
      setOtpInput("");
      setEmailModalMode("password");
      setShowEmailModal(true);
      return;
    }
  };

  const handleSavePasswordUpdate = async (token) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/student/profile/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: form.oldPassword,
          new_password: form.newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        triggerNotification("Update Failed", data.detail || "Failed to change password.", true, false);
        setIsSubmitting(false);
        return;
      }

      const resetForm = { ...form, oldPassword: "", newPassword: "", confirmPassword: "" };
      setForm(resetForm);
      setInitialForm(resetForm);
      triggerNotification("Password Updated!", "Your login credentials have been modified.", false, true);
    } catch (error) {
      triggerNotification("Network Error", "Cannot connect to backend server.", true, false);
      setIsSubmitting(false);
    }
  };

  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    if (!emailConfirmPassword.trim()) {
      alert("Please enter your current password.");
      return;
    }

    const token = localStorage.getItem("token");
    setEmailModalMode("loadingPassword");

    try {
      const passRes = await fetch(`${API_BASE_URL}/api/student/profile/verify-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: emailConfirmPassword.trim() }),
      });

      const passData = await passRes.json();
      if (!passRes.ok) {
        setEmailModalMode("password");
        alert(passData.detail || "Incorrect password provided.");
        return;
      }

      const otpRes = await fetch(`${API_BASE_URL}/api/student/profile/send-email-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_email: form.email.trim() }),
      });

      const otpData = await otpRes.json();
      if (!otpRes.ok) {
        setEmailModalMode("password");
        alert(otpData.detail || "Failed to send OTP email.");
        return;
      }

      setEmailModalMode("otp");
    } catch (error) {
      setEmailModalMode("password");
      alert("Cannot connect to server to send OTP.");
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpInput.trim()) {
      alert("Please enter the verification code.");
      return;
    }

    const token = localStorage.getItem("token");
    setEmailModalMode("loadingOtp");

    try {
      const response = await fetch(`${API_BASE_URL}/api/student/profile/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: form.email.trim(),
          otp: otpInput.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEmailModalMode("otpInvalid");
        return;
      }

      setEmailModalMode("success");
    } catch (error) {
      setShowEmailModal(false);
      triggerNotification("Network Error", "Cannot sync modifications to database server.", true, false);
    }
  };

  const handleResendOtp = async () => {
    const token = localStorage.getItem("token");
    setEmailModalMode("loadingPassword");
    setOtpInput("");

    try {
      const otpRes = await fetch(`${API_BASE_URL}/api/student/profile/send-email-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_email: form.email.trim() }),
      });

      if (!otpRes.ok) {
        const otpData = await otpRes.json();
        alert(otpData.detail || "Failed to resend OTP email.");
        setEmailModalMode("otp");
        return;
      }

      setEmailModalMode("otp");
    } catch (error) {
      alert("Cannot connect to server to resend OTP.");
      setEmailModalMode("otp");
    }
  };

  const handleCloseEmailModal = () => {
    setShowEmailModal(false);
    setEmailConfirmPassword("");
    setOtpInput("");
    setEmailModalMode("password");
  };

  const handleFinishEmailUpdate = () => {
    setShowEmailModal(false);
    window.location.reload();
  };

  return (
    <div className="settings-wrapper">
      <h3 className="section-title reveal-on-scroll">Security Settings</h3>

      <div className="form-section reveal-on-scroll delay-1">
        <label className="section-sub-title">Personal Contact Information</label>
        <span className="section-instruction-red"></span>
        <div className="row-1">
          <div className="input-group">
            <span className="input-label">Email Address</span>
            <input
              ref={emailInputRef}
              name="email"
              placeholder="Enter Email Address (e.g., username@email.com)"
              value={form.email}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <div className="form-section reveal-on-scroll delay-2">
        <label className="section-sub-title">Password</label>

        <div className="row-1">
          <div className="input-group password-field">
            <span className="input-label">Old Password</span>
            <div className="password-input-wrapper">
              <input type={showOld ? "text" : "password"} name="oldPassword" placeholder="Enter Old Password" value={form.oldPassword} onChange={handleChange} />
              <button type="button" className="toggle-password-txt" onClick={() => setShowOld(!showOld)}>
                {showOld ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>
        </div>

        <div className="row-2-even">
          <div className="input-group password-field">
            <span className="input-label">New Password</span>
            <div className="password-input-wrapper">
              <input type={showNew ? "text" : "password"} name="newPassword" placeholder="Enter New Password" value={form.newPassword} onChange={handleChange} />
              <button type="button" className="toggle-password-txt" onClick={() => setShowNew(!showNew)}>
                {showNew ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>
          <div className="input-group password-field">
            <span className="input-label">Re-enter New Password</span>
            <div className="password-input-wrapper">
              <input type={showConfirm ? "text" : "password"} name="confirmPassword" placeholder="Re-enter New Password" value={form.confirmPassword} onChange={handleChange} />
              <button type="button" className="toggle-password-txt" onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="save-container reveal-on-scroll delay-3">
        <button
          className={`save-btn ${isChanged && !isSubmitting ? "active" : ""}`}
          onClick={handleSaveClick}
          disabled={!isChanged || isSubmitting}
          style={{ opacity: isSubmitting ? 0.6 : 1, cursor: (!isChanged || isSubmitting) ? "not-allowed" : "pointer" }}
        >
          {isSubmitting ? "Saving..." : "Save settings"}
        </button>
      </div>

      <Modal
        isOpen={showEmailModal}
        onClose={handleCloseEmailModal}
        ariaLabel="Email Change Verification"
      >
        <div className="auth">
          {emailModalMode === "password" && (
            <>
              <h2 className="authTitle">Confirm Password</h2>
              <p className="authSubtitle">
                Please enter your current password to authorize changing your email address.
              </p>

              <form className="authForm" onSubmit={handleVerifyPassword}>
                <div className="password-input-wrapper">
                  <input
                    className="authInput"
                    type={showConfirmEmailPass ? "text" : "password"}
                    placeholder="Enter Password"
                    required
                    value={emailConfirmPassword}
                    onChange={(e) => setEmailConfirmPassword(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="toggle-password-txt"
                    onClick={() => setShowConfirmEmailPass(!showConfirmEmailPass)}
                  >
                    {showConfirmEmailPass ? "HIDE" : "SHOW"}
                  </button>
                </div>

                <button className="authPrimary" type="submit">
                  Next
                </button>
              </form>
            </>
          )}

          {emailModalMode === "loadingPassword" && (
            <div className="loginLoading">
              <div className="loginSpinner"></div>
              <h2>Verifying Password...</h2>
              <p>Sending OTP verification code to {form.email}.</p>
            </div>
          )}

          {emailModalMode === "otp" && (
            <>
              <h2 className="authTitle">Enter Verification Code</h2>
              <p className="authSubtitle">
                An OTP verification code was sent to <strong>{form.email}</strong>
              </p>
              <form className="authForm" onSubmit={handleVerifyOtp}>
                <input
                  className="authInput text-center"
                  type="text"
                  maxLength="6"
                  placeholder="XXXXXX"
                  required
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  autoFocus
                />

                <div style={{ textAlign: "center", margin: "-8px 0 16px" }}>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>Didn't receive the code? </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2e522a",
                      fontWeight: "600",
                      fontSize: "13px",
                      cursor: "pointer",
                      padding: "0",
                      textDecoration: "underline",
                    }}
                  >
                    Resend OTP
                  </button>
                </div>

                <div className="recovery-actions-row">
                  <button
                    type="button"
                    className="authSecondary-btn"
                    onClick={() => {
                      setOtpInput("");
                      setEmailModalMode("password");
                    }}
                  >
                    Back
                  </button>
                  <button type="submit" className="authPrimary-btn">
                    Verify OTP
                  </button>
                </div>
              </form>
            </>
          )}

          {emailModalMode === "otpInvalid" && (
            <div className="loginLoading">
              <div className="success-checkmark-icon-wrapper" style={{ backgroundColor: "#fef2f2" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <h2 style={{ marginTop: "16px", marginBottom: "4px" }}>Invalid Verification Code</h2>
              <p style={{ marginBottom: "24px", textAlign: "center", color: "#64748b" }}>
                The OTP code you provided does not match our parameters. Please try again.
              </p>
              <button
                type="button"
                className="authSecondary-btn"
                onClick={() => {
                  setOtpInput("");
                  setEmailModalMode("otp");
                }}
                style={{ maxWidth: "240px" }}
              >
                Re-enter Code
              </button>
            </div>
          )}

          {emailModalMode === "loadingOtp" && (
            <div className="loginLoading">
              <div className="loginSpinner"></div>
              <h2>Updating Email Address...</h2>
              <p>Syncing your new email address into your student profile records.</p>
            </div>
          )}

          {emailModalMode === "success" && (
            <div className="loginLoading">
              <div className="success-checkmark-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#2e522a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h2 style={{ marginTop: "16px", marginBottom: "4px" }}>Email Address Updated!</h2>
              <p style={{ marginBottom: "24px", textAlign: "center" }}>
                Your email contact record has been modified to <strong>{form.email}</strong>.
              </p>

              <button
                type="button"
                className="authPrimary"
                onClick={handleFinishEmailUpdate}
                style={{ maxWidth: "240px" }}
              >
                Back to Profile
              </button>
            </div>
          )}
        </div>
      </Modal>

      {showSuccessModal && (
        <div className="settings-modal-overlay">
          <div className="settings-modal-card">
            <div className={`success-checkmark-icon ${isError ? "error-alert-badge" : ""}`}>
              {isError ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2e522a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
            <h3>{modalTitle}</h3>
            <p>{modalDesc}</p>

            <div className="modal-btn-container">
              <button
                type="button"
                className={`modal-confirm-btn ${isError ? "error-btn-variant" : ""}`}
                onClick={handleModalClose}
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}