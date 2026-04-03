"use client";

import { useEffect, useState } from "react";
import { trackVisitor } from "@/lib/api";

export default function VisitorCounter() {
  const [data, setData] = useState<{ today: number; total: number } | null>(null);

  useEffect(() => {
    trackVisitor().then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
      <span>TODAY {data.today.toLocaleString()}</span>
      <span className="text-gray-300 dark:text-gray-700">|</span>
      <span>TOTAL {data.total.toLocaleString()}</span>
    </div>
  );
}
