"use client";

import { useState, useEffect } from "react";
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  // ทำให้หน้า /login render เฉพาะฝั่ง client เพื่อเลี่ยง hydration error
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ตอน SSR + client render ครั้งแรก จะได้ markup ตรงกัน (null เหมือนกัน)
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold shadow-lg shadow-pink-500/30">
            <span className="text-sm">Sakura Dashboard</span>
          </div>
          <h1 className="text-3xl font-bold text-white">ยินดีต้อนรับกลับ</h1>
          <p className="text-slate-300 text-sm md:text-base">
            เข้าสู่ระบบเพื่อจัดการ AI, โฆษณา และสต็อกของคุณในที่เดียว
          </p>
        </div>

        {/* กล่อง SignIn ให้ตรงกลางและกว้างพอดี */}
        <div className="mx-auto w-full max-w-md bg-slate-900/85 border border-slate-800 rounded-2xl p-5 shadow-inner shadow-black/40">
          <SignIn
            // ✅ ใช้ hash routing แทน path routing
            routing="hash"
            signUpUrl="/sign-up"
            afterSignInUrl="/"
            appearance={{
              elements: {
                formButtonPrimary:
                  "bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white font-semibold shadow-lg shadow-pink-500/30",
                formFieldInput:
                  "bg-slate-900 border border-slate-700 focus:border-pink-500 text-slate-100 placeholder:text-slate-500 text-sm",
                formFieldLabel:
                  "text-slate-300 font-medium text-sm",
                footerActionLink:
                  "text-pink-300 hover:text-pink-200",
                identityPreviewText: "text-slate-300",
                identityPreviewEditButton:
                  "text-pink-300 hover:text-pink-200 text-xs",
                formFieldInputShowPasswordButton:
                  "text-slate-400 hover:text-slate-200",
                dividerLine: "bg-slate-700",
                dividerText: "text-slate-400 text-xs",
                formResendCodeLink:
                  "text-pink-300 hover:text-pink-200 text-xs",
                otpCodeFieldInput:
                  "border-slate-700 focus:border-pink-500 text-slate-100",
                headerTitle: "text-white",
                headerSubtitle: "text-slate-300",
                socialButtonsBlockButton:
                  "bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-100",
                socialButtonsBlockButtonText:
                  "text-slate-100 font-medium text-sm",
              },
            }}
          />
        </div>

        {/* Footer เล็ก ๆ ใต้การ์ด */}
        <p className="text-center text-xs md:text-sm text-slate-400">
          ใช้บัญชี Clerk เดิมของคุณเพื่อเข้าสู่ระบบอย่างปลอดภัย
        </p>
      </div>
    </div>
  );
}
