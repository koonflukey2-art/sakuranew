"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading while checking auth
  if (!isLoaded || isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden flex items-center justify-center">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4 py-8">
        {/* Logo and Title */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500 to-purple-500 shadow-2xl mb-4">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400">
            Sakura
          </h1>
          <p className="text-purple-200 text-lg">E-Commerce AI Platform</p>
          <p className="text-purple-300 text-sm mt-2">
            ระบบจัดการร้านค้าออนไลน์ที่ขับเคลื่อนด้วย AI
          </p>
        </div>

        {/* Sign In Component */}
        <div className="animate-slide-up">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl",
                headerTitle: "text-white text-2xl",
                headerSubtitle: "text-purple-200",
                socialButtonsBlockButton:
                  "bg-white/10 border-white/20 text-white hover:bg-white/20",
                formButtonPrimary:
                  "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg",
                footerActionLink: "text-purple-300 hover:text-purple-200",
                formFieldLabel: "text-purple-200",
                formFieldInput:
                  "bg-white/10 border-white/20 text-white placeholder:text-purple-300",
                identityPreviewText: "text-white",
                identityPreviewEditButton: "text-purple-300",
              },
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            afterSignInUrl="/dashboard"
            localization={{
              formButtonPrimary: "เข้าสู่ระบบ",
            }}
          />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-purple-300 text-sm animate-fade-in">
          <p>© 2024 Sakura E-Commerce Platform</p>
          <p className="mt-2 text-xs text-purple-400">
            Powered by Gemini AI 2.0
          </p>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-500 to-transparent"></div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          opacity: 0.5;
          animation: blob 20s infinite;
        }

        .blob-1 {
          top: 20%;
          left: 20%;
          width: 300px;
          height: 300px;
          background: linear-gradient(45deg, #ec4899, #8b5cf6);
          animation-delay: 0s;
        }

        .blob-2 {
          top: 60%;
          right: 20%;
          width: 400px;
          height: 400px;
          background: linear-gradient(45deg, #8b5cf6, #3b82f6);
          animation-delay: -5s;
        }

        .blob-3 {
          bottom: 10%;
          left: 50%;
          width: 350px;
          height: 350px;
          background: linear-gradient(45deg, #ec4899, #3b82f6);
          animation-delay: -10s;
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}
