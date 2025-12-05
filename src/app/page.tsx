import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

export default async function LandingPage() {
  // ถ้า login แล้วให้เด้งไป Dashboard
  const user = await currentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-900/20 to-black relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute top-40 left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-3xl px-6 md:px-8">
        {/* Logo/Brand */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-2">
            Sakura
          </h1>
          <p className="text-gray-400 text-lg">E-Commerce AI Platform</p>
        </div>

        {/* Clerk Sign In Component */}
        <div className="bg-gradient-to-br from-gray-900/90 via-black/95 to-gray-900/90 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl px-6 md:px-14 py-10 md:py-14 max-w-3xl mx-auto overflow-hidden">
          <SignIn
            appearance={{
              layout: {
                logoPlacement: "none",
                socialButtonsPlacement: "bottom",
                socialButtonsVariant: "blockButton",
              },
              elements: {
                // กรอบหลักของ Clerk
                rootBox: "w-full",
                card: "w-full bg-transparent shadow-none border-0 p-0",

                // ซ่อน header เดิม
                header: "hidden",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                logoBox: "hidden",

                // เนื้อหาอยู่กลางในกรอบ
                main:
                  "mt-0 flex flex-col justify-center",

                // ฟอร์มกว้างเต็มภายในการ์ด
                form: "w-full space-y-5",

                // ปุ่มหลัก
                formButtonPrimary:
                  "w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-medium shadow-lg",

                // ช่อง input
                formFieldInput:
                  "w-full bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500",
                formFieldLabel: "text-gray-300 font-medium",

                // ปุ่ม Social
                socialButtonsBlockButton:
                  "w-full bg-white/10 border-white/20 text-white hover:bg-white/20 transition",
                socialButtonsBlockButtonText:
                  "text-white font-medium text-sm",

                // Divider
                dividerLine: "bg-white/10",
                dividerText: "text-gray-400 text-xs",

                // Error / OTP / ลิงก์ต่าง ๆ
                identityPreviewText: "text-white",
                identityPreviewEditButton:
                  "text-purple-400 hover:text-purple-300",
                formResendCodeLink:
                  "text-purple-400 hover:text-purple-300 text-sm",
                formFieldInputShowPasswordButton:
                  "text-gray-400 hover:text-white",
                alertText: "text-red-400",
                formFieldErrorText: "text-red-400",
                otpCodeFieldInput:
                  "bg-white/5 border-white/20 text-white focus:border-purple-500",

                // ซ่อน footer Clerk เผื่อมีโผล่มา
                footer: "hidden",
                footerAction: "hidden",
                footerActionText: "hidden",
              },
            }}
            routing="path"
            path="/"
            signUpUrl={null}
            afterSignInUrl="/dashboard"
          />
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          ระบบจัดการร้านค้าด้วย AI
        </p>
      </div>
    </div>
  );
}
