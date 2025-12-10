import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/contexts/theme-context"; // <--- ต้องมี

export const metadata: Metadata = {
  title: "Shearer (S1) Profit Pilot",
  description: "Profit & Metrics Planner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        layout: {
          unsafe_disableDevelopmentModeWarnings: true,
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className="font-sans antialiased bg-slate-950"
        >
          {/* ต้องมี ThemeProvider ครอบตรงนี้ */}
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

// update for build (เพิ่มบรรทัดนี้เพื่อให้ Git เห็นว่ามีการแก้ไข)