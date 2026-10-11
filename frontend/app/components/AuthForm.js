
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import {
  registerApi,
  loginApi,
  sendVerificationOtpApi,
  verifyEmailOtpApi,
} from "../utils/api";

export default function AuthForm({ initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState("form");

  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [apiSuccess, setApiSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isAuthLoading, router]);

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = setTimeout(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const validateEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setStep("form");
    setApiError("");
    setApiSuccess("");
    setFieldErrors({});
    setOtp("");
  };

  const validateForm = () => {
    const errors = {};

    if (mode === "register") {
      if (!name.trim()) {
        errors.name = "Full name is required.";
      } else if (name.trim().length < 2) {
        errors.name = "Name must contain at least 2 characters.";
      }
    }

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!validateEmail(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must contain at least 6 characters.";
    }

    if (mode === "register") {
      if (!confirmPassword) {
        errors.confirmPassword = "Please confirm your password.";
      } else if (password !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const sendOtp = async () => {
    setApiError("");
    setApiSuccess("");
    setIsSubmitting(true);

    try {
      await sendVerificationOtpApi({
        email: email.trim().toLowerCase(),
      });

      setStep("otp");
      setOtp("");
      setResendSeconds(60);
      setApiSuccess(
        "Verification code sent. Check your inbox and spam folder."
      );
    } catch (error) {
      setApiError(
        error.message || "Unable to send the verification code."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError("");
    setApiSuccess("");

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (mode === "register") {
        await registerApi({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        });

        setStep("otp");
        setOtp("");
        setApiSuccess("Account created. Sending your verification code...");

        try {
          await sendVerificationOtpApi({
            email: email.trim().toLowerCase(),
          });

          setResendSeconds(60);
          setApiSuccess(
            "Account created! A verification code has been sent to your email."
          );
        } catch (error) {
          setApiError(
            `${error.message || "Could not send the code."} Use Resend Code to try again.`
          );
        }
      } else {
        const result = await loginApi({
          email: email.trim().toLowerCase(),
          password,
        });

        if (result?.token && result?.user) {
          login(result.user, result.token);
          router.push("/dashboard");
        } else {
          setApiError(
            "Login response was incomplete. Please try again."
          );
        }
      }
    } catch (error) {
      const message = error.message || "An unexpected error occurred.";

      const needsVerification =
        mode === "login" &&
        (error.status === 403 ||
          /verify your email|email not verified|not verified/i.test(
            message
          ));

      if (needsVerification) {
        setApiError("Please verify your email before logging in.");
      } else {
        setApiError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setApiError("");
    setApiSuccess("");

    if (!/^\d{6}$/.test(otp)) {
      setApiError("Enter the six-digit verification code.");
      return;
    }

    setIsSubmitting(true);

    try {
      await verifyEmailOtpApi({
        email: email.trim().toLowerCase(),
        otp,
      });

      setStep("form");
      setMode("login");
      setPassword("");
      setConfirmPassword("");
      setOtp("");
      setResendSeconds(0);
      setApiSuccess(
        "Email verified successfully! You can now sign in."
      );
    } catch (error) {
      setApiError(
        error.message || "Verification failed. Check the code and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (isSubmitting || resendSeconds > 0) return;
    await sendOtp();
  };

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-[#0b0c10] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/15 disabled:opacity-60";

  const labelClass = "mb-2 block text-sm font-medium text-slate-200";

  if (isAuthLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0b0f] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-teal-400/30 border-t-teal-400" />
          <p className="text-sm text-slate-400">
            Checking authentication status...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#263944] px-3 py-5 text-white sm:px-6 sm:py-8">
      {/* Atmospheric background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_30%,rgba(29,104,111,0.6),transparent_42%),radial-gradient(ellipse_at_90%_85%,rgba(225,151,139,0.4),transparent_35%),linear-gradient(145deg,#425d68,#172b39_55%,#d0a39d)]" />

      <div className="relative z-10 grid min-h-[min(900px,calc(100vh-40px))] w-full max-w-[1400px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c10] shadow-2xl shadow-black/30 lg:grid-cols-[0.88fr_1.12fr]">
        {/* Left welcome panel */}
        <section className="relative hidden flex-col overflow-hidden border-r border-white/10 bg-gradient-to-br from-[#103541] via-[#102b39] to-[#073a3a] p-9 sm:p-12 lg:flex xl:p-14">
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400 text-sm font-extrabold text-[#06252a]">
                RE
              </span>
              <span className="text-2xl font-bold tracking-tight">
                ReSurface<span className="text-teal-300">.</span>
              </span>
            </Link>

            <div className="mt-16 xl:mt-20">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">
                YOUR PERSONAL WORKSPACE
              </p>
              <h1 className="mt-4 max-w-lg text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
                Welcome to ReSurface
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
                Bring your digital life into focus. Follow the steps to
                get started with your workspace.
              </p>
            </div>

            <div className="mt-10 space-y-3">
              {[
                {
                  number: "1",
                  title: "Create your account",
                  description: "Set up your personal workspace",
                },
                {
                  number: "2",
                  title: "Organize your screenshots",
                  description: "Keep important information together",
                },
                {
                  number: "3",
                  title: "Discover useful insights",
                  description: "Turn saved information into action",
                },
              ].map((item, index) => (
                <div
                  key={item.number}
                  className={`flex items-center gap-4 rounded-xl border p-4 transition ${index === 0
                      ? "border-white/80 bg-white text-slate-900"
                      : "border-white/5 bg-white/[0.035] text-slate-200"
                    }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${index === 0
                        ? "bg-slate-900 text-white"
                        : "bg-white/10 text-white"
                      }`}
                  >
                    {item.number}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p
                      className={`mt-1 text-xs ${index === 0 ? "text-slate-500" : "text-slate-400"
                        }`}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-auto pt-12">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="h-px w-8 bg-teal-300/70" />
              A smarter way to remember what you see.
            </div>
          </div>
        </section>

        {/* Right authentication panel */}
        <section className="flex min-w-0 items-center justify-center bg-[#0b0c10] px-5 py-10 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">
            {/* Mobile brand */}
            <div className="mb-9 flex items-center gap-3 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-400 font-bold text-[#06252a]">
                RE
              </span>
              <span className="text-xl font-bold">
                ReSurface<span className="text-teal-300">.</span>
              </span>
            </div>

            <div className="mb-7">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
                {step === "otp"
                  ? "EMAIL VERIFICATION"
                  : mode === "login"
                    ? "WELCOME BACK"
                    : "GET STARTED"}
              </p>

              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {step === "otp"
                  ? "Verify your email"
                  : mode === "login"
                    ? "Sign in to ReSurface"
                    : "Create your account"}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {step === "otp"
                  ? `Enter the six-digit code sent to ${email}.`
                  : mode === "login"
                    ? "Enter your details to access your workspace."
                    : "Fill in your details to get started."}
              </p>
            </div>

            {step === "form" && (
              <div className="mb-6 flex rounded-lg border border-white/10 bg-[#090a0d] p-1">
                {["login", "register"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleModeSwitch(item)}
                    disabled={isSubmitting}
                    className={`flex-1 rounded-md px-3 py-3 text-sm font-semibold transition ${mode === item
                        ? "bg-teal-400 text-[#06252a]"
                        : "text-slate-400 hover:text-white"
                      }`}
                  >
                    {item === "login" ? "Sign In" : "Create Account"}
                  </button>
                ))}
              </div>
            )}

            {apiError && (
              <div
                role="alert"
                className="mb-5 rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-sm leading-6 text-rose-300"
              >
                {apiError}

                {step === "form" &&
                  mode === "login" &&
                  /verify your email|not verified/i.test(apiError) && (
                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={isSubmitting}
                      className="mt-2 block font-semibold underline underline-offset-4"
                    >
                      Send verification code
                    </button>
                  )}

                {step === "form" &&
                  mode === "login" &&
                  /please register first/i.test(apiError) && (
                    <button
                      type="button"
                      onClick={() => handleModeSwitch("register")}
                      className="mt-2 block font-semibold underline underline-offset-4"
                    >
                      Create an account
                    </button>
                  )}
              </div>
            )}

            {apiSuccess && (
              <div
                role="status"
                className="mb-5 rounded-lg border border-teal-400/20 bg-teal-400/10 p-3 text-sm leading-6 text-teal-200"
              >
                {apiSuccess}
              </div>
            )}

            {step === "otp" ? (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label htmlFor="verification-otp" className={labelClass}>
                    Six-digit verification code
                  </label>
                  <input
                    id="verification-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    disabled={isSubmitting}
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    placeholder="000000"
                    className={`${inputClass} py-4 text-center text-2xl tracking-[0.5em]`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || otp.length !== 6}
                  className="w-full rounded-lg bg-teal-400 px-4 py-3.5 text-sm font-semibold text-[#06252a] transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Verifying..." : "Verify Email"}
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isSubmitting || resendSeconds > 0}
                  className="w-full py-2 text-sm font-medium text-teal-300 hover:text-teal-200 disabled:text-slate-600"
                >
                  {resendSeconds > 0
                    ? `Resend code in ${resendSeconds}s`
                    : "Resend verification code"}
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setStep("form");
                    setOtp("");
                    setApiError("");
                    setApiSuccess("");
                  }}
                  className="w-full py-2 text-sm text-slate-400 hover:text-white"
                >
                  Back to form
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === "register" && (
                  <div>
                    <label htmlFor="register-name" className={labelClass}>
                      Full name
                    </label>
                    <input
                      id="register-name"
                      type="text"
                      autoComplete="name"
                      required
                      disabled={isSubmitting}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Enter your full name"
                      className={inputClass}
                    />
                    {fieldErrors.name && (
                      <p className="mt-2 text-xs text-rose-400">
                        {fieldErrors.name}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email" className={labelClass}>
                    Email address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                  {fieldErrors.email && (
                    <p className="mt-2 text-xs text-rose-400">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="auth-password" className={labelClass}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={
                        mode === "register"
                          ? "new-password"
                          : "current-password"
                      }
                      required
                      minLength={6}
                      disabled={isSubmitting}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className={`${inputClass} pr-14`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-teal-300"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-2 text-xs text-rose-400">
                      {fieldErrors.password}
                    </p>
                  )}
                  {mode === "register" && (
                    <p className="mt-2 text-xs text-slate-500">
                      Password must contain at least 6 characters.
                    </p>
                  )}
                </div>

                {mode === "register" && (
                  <div>
                    <label htmlFor="confirm-password" className={labelClass}>
                      Confirm password
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        disabled={isSubmitting}
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        placeholder="Re-enter your password"
                        className={`${inputClass} pr-14`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((value) => !value)
                        }
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-teal-300"
                      >
                        {showConfirmPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="mt-2 text-xs text-rose-400">
                        {fieldErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                )}

                {mode === "login" && (
                  <p className="text-xs text-slate-500">
                    Use your registered email address.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-400 px-4 py-3.5 text-sm font-semibold text-[#06252a] transition hover:bg-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-[#0b0c10] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting
                    ? mode === "login"
                      ? "Signing in..."
                      : "Creating account..."
                    : mode === "login"
                      ? "Sign In to ReSurface →"
                      : "Create Account"}
                </button>
              </form>
            )}

            <div className="mt-7 text-center">
              {step === "form" && (
                <p className="text-sm text-slate-400">
                  {mode === "login"
                    ? "New to ReSurface?"
                    : "Already a member?"}{" "}
                  <button
                    type="button"
                    onClick={() =>
                      handleModeSwitch(
                        mode === "login" ? "register" : "login"
                      )
                    }
                    disabled={isSubmitting}
                    className="font-semibold text-teal-300 hover:text-teal-200"
                  >
                    {mode === "login" ? "Create an account" : "Sign in"}
                  </button>
                </p>
              )}

              <Link
                href="/"
                className="mt-5 inline-block text-xs text-slate-500 transition hover:text-slate-300"
              >
                ← Back to home
              </Link>

              <p className="mt-5 text-[11px] leading-5 text-slate-600">
                ReSurface · AI Screenshot Intelligence Platform
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
