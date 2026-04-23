import type { Metadata } from "next";

import { QueryProvider } from "@/components/query-provider";
import { SessionProvider } from "@/lib/session";

import "./globals.css";

export const metadata: Metadata = {
  title: "CampusStudy AI",
  description: "University-focused AI study workspace for notes, flashcards, quizzes, and grounded Q&A."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <QueryProvider>{children}</QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

