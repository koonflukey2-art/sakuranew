// src/app/sign-in/[[...index]]/page.tsx

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8 space-y-2">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-4xl">🌸</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            ระบบจัดการสต็อก Sakura
          </h1>
          <p className="text-gray-600 text-sm">
            เข้าสู่ระบบเพื่อเริ่มใช้งาน
          </p>
        </header>

        {/* Clerk Sign In Component */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <SignIn
            appearance={{
              layout: {
                logoPlacement: "none",
              },
              elements: {
                rootBox: "w-full",
                card: "w-full bg-transparent shadow-none border-0 p-0",

                // Hide default Clerk header
                header: "hidden",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                logoBox: "hidden",

                main: "mt-0",
                form: "space-y-4",

                // Social buttons
                socialButtonsBlockButton:
                  "w-full bg-white border-2 border-gray-300 hover:border-blue-500 text-gray-700 hover:bg-blue-50 transition-colors",
                socialButtonsBlockButtonText:
                  "text-gray-700 font-medium text-sm",

                // Primary button
                formButtonPrimary:
                  "w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white normal-case shadow-lg transition-all",

                // Input fields
                formFieldInput:
                  "bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 placeholder:text-gray-500 transition-all",
                formFieldLabel: "text-gray-700 font-medium",

                // Divider
                dividerLine: "bg-gray-300",
                dividerText: "text-gray-500 text-xs",

                // OTP code
                otpCodeFieldInput:
                  "border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900",

                // Links
                formResendCodeLink:
                  "text-blue-600 hover:text-blue-700 text-sm font-medium",
                identityPreviewText: "text-gray-700",
                identityPreviewEditButton:
                  "text-blue-600 hover:text-blue-700 text-sm",
                formFieldInputShowPasswordButton:
                  "text-gray-600 hover:text-gray-900",

                // Hide footer
                footer: "hidden",
                footerAction: "hidden",
                footerActionText: "hidden",
              },
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            ยังไม่มีบัญชี?{" "}
            <a
              href="/sign-up"
              className="text-blue-600 hover:text-blue-700 font-semibold underline"
            >
              สมัครสมาชิก
            </a>
          </p>
        </div>

        <p className="text-center text-gray-500 mt-8 text-xs">
          ยินดีต้อนรับสู่ระบบจัดการสต็อก Sakura Biotech
        </p>
      </div>
    </main>
  );
}
