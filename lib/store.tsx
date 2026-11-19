"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import type { DocketItem, Extraction } from "./types";
import { createSeed } from "./seed";
import { useProfile } from "./profile";
import { uid } from "./utils";

type Action =
  | { type: "load"; items: DocketItem[] }
  | { type: "add"; item: DocketItem }
  | { type: "addMany"; items: DocketItem[] }
  | { type: "toggle"; itemId: string; taskId: string }
  | { type: "archive"; id: string; archived: boolean }
  | { type: "remove"; id: string };

function reducer(state: DocketItem[], action: Action): DocketItem[] {
  switch (action.type) {
    case "load":
      return action.items;
    case "add":
      return [action.item, ...state];
    case "addMany":
      return [...action.items, ...state];
    case "toggle":
      return state.map((i) =>
        i.id !== action.itemId ? i : { ...i, tasks: i.tasks.map((t) => (t.id === action.taskId ? { ...t, done: !t.done } : t)) },
      );
    case "archive":
      return state.map((i) => (i.id === action.id ? { ...i, archived: action.archived } : i));
    case "remove":
      return state.filter((i) => i.id !== action.id);
  }
}

interface DocketContext {
  items: DocketItem[];
  ready: boolean;
  add: (e: Extraction) => DocketItem;
  /** Adds several items, skipping any whose externalId is already in the docket. Returns how many were added. */
  importMany: (e: Extraction[]) => number;
  toggleTask: (itemId: string, taskId: string) => void;
  archive: (id: string) => void;
  restore: (id: string) => void;
  remove: (id: string) => void;
  reset: () => void;
  /** Empties the docket entirely (no demo data). */
  clearAll: () => void;
}

const Ctx = createContext<DocketContext | null>(null);
const STORAGE_KEY = "familydocket:v1";

export function DocketProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(reducer, []);
  const [ready, setReady] = useState(false);
  const { profile } = useProfile();

  // Hydrate from localStorage on the client only. New users start empty; onboarding offers the demo.
  useEffect(() => {
    let loaded: unknown = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch {
      /* storage unavailable */
    }
    dispatch({ type: "load", items: Array.isArray(loaded) ? (loaded as DocketItem[]) : [] });
    setReady(true);
  }, []);

  // Nothing is stored until someone has signed up and consented.
  useEffect(() => {
    if (!ready || !profile) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items, ready, profile]);

  const add = useCallback((e: Extraction) => {
    const item: DocketItem = { ...e, id: uid(), archived: false, createdAt: new Date().toISOString() };
    dispatch({ type: "add", item });
    return item;
  }, []);

  const value = useMemo<DocketContext>(
    () => ({
      items,
      ready,
      add,
      toggleTask: (itemId, taskId) => dispatch({ type: "toggle", itemId, taskId }),
      archive: (id) => dispatch({ type: "archive", id, archived: true }),
      restore: (id) => dispatch({ type: "archive", id, archived: false }),
      remove: (id) => dispatch({ type: "remove", id }),
      importMany: (exts) => {
        const existing = new Set(items.map((i) => i.externalId).filter(Boolean));
        const fresh = exts
          .filter((e) => !e.externalId || !existing.has(e.externalId))
          .map<DocketItem>((e) => ({ ...e, id: uid(), archived: false, createdAt: new Date().toISOString() }));
        if (fresh.length) dispatch({ type: "addMany", items: fresh });
        return fresh.length;
      },
      reset: () => dispatch({ type: "load", items: createSeed(new Date()) }),
      clearAll: () => dispatch({ type: "load", items: [] }),
    }),
    [items, ready, add],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDocket() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDocket must be used inside <DocketProvider>");
  return ctx;
}
