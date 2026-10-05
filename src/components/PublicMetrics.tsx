"use client";

import { useEffect, useState } from "react";
import type { PublicSiteStats } from "@/lib/siteAnalytics";

export default function PublicMetrics() {
  const [stats, setStats] = useState<PublicSiteStats | null>(null);

  useEffect(() => {
    fetch("/api/analytics/public")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PublicSiteStats | null) => {
        if (data?.configured) setStats(data);
      })
      .catch(() => {});
  }, []);

  if (!stats || (stats.pageViews === 0 && stats.uniqueVisitors === 0 && stats.projectStarts === 0)) {
    return null;
  }

  return (
    <p className="mt-3 font-mono text-xs text-[var(--faint)]" aria-label="Public usage stats">
      {formatCount(stats.uniqueVisitors)} visitors · {formatCount(stats.pageViews)} page views
      {stats.projectStarts > 0 ? <> · {formatCount(stats.projectStarts)} project starts</> : null}
    </p>
  );
}

function formatCount(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
