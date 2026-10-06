// What the reader has finished, kept in this browser only (there are no accounts yet).
// Keys look like "session:dsa/two-pointers" or "problem:009". One localStorage entry holds
// them all; components subscribe so every mark on the page updates together.

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "progress";
const listeners = new Set<() => void>();
let cache: Set<string> | null = null;

function read(): Set<string> {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    cache = new Set();
  }
  return cache;
}

function write(next: Set<string>) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    /* private mode or storage full: keep it in memory for this visit */
  }
  listeners.forEach((l) => l());
}

export function setDone(key: string, done: boolean) {
  const next = new Set(read());
  if (done) next.add(key);
  else next.delete(key);
  write(next);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY = new Set<string>();

/** The set of finished keys. Empty on the server and on the first client render. */
export function useProgress(): Set<string> {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

