"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { loginUser, signUpUser } from "../lib/auth";
import FloatingSettings from "./FloatingSettings";

interface AuthFormProps {
  mode: "login" | "signup";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        if (!name.trim()) throw new Error("Please enter your name.");
        await signUpUser(name, email, password);
        window.location.href = "/onboarding";
      } else {
        await loginUser(email, password);
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <FloatingSettings />
      <div className="auth-shell">
        <section className="auth-brand-panel">
          {isSignup ? (
            <div className="flex flex-col gap-6 select-none">
              <div>
                <p className="auth-eyebrow text-emerald-500 font-extrabold uppercase tracking-[0.2em] text-xs">
                  Offside AI Account
                </p>
                <h1 className="mt-3 text-4xl md:text-5xl font-black leading-tight tracking-tight text-white uppercase">
                  Unleash Your Personal Match Day Dashboard.
                </h1>
              </div>

              <div className="flex flex-col gap-5 mt-4">
                {/* Feature 1 */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-emerald-400 mt-0.5">
                    {/* Stadium Icon */}
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A11.952 11.952 0 0 1 12 16.5c-2.998 0-5.74-1.1-7.843-2.918m0 0A8.959 8.959 0 0 1 3 12c0-.778.099-1.533.284-2.253" />
                    </svg>
                  </div>
                  <p className="text-[13px] text-zinc-300 leading-relaxed">
                    <span className="font-extrabold text-white tracking-wider mr-1.5 uppercase">Match Page:</span>
                    Get date, venue, and kickoff time at a glance.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-emerald-400 mt-0.5">
                    {/* Nearby Stays Icon */}
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0V12m7.5 0v4.5m-7.5-4.5h7.5m-7.5 0V7.5a2.25 2.25 0 0 1 2.25-2.25h3a2.25 2.25 0 0 1 2.25 2.25V12" />
                    </svg>
                  </div>
                  <p className="text-[13px] text-zinc-300 leading-relaxed">
                    <span className="font-extrabold text-white tracking-wider mr-1.5 uppercase">Nearby Stays:</span>
                    Personalized recommendations with distance and price range.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-emerald-400 mt-0.5">
                    {/* Transport Icon */}
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h7.5m-7.5 0h-1.5A2.25 2.25 0 0 1 3 16.5v-1.5m15 3.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.5a2.25 2.25 0 0 0 2.25-2.25v-1.5M3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25V15M3 15h18M5.25 7.5h13.5m-13.5 3h13.5m-13.5 3h13.5" />
                    </svg>
                  </div>
                  <p className="text-[13px] text-zinc-300 leading-relaxed">
                    <span className="font-extrabold text-white tracking-wider mr-1.5 uppercase">Transport Directions:</span>
                    Detailed Cab, Metro, Bus, Walking routes.
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-emerald-400 mt-0.5">
                    {/* Hang Outs Icon */}
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.082 9.75 3 16.832m10.082-7.082L17.164 3.664a1.875 1.875 0 0 1 2.652 2.652L13.732 12.4m-3.65-2.65 2.65-2.65m-2.65 2.65L3 3.664a1.875 1.875 0 1 1 2.652 2.652L10.082 10.7m-2.65 4.35H3v3.75a2.25 2.25 0 0 0 2.25 2.25H9v-4.35m8.25-2.25H21v3.75a2.25 2.25 0 0 1-2.25 2.25H15v-4.35" />
                    </svg>
                  </div>
                  <p className="text-[13px] text-zinc-300 leading-relaxed">
                    <span className="font-extrabold text-white tracking-wider mr-1.5 uppercase">Hang Outs:</span>
                    Curated food and pre/post-match recommendations.
                  </p>
                </div>

                {/* Feature 5 */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-emerald-400 mt-0.5">
                    {/* Plan Management Icon */}
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M9 3.75a2.25 2.25 0 0 1 2.25-2.25h1.5A2.25 2.25 0 0 1 15 3.75M9 3.75h6m-6 9h6m-6 3h6" />
                    </svg>
                  </div>
                  <p className="text-[13px] text-zinc-300 leading-relaxed">
                    <span className="font-extrabold text-white tracking-wider mr-1.5 uppercase">Plan Management:</span>
                    Save plans, share with friends, and get match reminders.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="auth-brand-mark">O</div>
              <p className="auth-eyebrow">Offside AI account</p>
              <h1 className="auth-heading">
                Keep your match dashboard tuned to your teams.
              </h1>
              <p className="auth-copy">
                Sign in to keep followed teams separate for each user and make the schedule view feel personal from the first click.
              </p>
            </>
          )}
        </section>

        <section className="auth-card">
          {/* Back button */}
          <div className="mb-6">
            <Link 
              href="/" 
              className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider bg-transparent border-none outline-none cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Back
            </Link>
          </div>

          <h2 className="auth-card-title">
            {isSignup ? "Create your account" : "Welcome back"}
          </h2>
          <p className="auth-card-subtitle">
            {isSignup ? "Save your favorite teams under your own profile." : "Log in to load your saved favorite teams."}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {isSignup && (
              <label className="auth-field">
                <span className="auth-label">Name</span>
                <input
                  className="auth-input"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </label>
            )}

            <label className="auth-field">
              <span className="auth-label">Email</span>
              <input
                className="auth-input"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                required
              />
            </label>

            <label className="auth-field">
              <span className="auth-label">Password</span>
              <input
                className="auth-input"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="Enter password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={4}
                required
              />
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button
              className="auth-submit flex items-center justify-center gap-2 cursor-pointer"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span>{isSignup ? "Creating..." : "Logging in..."}</span>
                </>
              ) : (
                isSignup ? "Create Account" : "Login"
              )}
            </button>
          </form>

          <p className="auth-switch">
            {isSignup ? "Already have an account? " : "New to Offside AI? "}
            <Link className="auth-link" href={isSignup ? "/login" : "/signup"}>
              {isSignup ? "Login" : "Create one"}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
