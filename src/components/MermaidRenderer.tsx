"use client";

import { useEffect } from "react";

const darkTheme = {
  background: "#1e1e2e",
  primaryColor: "#2a2a3e",
  primaryTextColor: "#d1d5db",
  primaryBorderColor: "#3e3e5e",
  secondaryColor: "#1e1e2e",
  secondaryTextColor: "#d1d5db",
  secondaryBorderColor: "#3e3e5e",
  tertiaryColor: "#1e1e2e",
  lineColor: "#6b7280",
  textColor: "#d1d5db",
  mainBkg: "#2a2a3e",
  nodeBorder: "#3e3e5e",
  clusterBkg: "#1e1e2e",
  clusterBorder: "#2e2e3e",
  titleColor: "#f9fafb",
  edgeLabelBackground: "#1e1e2e",
  nodeTextColor: "#d1d5db",
};

const lightTheme = {
  background: "#ffffff",
  primaryColor: "#e5e7eb",
  primaryTextColor: "#111827",
  primaryBorderColor: "#6b7280",
  secondaryColor: "#f3f4f6",
  secondaryTextColor: "#111827",
  secondaryBorderColor: "#6b7280",
  tertiaryColor: "#f3f4f6",
  lineColor: "#374151",
  textColor: "#111827",
  mainBkg: "#e5e7eb",
  nodeBorder: "#6b7280",
  clusterBkg: "#f3f4f6",
  clusterBorder: "#9ca3af",
  titleColor: "#111827",
  edgeLabelBackground: "#e5e7eb",
  nodeTextColor: "#111827",
};

export default function MermaidRenderer() {
  useEffect(() => {
    const codeBlocks = document.querySelectorAll<HTMLElement>(
      "code.language-mermaid"
    );
    if (codeBlocks.length === 0) return;

    const diagrams: { source: string; wrapper: HTMLDivElement }[] = [];

    codeBlocks.forEach((block) => {
      const pre = block.parentElement;
      if (!pre || pre.tagName !== "PRE") return;

      const source = block.textContent || "";
      const wrapper = document.createElement("div");
      wrapper.className = "mermaid-diagram";
      pre.replaceWith(wrapper);
      diagrams.push({ source, wrapper });
    });

    async function renderAll() {
      const mod = await import("mermaid");
      const mermaid = mod.default;
      const isDark = document.documentElement.classList.contains("dark");

      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        fontFamily: "inherit",
        themeVariables: isDark ? darkTheme : lightTheme,
      });

      for (let i = 0; i < diagrams.length; i++) {
        const { source, wrapper } = diagrams[i];
        const id = `mermaid-${Date.now()}-${i}`;
        try {
          const { svg } = await mermaid.render(id, source);
          wrapper.innerHTML = svg;
        } catch {
          // render failed
        }
      }
    }

    renderAll();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          renderAll();
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
