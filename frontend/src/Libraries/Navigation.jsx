import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "../Stylesheets/Navigation.css";
import iitiLogo from "../assets/iitilogo.png";
import { API_BASE_URL } from "../api/axios";

function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showNavLogoutConfirm, setShowNavLogoutConfirm] = useState(false); 
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isLoggedIn = !!localStorage.getItem("token");
  const [notifications, setNotifications] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(null); 
  const [studentInfo, setStudentInfo] = useState(null);

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const navListRef = useRef(null);

  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const closeMenu = () => setIsMenuOpen(false);
  const openMenu = () => setIsMenuOpen(true);

  const toggleNotif = (e) => {
    e.stopPropagation();
    setIsProfileOpen(false);
    setIsNotifOpen((v) => !v);
  };
  const closeNotif = () => setIsNotifOpen(false);

  const toggleProfile = (e) => {
    e.stopPropagation();
    setIsNotifOpen(false);
    setIsProfileOpen((v) => !v);
  };
  const closeProfile = () => setIsProfileOpen(false);

  const triggerLogoutModal = () => {
    setIsProfileOpen(false);
    setShowNavLogoutConfirm(true); 
  };

  const handleLogoutSubmit = () => {
    setIsLoggingOut(true);

    setTimeout(() => {
      localStorage.clear();
      window.location.href = "/";
    }, 2000);
  };

  const navigateToProfileTab = (tabName) => {
    setIsProfileOpen(false);
    
    if (location.pathname === "/Profile") {
      window.dispatchEvent(new CustomEvent("tabSwitch", { detail: { tab: tabName } }));
    } else {
      navigate("/Profile", { state: { defaultTab: tabName } });
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!isLoggedIn) return;

    let isMounted = true;

    const fetchHeaderData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const notifRes = await fetch(`${API_BASE_URL}/api/student/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (notifRes.ok && isMounted) {
          const data = await notifRes.json();
          const incoming = data.notifications || [];
          setNotifications((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(incoming)) {
              return incoming;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Failed to sync notifications.", err);
      }

      try {
        const profileRes = await fetch(`${API_BASE_URL}/api/student/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (profileRes.ok && isMounted) {
          const data = await profileRes.json();
          setStudentInfo(data);

          if (data.avatar_url) {
            const fullUrl = `${API_BASE_URL}${data.avatar_url}`;
            setAvatarUrl((prev) => (prev?.split("?")[0] === fullUrl ? prev : fullUrl));
          } else {
            setAvatarUrl(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch header avatar snapshot.", err);
      }
    };

    fetchHeaderData();

    const interval = setInterval(() => {
      if (!isNotifOpen) {
        fetchHeaderData();
      }
    }, 5000);

    const handleAvatarUpdate = () => fetchHeaderData();
    window.addEventListener("layoutAdjust", handleAvatarUpdate);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("layoutAdjust", handleAvatarUpdate);
    };
  }, [isLoggedIn, isNotifOpen]);

  const markAllAsRead = async (e) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await fetch(`${API_BASE_URL}/api/student/notifications/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Error updating notifications status in database.", err);
    }
  };

  const handleNotificationClick = async (notif) => {
    const targetRoute = notif.link || "/Records_request";
    const notifId = String(notif.id);

    setNotifications((prev) =>
      prev.map((n) => (String(n.id) === notifId ? { ...n, read: true } : n))
    );
    setIsNotifOpen(false);

    if (!notif.read) {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_BASE_URL}/api/student/notifications/read/${notifId}${notifId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.notifications) {
            setNotifications(data.notifications);
          }
        }
      } catch (err) {
        console.error("Failed to mark single notification as read:", err);
      }
    }

    if (location.pathname !== targetRoute) {
      navigate(targetRoute);
    }
  };

  useEffect(() => {
    const updateIndicator = () => {
      if (!navListRef.current) return;

      const activeElement = navListRef.current.querySelector(".nav-item.active");

      if (activeElement) {
        const { offsetLeft, offsetWidth } = activeElement;
        const horizontalPadding = 8; 
        const textWidth = offsetWidth - (horizontalPadding * 2);
        const textOffsetLeft = offsetLeft + horizontalPadding;

        setIndicatorStyle({
          left: textOffsetLeft,
          width: textWidth,
          opacity: 1,
        });
      } else {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    const timer = setTimeout(updateIndicator, 50);
    window.addEventListener("resize", updateIndicator);
    window.addEventListener("layoutAdjust", updateIndicator);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateIndicator);
      window.removeEventListener("layoutAdjust", updateIndicator);
    };
  }, [location.pathname, isLoggedIn]); 

  useEffect(() => {
    if (!isLoggedIn) {
      setIsNotifOpen(false);
      setIsProfileOpen(false);
      setAvatarUrl(null);
      setStudentInfo(null);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isLoggingOut) return;
        closeMenu();
        closeNotif();
        closeProfile();
        setShowNavLogoutConfirm(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLoggingOut]);

  useEffect(() => {
    const onMouseDown = (e) => {
      if (isLoggingOut) return;
      
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        closeNotif();
      }
      
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        if (!e.target.closest(".profile-panel")) {
          closeProfile();
        }
      }
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [isLoggingOut]);

  const NotificationButton = () => (
    <div className="nav-actions" ref={notifRef}>
      <button
        className={`notif-btn ${isNotifOpen ? "active" : ""}`}
        aria-label="Notifications"
        aria-expanded={isNotifOpen}
        onClick={toggleNotif}
        type="button"
      >
        <span className="bell" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </span>
        {unreadCount > 0 && <span className="notif-badge" aria-hidden="true">{unreadCount}</span>}
      </button>

      {isNotifOpen && (
        <div className="notif-panel" role="dialog" aria-label="Notifications" onClick={(e) => e.stopPropagation()}>
          <div className="notif-header">
            <div className="notif-title-group">
              <span className="notif-title">Notifications</span>
              {unreadCount > 0 && <span className="notif-count-tag">{unreadCount} new</span>}
            </div>
            {unreadCount > 0 && (
              <button className="notif-mark" onClick={markAllAsRead} type="button">
                Mark all as read
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <p>All caught up! No notifications.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`notif-item ${n.read ? "read" : "unread"}`}
                  onClick={() => handleNotificationClick(n)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="notif-status-dot" />
                  <div className="notif-body">
                    <div className="notif-item-title">{n.title}</div>
                    <div className="notif-item-msg">{n.message}</div>
                    <div className="notif-item-meta">{n.meta}</div>
                    <div className="notif-time">{n.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  const ProfileDropdown = () => (
    <div className="profile-dropdown-wrapper" ref={profileRef}>
      <button 
        className={`nav-avatar-btn ${isProfileOpen || location.pathname === "/Profile" ? "active" : ""}`}
        onClick={toggleProfile}
        title="Account Options"
        type="button"
        aria-expanded={isProfileOpen}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="User Avatar" className="nav-avatar-img" />
        ) : (
          <div className="nav-avatar-fallback">
            <svg xmlns="http://www.w3.org/2000/svg" width="80%" height="80%" viewBox="0 0 24 24">
              <path d="M0 0h24v24H0z" fill="none" />
              <path fill="#fff" d="M12 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4" />
            </svg>
          </div>
        )}
      </button>

      {isProfileOpen && (
        <div className="profile-panel" role="dialog" aria-label="Account Settings" onClick={(e) => e.stopPropagation()}>
          <div className="profile-panel-header">
            <div className="profile-card-user">
              <div className="profile-card-avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Student Avatar" />
                ) : (
                  <div className="profile-card-avatar-fallback">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                )}
              </div>
              <div className="profile-card-details">
                <div className="profile-card-name-row">
                  <span className="profile-card-name">
                    {studentInfo ? `${studentInfo.last_name}, ${studentInfo.first_name}` : "Student Account"}
                  </span>
                  {studentInfo?.section && (
                    <span className="profile-card-section">
                      (BSIT {studentInfo.year_level ? studentInfo.year_level.match(/\d+/)?.[0] || "" : ""}{studentInfo.section})
                    </span>
                  )}
                </div>
                <div className="profile-card-sub">
                  <span>No: {studentInfo?.student_number || "N/A"}</span>
                  <span className={`status-pill ${studentInfo?.status?.toLowerCase() === "irregular" ? "irregular" : "regular"}`}>
                    {studentInfo?.status || "Regular"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="profile-panel-links">
            <button 
              type="button" 
              className="profile-panel-item" 
              onClick={() => navigateToProfileTab("personal")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Personal Information</span>
            </button>
            <button 
              type="button" 
              className="profile-panel-item" 
              onClick={() => navigateToProfileTab("settings")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>Security Settings</span>
            </button>
            <div className="profile-panel-divider" />
            <button 
              type="button" 
              className="profile-panel-item logout-shortcut" 
              onClick={triggerLogoutModal}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <nav className="navigation">
      <div className="mobile-nav">
        <button className="hamburger" aria-label="Open menu" onClick={openMenu} type="button">
          <span /><span /><span />
        </button>
        <div className="mobile-brand">
          <img src={iitiLogo} alt="IITI Logo" />
          <span>IITI Student Portal</span>
        </div>
        {isLoggedIn && (
          <div className="mobile-actions-wrapper">
            <NotificationButton />
            <ProfileDropdown />
          </div>
        )}
      </div>

      <div className="nav-row">
        <ul className="nav-list" ref={navListRef}>
          <li className="nav-list-item">
            <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>Home</NavLink>
          </li>
          <li className="nav-list-item">
            <NavLink to="/Class_schedule" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>Class Schedule</NavLink>
          </li>
          <li className="nav-list-item">
            <NavLink to="/Grades" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>Grades</NavLink>
          </li>
          <li className="nav-list-item">
            <NavLink to="/Title_audit" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>Title Audit</NavLink>
          </li>
          <li className="nav-list-item">
            <NavLink to="/Records_request" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>Records Request</NavLink>
          </li>
          {isLoggedIn ? (
            <li className="nav-list-item">
              <button className="disabled-nav-btn" disabled type="button">Evaluation</button>
            </li>
          ) : (
            <li className="nav-list-item">
              <a 
                href="https://btech-admission.vercel.app" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="nav-item"
              >
                Admission
              </a>
            </li>
          )}
          <div 
            className="nav-sliding-indicator" 
            style={{
              transform: `translateX(${indicatorStyle.left}px)`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity
            }}
          />
        </ul>
        
        {isLoggedIn && (
          <div className="desktop-only-wrapper">
            <NotificationButton />
            <ProfileDropdown />
          </div>
        )}
      </div>

      {isMenuOpen && (
        <div className="mobileMenuOverlay" onClick={closeMenu}>
          <aside className="mobileMenu" role="dialog" aria-modal="true" aria-label="Mobile menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobileMenuHeader">
              <div className="menuBrand">
                <img src={iitiLogo} alt="IITI Logo" />
                <div className="menuBrandText">
                  <div className="menuTitle">IITI Student Portal</div>
                  <div className="menuSubtitle">Navigation</div>
                </div>
              </div>
            </div>
            <div className="mobileMenuLinks">
              <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => `m-link ${isActive ? "active" : ""}`}>Home</NavLink>
              <NavLink to="/Class_schedule" onClick={closeMenu} className={({ isActive }) => `m-link ${isActive ? "active" : ""}`}>Class Schedule</NavLink>
              <NavLink to="/Grades" onClick={closeMenu} className={({ isActive }) => `m-link ${isActive ? "active" : ""}`}>Grades</NavLink>
              <NavLink to="/Title_audit" onClick={closeMenu} className={({ isActive }) => `m-link ${isActive ? "active" : ""}`}>Title Audit</NavLink>
              <NavLink to="/Records_request" onClick={closeMenu} className={({ isActive }) => `m-link ${isActive ? "active" : ""}`}>Records Request</NavLink>
              {isLoggedIn ? (
                <button className="disabled-nav-btn-mobile" disabled type="button">Evaluation</button>
              ) : (
                <a 
                  href="https://btech-admission.vercel.app" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={closeMenu} 
                  className="m-link"
                >
                  Admission
                </a>
              )}
            </div>
          </aside>
        </div>
      )}

      {showNavLogoutConfirm && (
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
                    onClick={() => setShowNavLogoutConfirm(false)}
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
    </nav>
  );
}

export default Navigation;