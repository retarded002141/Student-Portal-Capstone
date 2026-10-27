import { useEffect } from "react";
import "../Stylesheets/Modal.css";

export default function Modal({ isOpen, onClose, ariaLabel, children }) {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const onBackdrop = (e) => {
    if (e.target.classList.contains("modalOverlay")) onClose();
  };

  return (
    <div className="modalOverlay" onClick={onBackdrop}>
      <div className="modalCard" role="dialog" aria-modal="true" aria-label={ariaLabel}>
        <button className="modalClose" onClick={onClose} aria-label="Close">
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
