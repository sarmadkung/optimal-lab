// A pipeline stops at the first failing stage. Later stages never start.

export const STAGES = [
  { id: "lint", title: "Lint", pass: "No style errors.", fail: "Lint failed. The pipeline stops here." },
  { id: "test", title: "Test", pass: "Every test passed.", fail: "A test failed. Build and deploy never start." },
  { id: "build", title: "Build", pass: "The artifact is ready.", fail: "The build failed. Nothing is deployed." },
  { id: "deploy", title: "Deploy", pass: "The new version is live.", fail: "Deploy failed. The old version stays up." },
] as const;

export type StageId = (typeof STAGES)[number]["id"];
