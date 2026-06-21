import type { Metadata } from "next";
import "./globals.css";
import CircularPageLoader from "@/components/common/CircularPageLoader";
import InactivityLogout from "@/components/common/InactivityLogout";

export const metadata: Metadata = {
  title: "CompunerdEduSys — School Management OS",
  description: "Offline-first school management system for Ghana & Africa by Compunerd Ghana",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <CircularPageLoader />
        <InactivityLogout />
        {children}
      </body>
    </html>
  );
}
