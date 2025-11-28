import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold shadow-lg shadow-pink-500/30">
            Sakura Dashboard
          </div>
          <h1 className="text-3xl font-bold text-slate-50">สมัครสมาชิก Sakura</h1>
          <p className="text-slate-300 text-base">สร้างบัญชีเพื่อเริ่มต้นใช้งานร้าน Sakura</p>
        </div>

        {/* Sign Up Form */}
        <div className="bg-slate-900/85 backdrop-blur-sm border border-slate-800 rounded-2xl shadow-xl shadow-pink-500/10 p-6">
          <SignUp
            routing="hash"         // ✅ ใช้ hash routing เหมือนกัน
            signInUrl="/login"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-transparent shadow-none",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-100",
                socialButtonsBlockButtonText: "text-slate-100 font-medium",
                formButtonPrimary:
                  "bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white font-semibold shadow-lg shadow-pink-500/30",
                formFieldInput:
                  "bg-slate-900 border border-slate-700 focus:border-violet-500 text-slate-100 placeholder:text-slate-400",
                formFieldLabel: "text-slate-300 font-medium",
                footerActionLink: "text-violet-400 hover:text-violet-300",
                identityPreviewText: "text-slate-300",
                identityPreviewEditButton:
                  "text-violet-400 hover:text-violet-300",
                formFieldInputShowPasswordButton:
                  "text-slate-400 hover:text-slate-200",
                dividerLine: "bg-slate-700",
                dividerText: "text-slate-400",
                formResendCodeLink:
                  "text-violet-400 hover:text-violet-300",
                otpCodeFieldInput:
                  "border-slate-700 focus:border-pink-500 text-slate-100",
              },
            }}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 mt-6 text-sm">
          สมัครสมาชิกเพื่อเข้าใช้งานระบบจัดการร้านค้า Sakura E-Commerce
        </p>
      </div>
    </div>
  );
}
