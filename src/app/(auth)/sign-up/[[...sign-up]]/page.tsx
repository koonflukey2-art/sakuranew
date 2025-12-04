import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-900/20 to-black relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gradient-purple mb-2">Sakura</h1>
          <p className="text-gray-400 text-lg">สร้างบัญชีใหม่</p>
        </div>

        <div className="premium-card p-8 glow-purple">
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary:
                  "bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white",
                card: "bg-transparent shadow-none",
                headerTitle: "text-white text-2xl font-bold",
                headerSubtitle: "text-gray-400",
                socialButtonsBlockButton:
                  "bg-white/10 border-white/20 text-white hover:bg-white/20",
                formFieldInput:
                  "bg-white/5 border-white/20 text-white placeholder:text-gray-500",
                formFieldLabel: "text-gray-300",
                footerActionLink: "text-purple-400 hover:text-purple-300",
              },
            }}
            afterSignUpUrl="/"
            signInUrl="/sign-in"
          />
        </div>
      </div>
    </div>
  );
}
