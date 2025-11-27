import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Sakura
          </h1>
          <p className="text-slate-400 text-lg">สมัครสมาชิก Sakura</p>
        </div>

        {/* Sign Up Form */}
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl shadow-xl p-6">
          <SignUp
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
                  "bg-violet-500 hover:bg-violet-600 text-white normal-case shadow-lg",
                formFieldInput:
                  "bg-slate-900 border border-slate-700 focus:border-violet-500 text-slate-100 placeholder:text-slate-400",
                formFieldLabel: "text-slate-300 font-medium",
                footerActionLink: "text-violet-400 hover:text-violet-300",
                identityPreviewText: "text-slate-300",
                identityPreviewEditButton: "text-violet-400 hover:text-violet-300",
                formFieldInputShowPasswordButton: "text-slate-400 hover:text-slate-200",
                dividerLine: "bg-slate-700",
                dividerText: "text-slate-400",
                formResendCodeLink: "text-violet-400 hover:text-violet-300",
                otpCodeFieldInput:
                  "border-slate-700 focus:border-violet-500 text-slate-100",
              },
            }}
            routing="path"
            path="/sign-up"
            signInUrl="/login"
          />
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 mt-6 text-sm">
          สมัครสมาชิกเพื่อเข้าใช้งานระบบจัดการร้านค้า Sakura E-Commerce
        </p>
      </div>
    </div>
  );
}
