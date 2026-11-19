import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FamilyDocket",
  description: "Your family's AI chief of staff — every school email, club notice and group chat turned into clean actions.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7F6F3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
