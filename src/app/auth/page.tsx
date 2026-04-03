"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError("");
    try {
      await authApi.requestMagicLink(email, mode === "signup" ? name : undefined);
      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/api/auth/google`;
  };

  return (
    <div className="flex min-h-screen bg-[#fcfcfc] text-[#111] selection:bg-black selection:text-white">
      {/* Left side: Branding / Image */}
      <div className="hidden lg:flex w-1/2 bg-[#111] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white mb-6 w-max">
            <div className="w-8 h-8 bg-white text-black flex items-center justify-center rounded-lg">A</div>
            AgriFlow
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-medium tracking-tight leading-tight mb-6">
            Digitize your farm operations without the friction.
          </h2>
          <p className="text-gray-400 font-medium leading-relaxed">
            Join thousands of African farmers, students, and veterinarians bridging the analog-to-digital gap with intelligent tools.
          </p>
        </div>

        {/* Abstract background elements */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 relative">
        <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors lg:hidden">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>
        <div className="absolute top-8 right-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Secure Login
        </div>

        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-8"
              >
                <div className="space-y-2 text-center lg:text-left">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {mode === "login" ? "Welcome back" : "Create an account"}
                  </h1>
                  <p className="text-gray-500 font-medium">
                    {mode === "login" 
                      ? "Enter your email to receive a secure login link." 
                      : "Start managing your livestock smarter today."}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Google Auth Button */}
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full bg-white border border-gray-200 text-black rounded-xl py-3 font-semibold hover:border-black hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                      <title>Google</title>
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </button>

                  <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-gray-100"></div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">or email</span>
                    <div className="flex-1 h-px bg-gray-100"></div>
                  </div>

                  {/* Magic Link Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === "signup" && (
                      <div>
                        <label className="sr-only">Full name</label>
                        <input
                          type="text"
                          placeholder="Your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-[#f9f9f9] border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black focus:bg-white transition-colors text-sm"
                        />
                      </div>
                    )}
                    <div>
                      <label className="sr-only">Email address</label>
                      <input
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black focus:bg-white transition-colors text-sm"
                      />
                    </div>

                    {error && (
                      <p className="text-sm text-red-500 font-medium text-center">{error}</p>
                    )}

                    <button type="submit" disabled={isLoading} className="w-full bg-black text-white rounded-xl py-3 font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      {isLoading ? "Sending..." : "Send Magic Link"}
                    </button>
                    
                    <p className="text-center text-xs text-gray-400 font-medium pt-2">
                      No password required. We'll send you a secure link to sign in.
                    </p>
                  </form>
                </div>

                <div className="text-center pt-4">
                  <button 
                    onClick={() => setMode(mode === "login" ? "signup" : "login")}
                    className="text-sm font-semibold text-gray-500 hover:text-black transition-colors"
                  >
                    {mode === "login" 
                      ? "Don't have an account? Sign up" 
                      : "Already have an account? Log in"}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="text-center space-y-6"
              >
                <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
                  <p className="text-gray-500 font-medium leading-relaxed">
                    We sent a magic link to <strong className="text-black">{email}</strong>. Click it to securely sign in.
                  </p>
                </div>

                <div className="pt-8 flex flex-col gap-4">
                  <Link href="/onboarding" className="w-full bg-[#f4f4f4] text-black rounded-xl py-3 font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                    Proceed to Onboarding <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button 
                    onClick={() => setIsSubmitted(false)}
                    className="text-sm font-semibold text-gray-400 hover:text-black transition-colors"
                  >
                    Try another email
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
