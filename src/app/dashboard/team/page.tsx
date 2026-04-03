"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { UserPlus, Shield, X, Send, Loader2, Users } from "lucide-react";
import { teamApi, getActiveFarmId, type TeamMember } from "@/lib/api";

const stagger: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } };

const ROLE_LABELS: Record<string, string> = { owner: "Owner", manager: "Manager", worker: "Worker / Student", consultant: "Consulting Vet" };

export default function TeamPage() {
  const [members, setMembers]         = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const farmId = getActiveFarmId();

  const [inv, setInv] = useState({ email: "", role: "worker" });
  const [invBusy, setInvBusy] = useState(false);
  const [invErr,  setInvErr]  = useState("");
  const [invOk,   setInvOk]   = useState(false);

  const load = async () => {
    if (!farmId) return;
    try { const r = await teamApi.getAll(farmId); setMembers(r.data || []); }
    catch {}
    finally { setIsLoading(false); }
  };
  useEffect(() => { load(); }, [farmId]);

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId) return;
    setInvBusy(true); setInvErr("");
    try {
      await teamApi.invite(farmId, inv.email, inv.role);
      setInvOk(true);
      await load();
      setTimeout(() => { setIsInviteOpen(false); setInvOk(false); setInv({ email: "", role: "worker" }); }, 2000);
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
            <p className="text-gray-500 font-medium mt-1">Manage farm access logic and role-based permissions.</p>
          </div>
          <button onClick={() => setIsInviteOpen(true)} className="bg-black text-white px-3.5 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Invite Member
          </button>
        </div>

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
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

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
                  <p className="text-gray-500 text-sm">An email has been sent to <strong>{inv.email}</strong> with instructions to join your farm.</p>
                </div>
              ) : (
                <form onSubmit={submitInvite} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Invite Member</h2>
                    <p className="text-gray-500 font-medium text-sm mt-1">Send an invitation to a student, worker, or consulting vet.</p>
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
                    {invBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Invitation</>}
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
