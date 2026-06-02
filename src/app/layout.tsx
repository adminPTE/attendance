import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบตารางทำงาน",
  description: "ระบบจัดการตารางเข้ากะและรายชื่อเจ้าหน้าที่",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
