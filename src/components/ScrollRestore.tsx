"use client";

import { useEffect } from "react";

export default function ScrollRestore() {
  useEffect(() => {
    const saved = sessionStorage.getItem("__locale_scroll");
    if (!saved) return;

    sessionStorage.removeItem("__locale_scroll");
    const y = Number(saved);
    if (y <= 0) return;

    // Full page load — wait for images/layout to settle, then restore
    if (document.readyState === "complete") {
      window.scrollTo(0, y);
    } else {
      window.addEventListener("load", () => window.scrollTo(0, y), {
        once: true,
      });
    }
  }, []);

  return null;
}
