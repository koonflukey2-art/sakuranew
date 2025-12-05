// src/app/sign-in/[[...index]]/page.tsx

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-xl mx-auto">
        {/* Header ของเราเอง */}
        <header className="text-center mb-8 space-y-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            Sakura
          </h1>
          <p className="text-slate-400 text-sm tracking-wide">
            E-Commerce AI Platform
          </p>
        </header>

        {/* การ์ด Sign In */}
        <section className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl shadow-2xl shadow-fuchsia-500/10 p-8">
          <SignIn
            appearance={{
              layout: {
                logoPlacement: "none",
              },
              elements: {
                rootBox: "w-full",
                card: "w-full bg-transparent shadow-none border-0 p-0",

                // ซ่อนหัว Sign in to Sakura เดิมของ Clerk
                header: "hidden",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                logoBox: "hidden",

                main: "mt-0",
                form: "space-y-4",

                socialButtonsBlockButton:
                  "w-full bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-100",
                socialButtonsBlockButtonText:
                  "text-slate-100 font-medium text-sm",

                formButtonPrimary:
                  "w-full bg-violet-500 hover:bg-violet-600 text-white normal-case shadow-lg shadow-violet-500/30",

                formFieldInput:
                  "bg-slate-900 border border-slate-700 focus:border-violet-500 text-slate-100 placeholder:text-slate-500",
                formFieldLabel: "text-slate-300 font-medium",

                dividerLine: "bg-slate-700",
                dividerText: "text-slate-400 text-xs",

                otpCodeFieldInput:
                  "border-slate-700 focus:border-violet-500 text-slate-100",

                formResendCodeLink:
                  "text-violet-400 hover:text-violet-300 text-sm",
                identityPreviewText: "text-slate-300",
                identityPreviewEditButton:
                  "text-violet-400 hover:text-violet-300 text-sm",
                formFieldInputShowPasswordButton:
                  "text-slate-400 hover:text-slate-200",

                // เผื่อไว้: ซ่อน footer เดิมของ Clerk ด้วย
                footer: "hidden",
                footerAction: "hidden",
                footerActionText: "hidden",
              },
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
          />
        </section>

        <p className="text-center text-slate-500 mt-6 text-sm">
          ยินดีต้อนรับสู่ระบบจัดการร้านค้า Sakura E-Commerce
        </p>
      </div>
    </main>
  );
}
