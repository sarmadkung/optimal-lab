// Keys for the progress store (src/lib/progress.ts). Kept apart from the store so server
// components can build keys without importing client-only React hooks.

export const sessionKey = (trackId: string, sessionId: string) => `session:${trackId}/${sessionId}`;
