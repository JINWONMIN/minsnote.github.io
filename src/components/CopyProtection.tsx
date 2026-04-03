"use client";

import { useEffect } from "react";

export default function CopyProtection() {
  useEffect(() => {
    function isInsideCodeBlock(node: Node | null): boolean {
      while (node) {
        if (node instanceof HTMLElement) {
          const tag = node.tagName.toLowerCase();
          if (tag === "pre" || tag === "code") return true;
        }
        node = node.parentNode;
      }
      return false;
    }

    function handleCopy(e: ClipboardEvent) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      if (
        isInsideCodeBlock(range.startContainer) &&
        isInsideCodeBlock(range.endContainer)
      ) {
        return;
      }

      e.preventDefault();
    }

    document.addEventListener("copy", handleCopy);
    return () => document.removeEventListener("copy", handleCopy);
  }, []);

  return null;
}
