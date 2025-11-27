import type {Metadata} from 'next';
import { Noto_Sans_Thai } from 'next/font/google'
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ClerkProvider } from '@clerk/nextjs'

const notoSansThai = Noto_Sans_Thai({ 
  subsets: ['latin', 'thai'],
  variable: '--font-noto-sans-thai',
})

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
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/sign-up"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`${notoSansThai.variable} font-headline antialiased`}>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
