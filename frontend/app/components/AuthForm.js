"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { registerApi, loginApi } from "../utils/api";

export default function AuthForm({ initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & error states
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [apiSuccess, setApiSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // Reset errors when mode changes
  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setApiError("");
    setApiSuccess("");
    setFieldErrors({});
  };

  // Email regex validator
  const validateEmail = (val) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  // Client-side form validation
  const validateForm = () => {
    const errors = {};

    if (mode === "register") {
      if (!name.trim()) {
        errors.name = "Full name is required";
      } else if (name.trim().length < 2) {
        errors.name = "Name must be at least 2 characters";
      }
    }

    if (!email.trim()) {
      errors.email = "Email address is required";
    } else if (!validateEmail(email.trim())) {
      errors.email = "Please enter a valid email address (e.g. name@example.com)";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (mode === "register") {
      if (!confirmPassword) {
        errors.confirmPassword = "Please confirm your password";
      } else if (password !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    setApiSuccess("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "register") {
        // Registration Flow
        await registerApi({
          name: name.trim(),
          email: email.trim(),
          password,
        });

        setApiSuccess("Registration successful! Account created in MongoDB. Please log in.");
        // Switch to login tab and retain email
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setFieldErrors({});
      } else {
        // Login Flow
        const result = await loginApi({
          email: email.trim(),
          password,
        });

        if (result?.token && result?.user) {
          login(result.user, result.token);
          setApiSuccess("Login successful! Redirecting to Dashboard...");
          setTimeout(() => {
            router.push("/dashboard");
          }, 600);
        }
      }
    } catch (err) {
      const errMsg = err.message || "An unexpected error occurred. Please try again.";
      setApiError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-indigo-600 font-medium">
          <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Checking authentication status...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-slate-50 px-4 py-12 text-slate-900 overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-200/50 via-purple-200/40 to-pink-200/30 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-blue-200/40 blur-3xl pointer-events-none rounded-full" />

      {/* Main Container Card */}
      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              RE
            </div>
            <span className="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-600">
              RESecure
            </span>
          </Link>
          <p className="text-slate-600 text-sm">
            AI Screenshot Intelligence Platform • MongoDB Auth
          </p>
        </div>

        {/* Card Wrapper */}
        <div className="bg-white backdrop-blur-xl border border-slate-200 rounded-3xl p-8 shadow-2xl shadow-slate-200/50">
          {/* Toggle Tabs: Register vs Login */}
          <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => handleModeSwitch("login")}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                mode === "login"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("register")}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                mode === "register"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Alert Banners */}
          {apiError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-3 animate-shake">
              <span className="text-lg leading-none">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold">{apiError}</p>
                {apiError.includes("Please register first") && mode === "login" && (
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("register")}
                    className="mt-2 text-xs font-bold text-indigo-600 underline hover:text-indigo-800"
                  >
                    Click here to Register
                  </button>
                )}
                {apiError.includes("already exists") && mode === "register" && (
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("login")}
                    className="mt-2 text-xs font-bold text-indigo-600 underline hover:text-indigo-800"
                  >
                    Click here to Sign In
                  </button>
                )}
              </div>
            </div>
          )}

          {apiSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm flex items-center gap-3">
              <span className="text-lg">✅</span>
              <p className="font-medium">{apiSuccess}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field (Register Mode Only) */}
            {mode === "register" && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: null });
                  }}
                  className={`w-full bg-white border ${
                    fieldErrors.name ? "border-rose-500 focus:ring-rose-500" : "border-slate-200 focus:border-indigo-500"
                  } rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all`}
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-rose-500 font-medium">{fieldErrors.name}</p>
                )}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: null });
                }}
                className={`w-full bg-white border ${
                  fieldErrors.email ? "border-rose-500 focus:ring-rose-500" : "border-slate-200 focus:border-indigo-500"
                } rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all`}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: null });
                  }}
                  className={`w-full bg-white border ${
                    fieldErrors.password ? "border-rose-500 focus:ring-rose-500" : "border-slate-200 focus:border-indigo-500"
                  } rounded-xl px-4 py-3 pr-11 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 text-xs px-1.5 py-1 rounded transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password Field (Register Mode Only) */}
            {mode === "register" && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword)
                        setFieldErrors({ ...fieldErrors, confirmPassword: null });
                    }}
                    className={`w-full bg-white border ${
                      fieldErrors.confirmPassword ? "border-rose-500 focus:ring-rose-500" : "border-slate-200 focus:border-indigo-500"
                    } rounded-xl px-4 py-3 pr-11 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 text-xs px-1.5 py-1 rounded transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-rose-500 font-medium">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{mode === "register" ? "Creating Account..." : "Signing In..."}</span>
                </>
              ) : (
                <span>{mode === "register" ? "Register Account" : "Sign In to RESecure"}</span>
              )}
            </button>
          </form>

          {/* Footer toggle prompt */}
          <div className="mt-6 pt-6 border-t border-slate-200 text-center text-xs text-slate-600">
            {mode === "login" ? (
              <p>
                Don't have an account yet?{" "}
                <button
                  type="button"
                  onClick={() => handleModeSwitch("register")}
                  className="text-indigo-600 font-semibold hover:underline hover:text-indigo-700"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p>
                Already registered in MongoDB?{" "}
                <button
                  type="button"
                  onClick={() => handleModeSwitch("login")}
                  className="text-indigo-600 font-semibold hover:underline hover:text-indigo-700"
                >
                  Sign in to your account
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
