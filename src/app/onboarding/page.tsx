"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Sprout, Users, Stethoscope, ArrowLeft, QrCode, Search, ChevronRight, CheckCircle2, Building, Notebook, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { farmApi, teamApi, setActiveFarmId } from "@/lib/api";

type Role = "owner" | "worker" | "specialist" | null;

const fadeVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.2 } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
};

function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<Role>(null);

  // Form states
  const [farmName, setFarmName]         = useState("");
  const [livestockType, setLivestockType] = useState("");
  const [inviteCode, setInviteCode]     = useState("");
  const [searchQuery, setSearchQuery]   = useState("");
  const [isBusy, setIsBusy]             = useState(false);
  const [error, setError]               = useState("");

  // Auto-fill join code from ?code= query param (from QR/share link)
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setInviteCode(code.toUpperCase());
      setRole("worker");
      setStep(2);
    }
  }, [searchParams]);

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleFinalSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); setIsBusy(true);
    try {
      if (role === "owner") {
        const res = await farmApi.create({ name: farmName, livestockTypes: livestockType ? [livestockType as any] : [] });
        setActiveFarmId(res.data._id);
      } else if (role === "worker") {
        const res = await farmApi.joinByCode(inviteCode.trim().toUpperCase());
        setActiveFarmId(res.data._id);
      }
      // specialist role: just proceed to dashboard (they need farm owner to accept)
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally { setIsBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-[#111] flex flex-col selection:bg-black selection:text-white">
      {/* minimal header */}
      <header className="px-8 py-6 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded-lg">A</div>
          AgriFlow
        </div>
        <div className="text-sm font-medium text-gray-400 border border-gray-200 px-4 py-1.5 rounded-full">
          Step {step} of 2
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 pb-24 relative">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step-1"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full max-w-3xl space-y-12"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight">Let's set up your workspace.</h1>
                <p className="text-gray-500 font-medium text-base">How will you be using AgriFlow AI?</p>
              </div>

              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid md:grid-cols-3 gap-6">
                
                {/* Role: Owner */}
                <motion.button 
                  variants={itemVariant}
                  onClick={() => handleRoleSelect("owner")}
                  className="text-left bg-white border border-gray-200 p-6 rounded-2xl hover:border-black transition-all group flex flex-col gap-4"
                >
                  <div className="w-12 h-12 bg-gray-50 text-[#111] rounded-xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                    <Sprout className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 tracking-tight">Farm Owner</h3>
                    <p className="text-gray-500 text-sm font-medium leading-relaxed">Create a new workspace for your farm and invite your team.</p>
                  </div>
                </motion.button>

                {/* Role: Worker/Student */}
                <motion.button 
                  variants={itemVariant}
                  onClick={() => handleRoleSelect("worker")}
                  className="text-left bg-white border border-gray-200 p-6 rounded-2xl hover:border-black transition-all group flex flex-col gap-4"
                >
                  <div className="w-12 h-12 bg-gray-50 text-[#111] rounded-xl flex items-center justify-center group-hover:bg-[#111] group-hover:text-white transition-colors">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 tracking-tight">Student / Worker</h3>
                    <p className="text-gray-500 text-sm font-medium leading-relaxed">Join an existing farm using an invite code or barn QR scan.</p>
                  </div>
                </motion.button>

                {/* Role: Specialist/Vet */}
                <motion.button 
                  variants={itemVariant}
                  onClick={() => handleRoleSelect("specialist")}
                  className="text-left bg-white border border-gray-200 p-6 rounded-2xl hover:border-black transition-all group flex flex-col gap-4"
                >
                  <div className="w-12 h-12 bg-gray-50 text-[#111] rounded-xl flex items-center justify-center group-hover:bg-[#111] group-hover:text-white transition-colors">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 tracking-tight">Vet / Consulting</h3>
                    <p className="text-gray-500 text-sm font-medium leading-relaxed">Request temporary read/write access to a client's farm logs.</p>
                  </div>
                </motion.button>

              </motion.div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step-2"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full max-w-xl"
            >
              <button 
                onClick={() => setStep(1)}
                className="mb-8 flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-black transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to roles
              </button>

              <div className="bg-white border border-gray-100 p-8 md:p-10 rounded-[2rem] space-y-8">
                
                {role === "owner" && (
                  <form onSubmit={handleFinalSubmit} className="space-y-8">
                    <div className="space-y-3">
                      <h2 className="text-2xl font-medium tracking-tight">Set up your Farm</h2>
                      <p className="text-gray-500 font-medium">This will create the main workspace for your livestock tracking.</p>
                    </div>
                    
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold tracking-tight">Farm Name</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. FUNAAB Research Farm"
                          value={farmName}
                          onChange={(e) => setFarmName(e.target.value)}
                          className="w-full bg-[#f9f9f9] border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black focus:bg-white transition-colors text-base"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-semibold tracking-tight">Primary Livestock</label>
                        <div className="relative">
                          <select 
                            required
                            value={livestockType}
                            onChange={(e) => setLivestockType(e.target.value)}
                            className="w-full bg-[#f9f9f9] border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black focus:bg-white transition-colors text-base appearance-none cursor-pointer"
                          >
                            <option value="" disabled>Select dominant species</option>
                            <option value="poultry">Poultry / Birds</option>
                            <option value="swine">Swine / Pigs</option>
                            <option value="cattle">Cattle / Cows</option>
                            <option value="aquaculture">Aquaculture / Fish</option>
                            <option value="mixed">Mixed Types</option>
                          </select>
                          <ChevronRight className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}
                    <button type="submit" disabled={isBusy} className="w-full bg-black text-white rounded-xl py-3 font-semibold text-base hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                      {isBusy ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</> : <>Create Workspace <ChevronRight className="w-5 h-5" /></>}
                    </button>
                  </form>
                )}

                {role === "worker" && (
                  <form onSubmit={handleFinalSubmit} className="space-y-8">
                     <div className="space-y-3">
                      <h2 className="text-2xl font-medium tracking-tight">Join your Team</h2>
                      <p className="text-gray-500 font-medium">Use the 6-digit code or scan the barn QR provided by your manager.</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold tracking-tight">Invite Code</label>
                        <input 
                          type="text" 
                          required
                          placeholder="0 0 0 - 0 0 0"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          className="w-full bg-[#f9f9f9] border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black focus:bg-white transition-colors text-xl tracking-[0.2em] font-mono text-center placeholder:tracking-normal placeholder:font-sans"
                        />
                      </div>

                      <div className="flex items-center gap-4 py-2">
                        <div className="flex-1 h-px bg-gray-100"></div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">or</span>
                        <div className="flex-1 h-px bg-gray-100"></div>
                      </div>

                      <button type="button" className="w-full bg-[#f4f4f4] text-black border border-gray-200 rounded-xl py-3 font-semibold text-base hover:border-black transition-colors flex items-center justify-center gap-3">
                         <QrCode className="w-5 h-5" /> Scan Barn QR
                      </button>
                    </div>

                    {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}
                    <button type="submit" disabled={isBusy} className="w-full bg-black text-white rounded-xl py-3 font-semibold text-base hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                      {isBusy ? <><Loader2 className="w-5 h-5 animate-spin" /> Joining...</> : <>Join Farm <ChevronRight className="w-5 h-5" /></>}
                    </button>
                  </form>
                )}

                {role === "specialist" && (
                  <form onSubmit={handleFinalSubmit} className="space-y-8">
                     <div className="space-y-3">
                      <h2 className="text-2xl font-medium tracking-tight">Request Access</h2>
                      <p className="text-gray-500 font-medium">Search for a client's farm to request secure access to their records.</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2 relative">
                        <label className="text-sm font-semibold tracking-tight">Farm Name or ID</label>
                        <div className="relative">
                           <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input 
                            type="text" 
                            required
                            placeholder="Find a farm..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#f9f9f9] border border-gray-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-black focus:bg-white transition-colors text-base"
                          />
                        </div>
                      </div>

                      {/* Mock Search Results */}
                      {searchQuery.length > 2 && (
                        <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="bg-[#f9f9f9] border border-gray-200 rounded-2xl p-2 space-y-1">
                          <div className="p-3 hover:bg-white rounded-xl cursor-pointer transition-colors flex items-center gap-3 border border-transparent hover:border-gray-200">
                             <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center"><Building className="w-5 h-5" /></div>
                             <div>
                               <div className="font-semibold text-sm">Ogun State Cooperative</div>
                               <div className="text-xs text-gray-500">ID: OGU-8192</div>
                             </div>
                          </div>
                           <div className="p-3 hover:bg-white rounded-xl cursor-pointer transition-colors flex items-center gap-3 border border-transparent hover:border-gray-200">
                             <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center"><Building className="w-5 h-5" /></div>
                             <div>
                               <div className="font-semibold text-sm">FUNAAB Test Farm</div>
                               <div className="text-xs text-gray-500">ID: FUN-1029</div>
                             </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <button type="submit" className="w-full bg-black text-white rounded-xl py-3 font-semibold text-base hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                       Send Access Request <ChevronRight className="w-5 h-5" />
                    </button>
                  </form>
                )}

              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step-3"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              className="w-full max-w-md text-center space-y-8"
            >
               <motion.div 
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                 className="w-24 h-24 bg-[#111] text-white rounded-full flex items-center justify-center mx-auto"
               >
                 <CheckCircle2 className="w-12 h-12" />
               </motion.div>

               <div className="space-y-3">
                 <h2 className="text-2xl font-medium tracking-tight">You're all set!</h2>
                 <p className="text-gray-500 font-medium leading-relaxed">
                   {role === "owner" && "Your workspace has been created. Let's start digitizing those notebooks."}
                   {role === "worker" && "You've successfully connected to the farm. Time to get to work."}
                   {role === "specialist" && "Request sent! The farm owner will be notified to grant you access."}
                 </p>
               </div>

               <Link href="/dashboard" className="inline-flex bg-white py-3 px-6 border border-gray-200 rounded-full font-semibold hover:border-black transition-colors gap-2 items-center text-sm">
                  <Notebook className="w-5 h-5" /> Open My Dashboard
               </Link>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    }>
      <OnboardingFlow />
    </Suspense>
  );
}
