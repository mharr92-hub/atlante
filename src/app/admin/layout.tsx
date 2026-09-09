import type { Metadata } from "next";

// The whole admin area stays out of the index (PRD 5.1).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminAreaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
