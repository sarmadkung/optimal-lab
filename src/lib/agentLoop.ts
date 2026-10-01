// A coding agent repeats search → edit → check until the check passes.

export type Turn = { round: number; action: "Search" | "Edit" | "Check"; detail: string; ok: boolean };

export function turns(failOnce: boolean): Turn[] {
  const first: Turn[] = [
    { round: 1, action: "Search", detail: "Opened sum.test.ts and saw the failing assertion.", ok: true },
    { round: 1, action: "Edit", detail: "Updated add() in sum.ts.", ok: true },
    {
      round: 1,
      action: "Check",
      detail: failOnce ? "Test still red: expected 4, got 3." : "Test passed.",
      ok: !failOnce,
    },
  ];
  if (!failOnce) return first;
  return [
    ...first,
    { round: 2, action: "Search", detail: "Read the error. The function returns a - 1.", ok: true },
    { round: 2, action: "Edit", detail: "Changed the return to a + b.", ok: true },
    { round: 2, action: "Check", detail: "Test passed.", ok: true },
  ];
}

export const STEP_FOR: Record<Turn["action"], number> = { Search: 1, Edit: 2, Check: 3 };
