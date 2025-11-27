import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold shadow-lg">
            <span className="text-sm">Sakura Dashboard</span>
          </div>
          <h1 className="text-3xl font-bold text-white">ยินดีต้อนรับกลับ</h1>
          <p className="text-slate-300">
            เข้าสู่ระบบเพื่อจัดการ AI, โฆษณา และสต็อกของคุณในที่เดียว
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-inner">
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/sign-up"
            afterSignInUrl="/"
            appearance={{
              elements: {
                formButtonPrimary:
                  "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90 shadow-lg",
                formFieldInput:
                  "bg-slate-900 border border-slate-800 text-white placeholder:text-slate-500 focus:border-pink-400",
                formFieldLabel: "text-slate-200 font-medium",
                footerActionLink: "text-pink-300 hover:text-pink-200 font-semibold",
                headerTitle: "text-white",
                headerSubtitle: "text-slate-300",
                socialButtonsBlockButton:
                  "bg-slate-800 border border-slate-700 text-white hover:bg-slate-700",
                socialButtonsBlockButtonText: "text-white",
              },
            }}
          />
        </div>

        <p className="text-center text-sm text-slate-400">
          ใช้บัญชี Clerk เดิมของคุณเพื่อเข้าสู่ระบบอย่างปลอดภัย
        </p>
      </div>
    </div>
  );
}
