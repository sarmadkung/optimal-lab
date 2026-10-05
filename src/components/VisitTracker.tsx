"use client";

import { useEffect } from "react";
import {
  createVisitorId,
  readVisitorCookie,
  VISIT_SESSION_KEY,
  writeVisitorCookie,
} from "@/lib/analytics/visitorCookie";

/** One page-view ping per browser tab session when Supabase is configured. */
export default function VisitTracker() {
  useEffect(() => {
    if (sessionStorage.getItem(VISIT_SESSION_KEY)) return;

    let visitorId = readVisitorCookie();
    if (!visitorId) {
      visitorId = createVisitorId();
      writeVisitorCookie(visitorId);
    }

    sessionStorage.setItem(VISIT_SESSION_KEY, "1");

    fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visitorId }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  return null;
}
