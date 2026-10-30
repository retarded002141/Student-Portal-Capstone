import React, { useEffect, useMemo, useState } from "react";
import "../Stylesheets/Announcements.css";
import { API_BASE_URL as BASE } from "../api/axios";

const API_BASE_URL = `${BASE}/api/student/announcements/all`;

function getObjectIdTimestamp(item) {
  const idStr = item?._id || item?.id || "";
  if (typeof idStr === "string" && idStr.length >= 8) {
    const timestampHex = idStr.substring(0, 8);
    const parsedSec = parseInt(timestampHex, 16);
    if (Number.isFinite(parsedSec) && parsedSec > 1000000000) {
      return parsedSec;
    }
  }
  return 0;
}

function sortByDateDesc(list) {
  return [...list].sort((a, b) => {
    let dateA = 0;
    let dateB = 0;

    if (a?.dateValue) {
      dateA = new Date(`${a.dateValue}T00:00:00`).getTime();
    } else if (a?.date) {
      dateA = Date.parse(a.date) || 0;
    }

    if (b?.dateValue) {
      dateB = new Date(`${b.dateValue}T00:00:00`).getTime();
    } else if (b?.date) {
      dateB = Date.parse(b.date) || 0;
    }

    if (dateA !== dateB) {
      return dateB - dateA;
    }

    const creationA = getObjectIdTimestamp(a);
    const creationB = getObjectIdTimestamp(b);

    return creationB - creationA;
  });
}

function ViewModal({ open, item, onClose }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !item) return null;

  return (
    <div
      className="annModalOverlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="annModal">
        <div className="annModalTop">
          <div className="annModalTitleWrap">
            <span className="annModalChip">Posted: {item.date}</span>
            <h2 className="annModalTitle">{item.title}</h2>
          </div>

          <button
            className="annModalClose"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {item.image && (
          <div className="annModalImage">
            <img src={item.image} alt={item.title} />
          </div>
        )}

        <div className="annModalBody">
          <p className="annModalDesc">{item.description}</p>
        </div>
      </div>
    </div>
  );
}

function AnnouncementCarousel({ items, loading, onOpen }) {
  const [index, setIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setVisibleCards(1);
        setIndex(0);
      } else if (window.innerWidth <= 1024) {
        setVisibleCards(2);
      } else {
        setVisibleCards(3);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const maxIndex = useMemo(
    () => Math.max(0, items.length - visibleCards),
    [items.length, visibleCards]
  );

  const next = () => setIndex((prev) => Math.min(maxIndex, prev + 1));
  const prev = () => setIndex((prev) => Math.max(0, prev - 1));

  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex));
  }, [maxIndex]);

  if (loading) {
    return (
      <div className="ann-loading-grid">
        {[1, 2, 3].map((num) => (
          <div className="ann-skeleton-card" key={num}>
            <div className="ann-skeleton-image">
              <div className="ann-circular-spinner"></div>
            </div>
            <div className="ann-skeleton-content">
              <div className="ann-skeleton-line short"></div>
              <div className="ann-skeleton-line title"></div>
              <div className="ann-skeleton-line text"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="ann-empty-state">
        <p>No announcements published at this time.</p>
      </div>
    );
  }

  return (
    <section className="annc-container">
      <div className="carousel-wrap">
        <button
          className="carousel-nav left"
          onClick={prev}
          disabled={index === 0}
          aria-label="Previous"
          type="button"
        >
          ❮
        </button>

        <div className="carousel-viewport">
          <div
            className="carousel-track"
            style={{ transform: `translateX(-${index * (100 / visibleCards)}%)` }}
          >
            {items.map((item) => (
              <div
                className="carousel-card"
                style={{ flex: `0 0 ${100 / visibleCards}%` }}
                key={item.id || item._id}
              >
                <article
                  className="carousel-box carousel-clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onOpen(item);
                  }}
                  aria-label={`Open announcement: ${item.title}`}
                >
                  <div
                    className="carousel-image"
                    style={
                      item.image
                        ? {
                            backgroundImage: `url(${item.image})`,
                          }
                        : undefined
                    }
                  >
                    {!item.image && <div className="carousel-image-overlay" />}
                    <span className="carousel-chip">Announcement</span>
                  </div>

                  <div className="carousel-content">
                    <span className="carousel-date">{item.date}</span>
                    <h3 className="carousel-title">{item.title}</h3>
                    <p className="carousel-text annPreviewText">{item.description}</p>
                    <div className="annReadMoreRow">
                      <span className="annReadMore">Read details →</span>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>

        <button
          className="carousel-nav right"
          onClick={next}
          disabled={index === maxIndex}
          aria-label="Next"
          type="button"
        >
          ❯
        </button>
      </div>

      {maxIndex > 0 && (
        <div className="annc-dots">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              className={`annc-dot ${i === index ? "active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              type="button"
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Announcements() {
  const [iiti, setIiti] = useState([]);
  const [btech, setBtech] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const openView = (item) => {
    setSelected(item);
    setViewOpen(true);
  };

  const closeView = () => {
    setViewOpen(false);
    setSelected(null);
  };

  const fetchAnnouncements = async () => {
    try {
      const [iitiRes, btechRes] = await Promise.all([
        fetch(`${API_BASE_URL}?category=iiti`),
        fetch(`${API_BASE_URL}?category=btech`),
      ]);

      if (iitiRes.ok) {
        const iitiData = await iitiRes.json();
        const published = iitiData.filter((x) => x?.published !== false);
        setIiti(sortByDateDesc(published));
      }

      if (btechRes.ok) {
        const btechData = await btechRes.json();
        const published = btechData.filter((x) => x?.published !== false);
        setBtech(sortByDateDesc(published));
      }
    } catch (error) {
      console.error("Error connecting to announcements API:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();

    const interval = setInterval(fetchAnnouncements, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="announcements-page">
      <div className="announcements-wrapper">
        <div className="announcement-section reveal-on-scroll">
          <div className="section-header">
            <h2 className="announcements-page-title">
              Institute of Information Technology and Innovation
            </h2>
            <p className="section-subtitle">Official IITI department updates and notices</p>
          </div>
          <AnnouncementCarousel items={iiti} loading={isLoading} onOpen={openView} />
        </div>

        <div className="announcement-section reveal-on-scroll">
          <div className="section-header">
            <h2 className="announcements-page-title">
              BTECH News & Announcements
            </h2>
            <p className="section-subtitle">Campus-wide institutional news and events</p>
          </div>
          <AnnouncementCarousel items={btech} loading={isLoading} onOpen={openView} />
        </div>
      </div>

      <ViewModal open={viewOpen} item={selected} onClose={closeView} />
    </div>
  );
}