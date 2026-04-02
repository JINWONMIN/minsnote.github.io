"use client";

import { useEffect, useState } from "react";

interface Heading {
  id: string;
  text: string;
  level: number;
}

export default function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll(".prose h2, .prose h3")
    );

    const items = elements.map((el) => {
      const id =
        el.id ||
        (el.textContent || "")
          .toLowerCase()
          .replace(/[^a-z0-9가-힣]+/g, "-")
          .replace(/(^-|-$)/g, "");
      if (!el.id) el.id = id;

      return {
        id,
        text: el.textContent || "",
        level: el.tagName === "H2" ? 2 : 3,
      };
    });

    setHeadings(items);
  }, []);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) {
    return (
      <p className="text-xs text-gray-400 dark:text-gray-500">
        목차가 없습니다.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {headings.map((heading) => (
        <li key={heading.id}>
          <a
            href={`#${heading.id}`}
            className={`block py-1.5 text-sm transition-colors ${
              heading.level === 3 ? "pl-4" : ""
            } ${
              activeId === heading.id
                ? "text-primary-500 font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400"
            }`}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  );
}
