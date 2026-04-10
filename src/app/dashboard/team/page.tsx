"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { UserPlus, Shield, X, Send, Loader2, Users, Copy, Check, RefreshCw, QrCode, Link2, MailCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { teamApi, farmApi, getActiveFarmId, type TeamMember, type Farm } from "@/lib/api";

const stagger: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } };

const ROLE_LABELS: Record<string, string> = { owner: "Owner", manager: "Manager", worker: "Worker / Student", consultant: "Consulting Vet" };

export default function TeamPage() {
  const [members, setMembers]       = useState<TeamMember[]>([]);
  const [farm, setFarm]             = useState<Farm | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [showQr, setShowQr]         = useState(false);
  const [copied, setCopied]         = useState<"code" | "link" | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const farmId = getActiveFarmId();

  const [inv, setInv]   = useState({ email: "", role: "worker" });
  const [invBusy, setInvBusy] = useState(false);
  const [invErr, setInvErr]   = useState("");
  const [invOk, setInvOk]     = useState(false);
  const [resending, setResending] = useState<string | null>(null); // memberId being resent
  const [resendOk, setResendOk]   = useState<string | null>(null); // memberId success flash

  const joinUrl = farm
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/onboarding?code=${farm.inviteCode}`
    : "";

  const load = async () => {
    if (!farmId) return;
    try {
      const [teamRes, farmRes] = await Promise.all([
        teamApi.getAll(farmId),
        farmApi.get(farmId),
      ]);
      setMembers(teamRes.data || []);
      setFarm(farmRes.data);
    } catch {}
    finally { setIsLoading(false); }
  };
  useEffect(() => { load(); }, [farmId]);

  const copyToClipboard = async (text: string, type: "code" | "link") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRegenerate = async () => {
    if (!farmId || !confirm("Regenerate the join code? The old code will stop working.")) return;
    setRegenerating(true);
    try {
      const res = await farmApi.regenerateInviteCode(farmId);
      setFarm(f => f ? { ...f, inviteCode: res.data.inviteCode } : f);
    } catch {}
    finally { setRegenerating(false); }
  };

  const handleResend = async (memberId: string, email: string, role: string) => {
    if (!farmId) return;
    setResending(memberId);
    try {
      await teamApi.invite(farmId, email, role);
      setResendOk(memberId);
      setTimeout(() => setResendOk(null), 2500);
    } catch {}
    finally { setResending(null); }
  };

  const submitInvite = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!farmId) return;
    setInvBusy(true); setInvErr("");
    try {
      await teamApi.invite(farmId, inv.email, inv.role);
      setInvOk(true);
      await load();
      setTimeout(() => { setIsInviteOpen(false); setInvOk(false); setInv({ email: "", role: "worker" }); }, 3000);
    } catch (err) { setInvErr(err instanceof Error ? err.message : "Failed to send invite"); }
    finally { setInvBusy(false); }
  };

  const initials = (name?: string, email?: string) => {
    if (name) return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
    return (email || "?")[0].toUpperCase();
  };

  const avatarColor = (role: string) => {
    const map: Record<string, string> = { owner: "bg-black text-white", manager: "bg-blue-100 text-blue-700", worker: "bg-emerald-100 text-emerald-700", consultant: "bg-purple-100 text-purple-700" };
    return map[role] || "bg-gray-100 text-gray-600";
  };

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="p-5 lg:px-8 lg:py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
            <p className="text-gray-500 font-medium mt-1">Manage farm access and role-based permissions.</p>
          </div>
          <button onClick={() => setIsInviteOpen(true)} className="bg-black text-white px-3.5 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Invite Member
          </button>
        </div>

        {/* Join Code Card */}
        {farm && (
          <motion.div variants={fadeUp} className="bg-white border border-gray-200 rounded-3xl p-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              {/* QR toggle */}
              <button
                onClick={() => setShowQr(v => !v)}
                className="flex-shrink-0 w-20 h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-black transition-colors group"
              >
                <QrCode className="w-7 h-7 text-gray-400 group-hover:text-black transition-colors" />
                <span className="text-xs font-bold text-gray-400 group-hover:text-black transition-colors">{showQr ? "Hide" : "QR"}</span>
              </button>

              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Farm Join Code</p>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black tracking-[0.2em] text-black">{farm.inviteCode}</span>
                    <button
                      onClick={() => copyToClipboard(farm.inviteCode, "code")}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold transition-colors"
                    >
                      {copied === "code" ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Code</>}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <Link2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <p className="text-xs text-gray-400 font-medium truncate">{joinUrl}</p>
                  <button
                    onClick={() => copyToClipboard(joinUrl, "link")}
                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 bg-gray-50 border border-gray-200 hover:border-black rounded-lg text-xs font-bold transition-colors"
                  >
                    {copied === "link" ? <><Check className="w-3 h-3 text-emerald-500" /> Copied</> : <><Copy className="w-3 h-3" /> Link</>}
                  </button>
                </div>

                <p className="text-xs text-gray-400 font-medium">
                  Share this code or link with workers. They enter it on the onboarding screen.
                </p>
              </div>

              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border border-gray-200 hover:border-red-300 hover:text-red-500 rounded-xl text-xs font-bold text-gray-500 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
                Regenerate
              </button>
            </div>

            {/* QR Code panel */}
            <AnimatePresence>
              {showQr && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-6">
                    <div className="p-4 bg-white border-2 border-gray-900 rounded-2xl">
                      <QRCodeSVG
                        value={joinUrl}
                        size={160}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div className="text-center sm:text-left space-y-2">
                      <p className="font-bold text-gray-900">Scan to Join</p>
                      <p className="text-sm text-gray-500 font-medium max-w-xs">
                        Workers can scan this QR code with their phone camera to go directly to the join screen.
                      </p>
                      <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-1.5 inline-block">{farm.inviteCode}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Team list */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48 gap-3 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading team...</div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3 bg-white border border-dashed border-gray-200 rounded-3xl">
            <Users className="w-10 h-10 text-gray-300" />
            <p className="font-medium">No team members yet. Invite someone to collaborate.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((m) => {
              const u = m.user as { name?: string; email?: string; lastLoginAt?: string } | undefined;
              const displayName = u?.name || m.inviteEmail.split("@")[0];
              const displayEmail = u?.email || m.inviteEmail;
              return (
                <motion.div variants={fadeUp} key={m._id} className="bg-white border border-gray-200 rounded-3xl p-6 relative group hover:border-gray-300 transition-colors">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black ${avatarColor(m.role)}`}>
                      {initials(u?.name, m.inviteEmail)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold tracking-tight text-gray-900 leading-tight">{displayName}</h3>
                      <p className="text-sm font-medium text-gray-500 mt-1">{displayEmail}</p>
                    </div>
                    <div className="flex items-center gap-2 justify-center pt-2 flex-wrap">
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700">
                        <Shield className="w-3.5 h-3.5 text-gray-500" /> {ROLE_LABELS[m.role] || m.role}
                      </span>
                      <span className={`px-3 py-1.5 border rounded-lg text-xs font-bold capitalize ${m.status === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
                        {m.status === "pending" ? "Pending Invite" : m.status}
                      </span>
                    </div>
                    {u?.lastLoginAt && (
                      <p className="text-xs text-gray-400 font-medium">Last active: {new Date(u.lastLoginAt).toLocaleDateString()}</p>
                    )}
                    {m.status === "pending" && (
                      <button
                        onClick={() => handleResend(m._id, m.inviteEmail, m.role)}
                        disabled={resending === m._id}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-amber-200 bg-amber-50 hover:border-amber-400 hover:bg-amber-100 rounded-xl text-xs font-bold text-amber-600 transition-colors disabled:opacity-50"
                      >
                        {resendOk === m._id ? (
                          <><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-600">Invite Resent!</span></>
                        ) : resending === m._id ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Resending...</>
                        ) : (
                          <><MailCheck className="w-3.5 h-3.5" /> Resend Invite</>
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Invite Modal */}
      <AnimatePresence>
        {isInviteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsInviteOpen(false); setInvOk(false); }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-3xl p-8 max-w-sm w-full relative z-10">
              <button onClick={() => { setIsInviteOpen(false); setInvOk(false); }} className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-full p-2"><X className="w-5 h-5" /></button>
              {invOk ? (
                <div className="text-center space-y-4 py-4">
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-2xl">✓</div>
                  <h2 className="text-xl font-bold">Invitation Sent!</h2>
                  <p className="text-gray-500 text-sm">
                    An email with a magic join link has been sent to <strong>{inv.email}</strong>.
                  </p>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                    <p className="text-xs font-bold text-gray-500">Or share the join code directly:</p>
                    <p className="text-2xl font-black tracking-widest text-black">{farm?.inviteCode}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitInvite} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Invite Member</h2>
                    <p className="text-gray-500 font-medium text-sm mt-1">Send a magic link invite, or share the join code above.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Email Address</label>
                      <input required type="email" placeholder="colleague@example.com" value={inv.email} onChange={e => setInv(i => ({ ...i, email: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Assign Role</label>
                      <select value={inv.role} onChange={e => setInv(i => ({ ...i, role: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium appearance-none">
                        <option value="worker">Worker / Student</option>
                        <option value="manager">Manager</option>
                        <option value="consultant">Consulting Vet</option>
                      </select>
                    </div>
                  </div>
                  {invErr && <p className="text-sm text-red-500 font-medium">{invErr}</p>}
                  <button type="submit" disabled={invBusy} className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {invBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Magic Link</>}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
