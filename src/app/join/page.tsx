"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Sprout, ArrowRight } from "lucide-react";
import { authApi, setTokens, setActiveFarmId } from "@/lib/api";

function JoinPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token    = searchParams.get("token") || "";
  const email    = searchParams.get("email") || "";
  const farmName = searchParams.get("farm") || "the farm";
  const role     = searchParams.get("role") || "worker";
  const inviter  = searchParams.get("inviter") || "Someone";

  const [name, setName]     = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // If params are missing, show an error immediately
  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setMessage("This invitation link is invalid or incomplete. Please ask for a new invite.");
    }
  }, [token, email]);

  const handleAccept = async () => {
    setStatus("loading");
    try {
      const res = await authApi.acceptInvite(token, email, name || undefined);
      const { accessToken, refreshToken, farm, role } = res.data;
      setTokens(accessToken, refreshToken);
      setActiveFarmId(farm._id);
      setStatus("success");
      const dest = (role === "owner" || role === "manager") ? "/dashboard" : "/field";
      setTimeout(() => router.push(dest), 1800);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to accept invitation. It may have expired.");
    }
  };

  const ROLE_LABELS: Record<string, string> = {
    owner: "Owner", manager: "Manager", worker: "Worker / Student", consultant: "Consulting Vet",
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-white text-black flex items-center justify-center rounded-lg">
            <Sprout className="w-5 h-5" />
          </div>
          <span className="text-white text-xl font-bold tracking-tight">AgriFlow AI</span>
        </div>

        <div className="bg-[#141414] border border-[#2a2a2a] rounded-3xl p-8 space-y-6">

          {/* Idle / ready to accept */}
          {(status === "idle" || status === "loading") && token && email && (
            <>
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold text-white">You're Invited!</h1>
                <p className="text-gray-400 font-medium">
                  <span className="text-white">{inviter}</span> invited you to join
                </p>
              </div>

              {/* Farm card */}
              <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                    <Sprout className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold">{farmName}</p>
                    <p className="text-xs text-gray-500 font-medium">Farm workspace</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm pt-1 border-t border-[#2a2a2a]">
                  <span className="text-gray-500">Your role</span>
                  <span className="text-emerald-400 font-bold">{ROLE_LABELS[role] || role}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Joining as</span>
                  <span className="text-white font-medium">{email}</span>
                </div>
              </div>

              {/* Optional name field for new users */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">
                  Your name <span className="text-gray-600">(optional — we'll use your email if blank)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chidi Okeke"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={status === "loading"}
                  className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-emerald-500 transition-colors text-sm disabled:opacity-50"
                />
              </div>

              <button
                onClick={handleAccept}
                disabled={status === "loading"}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {status === "loading"
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining...</>
                  : <><CheckCircle2 className="w-4 h-4" /> Accept & Join Farm <ArrowRight className="w-4 h-4" /></>
                }
              </button>

              <p className="text-xs text-gray-600 text-center">
                By accepting, you agree to AgriFlow's terms. Your account will be created automatically if you don't have one.
              </p>
            </>
          )}

          {/* Success */}
          {status === "success" && (
            <div className="text-center space-y-4 py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto"
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold text-white">You're in!</h2>
                <p className="text-gray-400 mt-1">Welcome to {farmName}. Taking you to the dashboard...</p>
              </div>
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mx-auto" />
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Invitation Error</h2>
                <p className="text-gray-400 mt-2 text-sm">{message}</p>
              </div>
              <a
                href="/auth"
                className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors text-sm"
              >
                Go to Login
              </a>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    }>
      <JoinPageInner />
    </Suspense>
  );
}
