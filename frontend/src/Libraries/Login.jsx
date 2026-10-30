import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../Stylesheets/Login.css";
import { API_BASE_URL } from "../axios";

function Login({ onLoginSuccess }) {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const [authMode, setAuthMode] = useState("login");
  const [recoveryEmail, setRecoveryEmail] = useState(""); 
  const [targetStudentNumber, setTargetStudentNumber] = useState(""); 
  const [otpInput, setOtpInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const studentNumber = username.trim();
    const studentPassword = password.trim();

    if (!studentNumber || !studentPassword) {
      alert("Please enter your student number and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_number: studentNumber,
          password: studentPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLoading(false);
        setAuthMode("loginInvalid");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("student_number", data.student_number);
      localStorage.setItem("first_name", data.first_name);
      localStorage.setItem("last_name", data.last_name);

      setLoading(false);
      setLoginSuccess(true);

      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
        navigate("/");
        window.location.reload();
      }, 3500);

    } catch (error) {
      setLoading(false);
      alert("Cannot connect to backend.");
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    const emailToVerify = recoveryEmail.trim();

    if (!emailToVerify) {
      alert("Please enter your registered Email Address or Student Number.");
      return;
    }

    setAuthMode("loadingToOtp");

    try {
      const response = await fetch(`${API_BASE_URL}/api/student/forgot-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: emailToVerify }),
      });

      const data = await response.json();

      if (!response.ok) {
        setTimeout(() => {
          setAuthMode("emailNotFound");
        }, 1000);
        return;
      }

      setTargetStudentNumber(data.student_number);
      
      setTimeout(() => {
        setAuthMode("emailConfirmed");
      }, 1000);

    } catch (error) {
      setAuthMode("forgot");
      alert("Cannot connect to backend verification services.");
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otpInput.trim();

    if (code.length !== 6) {
      alert("Please enter a valid 6-digit OTP code.");
      return;
    }

    setAuthMode("loadingToReset");

    try {
      const response = await fetch(`${API_BASE_URL}/api/student/forgot-password/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_number: targetStudentNumber,
          otp: code,
        }),
      });

      if (!response.ok) {
        setAuthMode("otpInvalid");
        return;
      }

      setTimeout(() => {
        setAuthMode("reset");
      }, 1000);

    } catch (error) {
      setAuthMode("otp");
      alert("Verification server unavailable.");
    }
  };

  const handleResendOtp = async () => {
    setAuthMode("loadingToOtp");
    setOtpInput("");

    try {
      await fetch(`${API_BASE_URL}/api/student/forgot-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: recoveryEmail.trim() }),
      });

      setTimeout(() => {
        setAuthMode("otp");
      }, 1000);
    } catch (error) {
      setAuthMode("otp");
      alert("Failed to resend OTP verification code.");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (newPassword.length < 6) {
      alert("Your password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/student/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_number: targetStudentNumber,
          otp: otpInput.trim(),
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLoading(false);
        alert(data.detail || "Failed to commit credential changes.");
        return;
      }

      setLoading(false);
      setAuthMode("loadingToSuccess");

      setTimeout(() => {
        setAuthMode("recovered");
      }, 1800);

    } catch (error) {
      setLoading(false);
      alert("Cannot connect to server to update credentials.");
    }
  };

  const resetRecoveryFlowToLogin = () => {
    setRecoveryEmail("");
    setTargetStudentNumber("");
    setOtpInput("");
    setNewPassword("");
    setConfirmPassword("");
    setAuthMode("login");
  };

  return (
    <div className="auth">
      {loginSuccess && (
        <div className="loginLoading">
          <div className="loginSpinner"></div>
          <h2>Logging In...</h2>
          <p>Please wait while we prepare your dashboard.</p>
        </div>
      )}

      {!loginSuccess && authMode === "login" && (
        <>
          <h2 className="authTitle">Student Portal Login</h2>
          <p className="authSubtitle">
            Please sign in using your registered username and password to continue.
          </p>

          <form className="authForm" onSubmit={handleLoginSubmit}>
            <input
              className="authInput"
              type="text"
              placeholder="Student Number"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />

            <div className="password-input-wrapper">
              <input
                className="authInput"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button 
                type="button" 
                className="toggle-password-txt" 
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>

            <div className="login-options-row">
              <label className="authTerms">
                <input type="checkbox" disabled={loading} />
                <span>Remember me</span>
              </label>
              <button 
                type="button" 
                className="forgot-password-link"
                onClick={() => setAuthMode("forgot")}
              >
                Forgot Password?
              </button>
            </div>

            <button className="authPrimary" type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Login"}
            </button>
          </form>
        </>
      )}

      {!loginSuccess && authMode === "loginInvalid" && (
        <div className="loginLoading">
          <div className="success-checkmark-icon-wrapper" style={{ backgroundColor: "#fef2f2" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 style={{ marginTop: "16px", marginBottom: "4px" }}>Login Failed</h2>
          <p style={{ marginBottom: "24px", textAlign: "center", color: "#64748b" }}>
            Invalid student number or password. Please verify your credentials and try again.
          </p>
          <button 
            type="button" 
            className="authSecondary-btn" 
            onClick={() => setAuthMode("login")}
            style={{ maxWidth: "240px" }}
          >
            Try Again
          </button>
        </div>
      )}

      {!loginSuccess && authMode === "forgot" && (
        <>
          <h2 className="authTitle">Account Recovery</h2>
          <p className="authSubtitle">Enter your registered Email Address or Student Number to verify account credentials.</p>
          <form className="authForm" onSubmit={handleRequestOtp}>
            <input
              className="authInput"
              type="text"
              placeholder="Enter Email Address or Student Number"
              required
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
            />
            <div className="recovery-actions-row">
              <button type="button" className="authSecondary-btn" onClick={() => setAuthMode("login")}>
                Back to Login
              </button>
              <button type="submit" className="authPrimary-btn">
                Verify Account
              </button>
            </div>
          </form>
        </>
      )}

      {!loginSuccess && authMode === "loadingToOtp" && (
        <div className="loginLoading">
          <div className="loginSpinner"></div>
          <h2>Verifying Account...</h2>
          <p>Checking student database registries for matching security configurations.</p>
        </div>
      )}

      {!loginSuccess && authMode === "emailConfirmed" && (
        <div className="loginLoading">
          <div className="success-checkmark-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#2e522a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 style={{ marginTop: "16px", marginBottom: "4px" }}>Account Verified!</h2>
          <p style={{ marginBottom: "24px", textAlign: "center" }}>
            An OTP verification code has been successfully dispatched to your registered email address.
          </p>
          <button 
            type="button" 
            className="authPrimary" 
            onClick={() => {
              setOtpInput(""); 
              setAuthMode("otp");
            }}
            style={{ maxWidth: "240px" }}
          >
            Next
          </button>
        </div>
      )}

      {!loginSuccess && authMode === "emailNotFound" && (
        <div className="loginLoading">
          <div className="success-checkmark-icon-wrapper" style={{ backgroundColor: "#fef2f2" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 style={{ marginTop: "16px", marginBottom: "4px" }}>Account Not Found</h2>
          <p style={{ marginBottom: "24px", textAlign: "center", color: "#64748b" }}>
            The identifier <strong>{recoveryEmail}</strong> is not registered to any student account in our records system.
          </p>
          <button 
            type="button" 
            className="authSecondary-btn" 
            onClick={() => setAuthMode("forgot")}
            style={{ maxWidth: "240px" }}
          >
            Try Again
          </button>
        </div>
      )}

      {!loginSuccess && authMode === "otp" && (
        <>
          <h2 className="authTitle">Enter Verification Code</h2>
          <p className="authSubtitle">
            An OTP code was sent to your registered email address.
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
                  textDecoration: "underline"
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
                  setAuthMode("forgot");
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

      {!loginSuccess && authMode === "otpInvalid" && (
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
            The OTP code you provided does not match our validation parameters. Please double check and try again.
          </p>
          <button 
            type="button" 
            className="authSecondary-btn" 
            onClick={() => {
              setOtpInput(""); 
              setAuthMode("otp");
            }}
            style={{ maxWidth: "240px" }}
          >
            Re-enter Code
          </button>
        </div>
      )}

      {!loginSuccess && authMode === "loadingToReset" && (
        <div className="loginLoading">
          <div className="loginSpinner"></div>
          <h2>Verifying Code...</h2>
          <p>Please wait while we initialize the secure tracking gateway reset.</p>
        </div>
      )}

      {!loginSuccess && authMode === "reset" && (
        <>
          <h2 className="authTitle">Reset Password</h2>
          <p className="authSubtitle">Your configuration identity has been verified. Create your new secure password access token below.</p>
          <form className="authForm" onSubmit={handleResetPassword}>
            <div className="password-input-wrapper">
              <input
                className="authInput"
                type={showNewPass ? "text" : "password"}
                placeholder="Enter New Password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button type="button" className="toggle-password-txt" onClick={() => setShowNewPass(!showNewPass)}>
                {showNewPass ? "HIDE" : "SHOW"}
              </button>
            </div>

            <div className="password-input-wrapper">
              <input
                className="authInput"
                type={showConfirmPass ? "text" : "password"}
                placeholder="Re-enter New Password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button type="button" className="toggle-password-txt" onClick={() => setShowConfirmPass(!showConfirmPass)}>
                {showConfirmPass ? "HIDE" : "SHOW"}
              </button>
            </div>

            <button type="submit" className="authPrimary">
              Confirm New Password
            </button>
          </form>
        </>
      )}

      {!loginSuccess && authMode === "loadingToSuccess" && (
        <div className="loginLoading">
          <div className="loginSpinner"></div>
          <h2>Updating Credentials...</h2>
          <p>Encrypting security tokens and deploying account updates into database system clusters.</p>
        </div>
      )}

      {!loginSuccess && authMode === "recovered" && (
        <div className="loginLoading">
          <div className="success-checkmark-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#2e522a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 style={{ marginTop: "16px", marginBottom: "4px" }}>Password Changed!</h2>
          <p style={{ marginBottom: "24px", textAlign: "center" }}>Your security changes have been committed cleanly into the database records configuration tracker bundle.</p>
          
          <button 
            type="button" 
            className="authPrimary" 
            onClick={resetRecoveryFlowToLogin}
            style={{ maxWidth: "240px" }}
          >
            Back to Login
          </button>
        </div>
      )}
    </div>
  );
}

export default Login;