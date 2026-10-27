import { useEffect } from "react";
import Hero from "../Libraries/Hero.jsx";
import Mission_vision from "../Libraries/Mission_vision.jsx";
import Announcements from "../Libraries/Announcements.jsx";
import Footer from "../Libraries/Footer.jsx";

export default function Home() {
  useEffect(() => {
    // Create an observer that detects when elements enter the screen
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target); // Stop observing once revealed
          }
        });
      },
      { threshold: 0.12 } // Triggers when 12% of the element is visible
    );

    // Target all elements with the 'reveal-on-scroll' class
    const elements = document.querySelectorAll(".reveal-on-scroll");
    elements.forEach((el) => observer.observe(el));

    // Cleanup observer on unmount
    return () => observer.disconnect();
  }, []);

  return (
    <main>
      <Hero />
      <Announcements />
      <Mission_vision />
      <Footer />
    </main>
  );
}