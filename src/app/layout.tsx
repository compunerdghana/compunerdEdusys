import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CompunerdEduSys — School Management OS",
  description: "Offline-first school management system for Ghana & Africa by Compunerd Ghana",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
