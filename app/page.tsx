"use client";

import { DocketProvider } from "@/lib/store";
import { ProfileProvider } from "@/lib/profile";
import { AppShell } from "@/components/AppShell";

export default function Home() {
  return (
    <ProfileProvider>
      <DocketProvider>
        <AppShell />
      </DocketProvider>
    </ProfileProvider>
  );
}
