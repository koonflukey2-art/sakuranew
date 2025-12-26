"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthSignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") || "/dashboard",
    [searchParams]
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nextErrors: FieldErrors = {};
    const trimmedEmail = email.trim().toLowerCase();

    if (name.trim().length > 0 && name.trim().length < 2) {
      nextErrors.name = "Name must be at least 2 characters.";
    }

    if (!trimmedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!emailRegex.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    const response = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || null,
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setFormError(payload?.error || "Failed to create account");
      setLoading(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl,
      remember: rememberMe,
    });

    setLoading(false);

    if (signInResult?.error) {
      setFormError("Account created, but sign-in failed. Please try signing in.");
      return;
    }

    router.push(callbackUrl);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-5xl flex-col items-center justify-center gap-12 lg:flex-row">
        <div className="max-w-xl text-center lg:text-left">
          <p className="text-sm uppercase tracking-[0.4em] text-emerald-400/80">
            Sakura Auth
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
            Create your account
          </h1>
          <p className="mt-4 text-base text-slate-300">
            Join the team to unlock dashboards, alerts, and AI insights tailored
            to your organization.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Secure credentials and role-based access
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-black/40">
            <div>
              <h2 className="text-2xl font-semibold text-white">Sign up</h2>
              <p className="text-sm text-slate-400">
                Create your account in under a minute.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block text-sm text-slate-300">
                Name (optional)
                <input
                  type="text"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Your name"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
                {errors.name ? (
                  <span id="name-error" className="mt-2 block text-xs text-red-300">
                    {errors.name}
                  </span>
                ) : null}
              </label>

              <label className="block text-sm text-slate-300">
                Email
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="you@company.com"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email ? (
                  <span id="email-error" className="mt-2 block text-xs text-red-300">
                    {errors.email}
                  </span>
                ) : null}
              </label>

              <label className="block text-sm text-slate-300">
                Password
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="At least 8 characters"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "password-error" : undefined}
                />
                {errors.password ? (
                  <span
                    id="password-error"
                    className="mt-2 block text-xs text-red-300"
                  >
                    {errors.password}
                  </span>
                ) : null}
              </label>

              <label className="block text-sm text-slate-300">
                Confirm password
                <input
                  type="password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Re-enter password"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={
                    errors.confirmPassword ? "confirm-password-error" : undefined
                  }
                />
                {errors.confirmPassword ? (
                  <span
                    id="confirm-password-error"
                    className="mt-2 block text-xs text-red-300"
                  >
                    {errors.confirmPassword}
                  </span>
                ) : null}
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500/40"
                />
                Remember me on this device
              </label>

              {formError ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {formError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </button>
            </form>

            <p className="text-sm text-slate-400">
              Already have an account?{" "}
              <a
                href="/auth/sign-in"
                className="font-medium text-emerald-400 hover:text-emerald-300"
              >
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
