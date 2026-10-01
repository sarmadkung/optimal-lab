// Unit vectors. Similarity is the cosine of the angle between them:
// 1 means the same direction, 0 means unrelated.

export type Point = { id: string; label: string; x: number; y: number };

const at = (id: string, label: string, deg: number): Point => {
  const a = (deg * Math.PI) / 180;
  return { id, label, x: Math.cos(a), y: Math.sin(a) };
};

export const POINTS: Point[] = [
  at("islamabad", "Islamabad is the capital", 100),
  at("karachi", "Karachi is a port city", 70),
  at("biryani", "Soak rice, then layer the biryani", 15),
  at("cricket", "A cricket match lasts a day", 170),
];

export const PRESETS: { id: string; label: string; x: number; y: number }[] = [
  { id: "capital", label: "What is the capital?", ...angle(95) },
  { id: "cook", label: "How is biryani rice cooked?", ...angle(10) },
  { id: "sport", label: "How long is a match?", ...angle(165) },
];

function angle(deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: Math.cos(a), y: Math.sin(a) };
}

export function cosine(a: { x: number; y: number }, b: { x: number; y: number }) {
  const na = Math.hypot(a.x, a.y);
  const nb = Math.hypot(b.x, b.y);
  if (na === 0 || nb === 0) return 0;
  return (a.x * b.x + a.y * b.y) / (na * nb);
}

export function ranked(query: { x: number; y: number }, k: number) {
  const rows = POINTS.map((p) => ({ ...p, score: cosine(query, p) })).sort((a, b) => b.score - a.score);
  return rows.map((row, i) => ({ ...row, kept: i < k }));
}
