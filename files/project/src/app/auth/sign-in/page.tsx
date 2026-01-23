"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";

type FieldErrors = {
  email?: string;
  password?: string;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthSignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") || "/dashboard",
    [searchParams]
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const validate = () => {
    const nextErrors: FieldErrors = {};
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) nextErrors.email = "กรุณากรอกอีเมล";
    else if (!emailRegex.test(trimmedEmail))
      nextErrors.email = "รูปแบบอีเมลไม่ถูกต้อง";

    if (!password) nextErrors.password = "กรุณากรอกรหัสผ่าน";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl,
      remember: rememberMe,
    });

    setLoading(false);

    if (result?.error) {
      setFormError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    router.push(callbackUrl);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10">
      {/* Background / effects */}
      <div className="pointer-events-none absolute inset-0">
        {/* soft gradient haze */}
        <div className="absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-fuchsia-500/20 via-purple-500/15 to-sky-500/20 blur-3xl" />
        <div className="absolute -left-28 top-28 h-[460px] w-[460px] rounded-full bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-cyan-500/10 blur-3xl animate-blob" />
        <div className="absolute -right-28 bottom-20 h-[460px] w-[460px] rounded-full bg-gradient-to-tr from-pink-500/10 via-fuchsia-500/10 to-indigo-500/10 blur-3xl animate-blob animation-delay-2000" />

        {/* subtle grid */}
        <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:52px_52px]" />

        {/* rotating ring */}
        <div className="absolute left-1/2 top-1/2 h-[780px] w-[780px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="absolute left-1/2 top-1/2 h-[780px] w-[780px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 [mask-image:linear-gradient(to_bottom,transparent,black,transparent)]" />
        <div className="absolute left-1/2 top-1/2 h-[780px] w-[780px] -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border border-transparent border-t-emerald-400/30 border-r-fuchsia-400/20" style={{ animationDuration: "18s" }} />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border border-transparent border-t-sky-400/25 border-l-purple-400/20" style={{ animationDuration: "26s" }} />

        {/* vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.06),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/40" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-2">
          {/* Left: brand */}
          <div className="flex flex-col justify-center text-center lg:text-left">
            <div className="inline-flex items-center gap-2 self-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200 backdrop-blur lg:self-start">
              <Shield className="h-4 w-4 text-emerald-300" />
              พอร์ทัลพนักงาน • เข้าสู่ระบบ
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              ยินดีต้อนรับกลับมา
            </h1>
            <p className="mt-4 max-w-xl text-base text-slate-300">
              เข้าสู่ระบบเพื่อใช้งานระบบภายในบริษัท
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                ระบบภายใน
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                ปลอดภัย
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                ใช้งานง่าย
              </span>
            </div>
          </div>

          {/* Right: form */}
          <div className="mx-auto w-full max-w-md">
            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
              {/* top glow */}
              <div className="pointer-events-none absolute inset-x-0 -top-px h-20 rounded-3xl bg-gradient-to-b from-emerald-500/15 to-transparent" />

              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-white">เข้าสู่ระบบ</h2>
                <p className="mt-1 text-sm text-slate-300">
                  กรุณากรอกอีเมลและรหัสผ่าน
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                {/* Email */}
                <label className="block text-sm text-slate-200">
                  อีเมล
                  <div className="relative mt-2">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-400/60 focus:bg-black/35 focus:ring-2 focus:ring-emerald-500/15"
                      placeholder="name@company.com"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "email-error" : undefined}
                    />
                  </div>
                  {errors.email ? (
                    <span id="email-error" className="mt-2 block text-xs text-red-200">
                      {errors.email}
                    </span>
                  ) : null}
                </label>

                {/* Password */}
                <label className="block text-sm text-slate-200">
                  รหัสผ่าน
                  <div className="relative mt-2">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPw ? "text" : "password"}
                      name="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-11 text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-400/60 focus:bg-black/35 focus:ring-2 focus:ring-emerald-500/15"
                      placeholder="••••••••"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? "password-error" : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                      aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password ? (
                    <span id="password-error" className="mt-2 block text-xs text-red-200">
                      {errors.password}
                    </span>
                  ) : null}
                </label>

                <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-black/30 text-emerald-500 focus:ring-emerald-500/40"
                    />
                    จำฉันไว้
                  </label>
                  <span className="text-xs text-slate-400">คงสถานะการเข้าสู่ระบบ</span>
                </div>

                {formError ? (
                  <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {formError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="absolute inset-0 opacity-0 transition group-hover:opacity-100 [background-image:radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.45),transparent_55%)]" />
                  {loading ? (
                    <>
                      <span className="relative h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                      <span className="relative">กำลังเข้าสู่ระบบ...</span>
                    </>
                  ) : (
                    <span className="relative">เข้าสู่ระบบ</span>
                  )}
                </button>
              </form>

              <p className="mt-6 text-sm text-slate-300">
                ยังไม่มีบัญชี?{" "}
                <a href="/auth/sign-up" className="font-medium text-emerald-300 hover:text-emerald-200">
                  สมัครสมาชิก
                </a>
              </p>

              <p className="mt-3 text-xs text-slate-400">
                สำหรับการใช้งานภายในองค์กรเท่านั้น
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
