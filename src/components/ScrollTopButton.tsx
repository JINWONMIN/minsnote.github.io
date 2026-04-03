"use client";

import { useEffect, useState, useRef } from "react";

export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const savedPosition = useRef(0);

  useEffect(() => {
    function handleScroll() {
      const scrollY = window.scrollY;
      setVisible(scrollY > 300);
      setAtTop(scrollY < 100);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    if (atTop && savedPosition.current > 0) {
      // At top → go back to saved position
      window.scrollTo({ top: savedPosition.current, behavior: "smooth" });
      savedPosition.current = 0;
    } else {
      // Scrolled down → save position and go to top
      savedPosition.current = window.scrollY;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const showButton = visible || (atTop && savedPosition.current > 0);

  if (!showButton) return null;

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white shadow-lg transition-all hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
      aria-label={atTop && savedPosition.current > 0 ? "Go back to previous position" : "Scroll to top"}
    >
      <svg
        className={`h-4 w-4 text-gray-600 dark:text-gray-300 transition-transform duration-200 ${atTop && savedPosition.current > 0 ? "rotate-180" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}
