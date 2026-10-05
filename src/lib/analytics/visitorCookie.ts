export const VISITOR_COOKIE = "ol_vid";
export const VISIT_SESSION_KEY = "ol_visit_sent";

export function readVisitorCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${VISITOR_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function writeVisitorCookie(id: string) {
  const maxAge = 60 * 60 * 24 * 400; // ~400 days
  document.cookie = `${VISITOR_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function createVisitorId(): string {
  return crypto.randomUUID();
}
