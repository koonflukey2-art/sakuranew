import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

export default async function LandingPage() {
  // Check if user is already logged in
  const user = await currentUser();

  if (user) {
    // Redirect to dashboard if already logged in
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-900/20 to-black relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md p-8">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-2">
            Sakura
          </h1>
          <p className="text-gray-400 text-lg">
            E-Commerce AI Platform
          </p>
        </div>

        {/* Clerk Sign In Component */}
        <div className="bg-gradient-to-br from-gray-900/90 via-black/95 to-gray-900/90 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-transparent shadow-none w-full",
                headerTitle: "text-white text-2xl font-bold",
                headerSubtitle: "text-gray-400",
                formButtonPrimary:
                  "bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-medium shadow-lg",
                formFieldInput:
                  "bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500",
                formFieldLabel: "text-gray-300 font-medium",
                socialButtonsBlockButton:
                  "bg-white/10 border-white/20 text-white hover:bg-white/20 transition",
                socialButtonsBlockButtonText: "text-white font-medium",
                footerActionLink: "text-purple-400 hover:text-purple-300",
                footerActionText: "text-gray-400",
                dividerLine: "bg-white/10",
                dividerText: "text-gray-400",
                identityPreviewText: "text-white",
                identityPreviewEditButton: "text-purple-400 hover:text-purple-300",
                formResendCodeLink: "text-purple-400 hover:text-purple-300",
                formFieldInputShowPasswordButton: "text-gray-400 hover:text-white",
                alertText: "text-red-400",
                formFieldErrorText: "text-red-400",
                otpCodeFieldInput: "bg-white/5 border-white/20 text-white",
              },
              layout: {
                socialButtonsPlacement: "bottom",
                socialButtonsVariant: "blockButton",
              },
            }}
            routing="path"
            path="/"
            signUpUrl={null}
            afterSignInUrl="/dashboard"
          />
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          ระบบจัดการร้านค้าด้วย AI
        </p>
      </div>
    </div>
  );
}
