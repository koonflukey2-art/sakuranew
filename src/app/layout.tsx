import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ClerkProvider } from '@clerk/nextjs'

// Font disabled due to network issues during build
// import { Noto_Sans_Thai } from 'next/font/google'
// const notoSansThai = Noto_Sans_Thai({
//   subsets: ['latin', 'thai'],
//   variable: '--font-noto-sans-thai',
// })

export const metadata: Metadata = {
  title: 'Shearer (S1 ) Profit Pilot',
  description: 'Profit & Metrics Planner',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="font-sans antialiased">
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
