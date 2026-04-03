"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { authApi, setTokens, setActiveFarmId } from "@/lib/api";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");
    const type = searchParams.get("type");

    if (type === "google" && token) {
      // Google OAuth: token IS the access token
      // We need to fetch the user info
      localStorage.setItem("agriflow_token", token);
      authApi.getMe()
        .then(({ data }) => {
          setStatus("success");
          if (data.farms.length > 0) {
            setActiveFarmId(data.farms[0].farm._id);
            setTimeout(() => router.push("/dashboard"), 1500);
          } else {
            setTimeout(() => router.push("/onboarding"), 1500);
          }
        })
        .catch(() => {
          setStatus("error");
          setMessage("Google login failed. Please try again.");
        });
      return;
    }

    if (!token || !email) {
      setStatus("error");
      setMessage("Invalid verification link. Please request a new one.");
      return;
    }

    authApi.verifyMagicLink(token, email)
      .then(({ data }) => {
        setTokens(data.accessToken, data.refreshToken);
        setStatus("success");
        setMessage(`Welcome back, ${data.user.name}!`);
        if (data.hasCompletedOnboarding && data.farms.length > 0) {
          setActiveFarmId(data.farms[0].farm._id);
          setTimeout(() => router.push("/dashboard"), 1500);
        } else {
          setTimeout(() => router.push("/onboarding"), 1500);
        }
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.message || "Verification failed. The link may have expired.");
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 max-w-sm mx-auto px-6"
      >
        {status === "loading" && (
          <>
            <div className="w-16 h-16 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Verifying your link...</h1>
              <p className="text-gray-500 mt-2">Please wait a moment.</p>
            </div>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Verified!</h1>
              <p className="text-gray-400 mt-2">{message || "Redirecting you now..."}</p>
            </div>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Verification Failed</h1>
              <p className="text-gray-400 mt-2">{message}</p>
            </div>
            <a href="/auth" className="inline-block mt-4 bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
              Back to Login
            </a>
          </>
        )}
      </motion.div>
    </div>
  );
}
