"use client";

import { useEffect } from "react";

export default function CodeCopyButton() {
  useEffect(() => {
    const preBlocks = document.querySelectorAll(".prose pre");

    preBlocks.forEach((pre) => {
      if (pre.querySelector(".code-copy-btn")) return;

      const el = pre as HTMLElement;
      el.style.position = "relative";

      const btn = document.createElement("button");
      btn.className = "code-copy-btn";
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      btn.title = "복사";

      btn.addEventListener("click", async () => {
        const code = pre.querySelector("code");
        const text = code?.textContent || pre.textContent || "";
        await navigator.clipboard.writeText(text);

        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        setTimeout(() => {
          btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
        }, 2000);
      });

      el.appendChild(btn);
    });
  }, []);

  return null;
}
