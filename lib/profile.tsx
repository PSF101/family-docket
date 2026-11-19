"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setActiveCountry, type Country } from "./dates";
import { uid } from "./utils";

/** Bump when the policy text changes materially; users who agreed to an older version are asked again. */
export const PRIVACY_POLICY_VERSION = "1.0";

export interface Child {
  id: string;
  name: string;
  school: string;
  /** e.g. "Year 4", "Reception" */
  yearGroup: string;
}

export interface Away {
  id: string;
  from: string;
  to: string;
  note: string;
}

export interface Carer {
  id: string;
  name: string;
  /** Days they are normally at work, 1 = Monday … 5 = Friday (0/6 for weekends). */
  workDays: number[];
  /** Trips, conferences, shifts: dates they can't do pick-up even on a non-work day. */
  away: Away[];
}

export interface Consent {
  /** Explicit, unticked-by-default agreement to the Privacy Policy. Required to use the app. */
  privacyPolicy: boolean;
  policyVersion: string;
  /** When the agreement was given (ISO timestamp), kept as the record of consent. */
  agreedAt: string;
  /** Optional, separate opt-in. Can be withdrawn any time in Settings. */
  productEmails: boolean;
}

export interface Profile {
  name: string;
  email: string;
  createdAt: string;
  /** Missing on profiles saved before the country setting existed; those stay UK. */
  country?: Country;
  consent: Consent;
  children: Child[];
  /** Everyone who normally covers school pick-up. A gap needs all of them unavailable. */
  carers: Carer[];
  /** Childcare gaps the family has already sorted (keyed by the gap's first day). */
  coveredGaps: string[];
}

export const STORAGE_PREFIX = "familydocket";
const PROFILE_KEY = `${STORAGE_PREFIX}:profile:v1`;

export const WEEKDAYS: { value: number; short: string }[] = [
  { value: 1, short: "Mon" },
  { value: 2, short: "Tue" },
  { value: 3, short: "Wed" },
  { value: 4, short: "Thu" },
  { value: 5, short: "Fri" },
];

export const newCarer = (name = ""): Carer => ({ id: uid(), name, workDays: [1, 2, 3, 4, 5], away: [] });
export const newChild = (name = ""): Child => ({ id: uid(), name, school: "", yearGroup: "" });

/** Profiles saved before this setting existed are UK families. */
export function countryOf(profile: { country?: Country } | null | undefined): Country {
  return profile?.country === "US" ? "US" : "UK";
}

/**
 * Erases everything FamilyDocket holds about this user.
 *
 * In this version all data (profile, consent record, docket items, imported emails) lives only in
 * this browser's localStorage, so removing every FamilyDocket key is a complete erasure. Once a
 * server database exists, this must first call an authenticated account-deletion endpoint that
 * deletes the user's rows and backups, and only clear local storage once that succeeds.
 */
export function deleteAllUserData() {
  for (const store of [localStorage, sessionStorage]) {
    try {
      Object.keys(store)
        .filter((k) => k.startsWith(STORAGE_PREFIX))
        .forEach((k) => store.removeItem(k));
    } catch {
      /* storage unavailable */
    }
  }
}

interface ProfileContext {
  profile: Profile | null;
  ready: boolean;
  save: (p: Profile) => void;
  update: (fn: (p: Profile) => Profile) => void;
}

const Ctx = createContext<ProfileContext | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  setActiveCountry(countryOf(profile));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) setProfile(JSON.parse(raw) as Profile);
    } catch {
      /* storage unavailable or corrupt: treat as signed out */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !profile) return;
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      /* storage unavailable */
    }
  }, [profile, ready]);

  const value = useMemo<ProfileContext>(
    () => ({
      profile,
      ready,
      save: setProfile,
      update: (fn) => setProfile((p) => (p ? fn(p) : p)),
    }),
    [profile, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider>");
  return ctx;
}

/** "Priya Shah" → "PS" */
export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?"
  );
}
