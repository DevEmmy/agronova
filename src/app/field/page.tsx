"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Camera, Mic, Edit3, Wifi, WifiOff,
  CheckCircle2, X, Loader2, Sparkles, BookOpen, Contrast, Send
} from "lucide-react";
import {
  aiApi, authApi, analyticsApi,
  getActiveFarmId, getToken,
  type AgriSnapResult, type AgriTalkResult, type ActivityLog, type User
} from "@/lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionType = any;

const ACTION_LABELS: Record<string, string> = {
  batch_created: "New batch created",
  batch_updated: "Batch updated",
  batch_weight: "Weight recorded",
  feed_created: "Feed item added",
  feed_updated: "Feed updated",
  feed_log: "Feed delivery logged",
  transaction_created: "Transaction recorded",
  team_invited: "Member invited",
  team_joined: "Member joined",
  team_update: "Role updated",
  team_removed: "Member removed",
  ai_snap: "AgriSnap scan",
  ai_talk: "Voice observation",
  ai_manual: "Manual entry",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function FieldUtilityPage() {
  const router = useRouter();

  // Auth guard
  useEffect(() => { if (!getToken()) router.replace("/auth"); }, []);

  const [user, setUser]           = useState<User | null>(null);
  const [activity, setActivity]   = useState<ActivityLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isStudyMode, setIsStudyMode]       = useState(false);
  const [isOffline, setIsOffline]           = useState(false);
  const [toastMsg, setToastMsg]             = useState("");
  const [isDrawerOpen, setIsDrawerOpen]     = useState(false);

  const [activeAction, setActiveAction] = useState<"snap" | "talk" | "manual" | null>(null);

  // AgriSnap state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile]   = useState<File | null>(null);
  const [scanPhase, setScanPhase]         = useState<"idle" | "scanning" | "done">("idle");
  const [snapResult, setSnapResult]       = useState<AgriSnapResult | null>(null);
  const [snapError, setSnapError]         = useState("");
  const [extractedData, setExtractedData] = useState<{ field: string; value: string }[]>([]);

  // AgriTalk state
  const [isListening, setIsListening]     = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [transcribing, setTranscribing]   = useState(false);
  const [talkResult, setTalkResult]       = useState<AgriTalkResult | null>(null);
  const [talkError, setTalkError]         = useState("");

  // Manual input state
  const [manualType, setManualType] = useState("observation");
  const [manualText, setManualText] = useState("");
  const [manualBusy, setManualBusy] = useState(false);
  const [manualResult, setManualResult] = useState<AgriTalkResult | null>(null);
  const [applying, setApplying] = useState(false);

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionType>(null);
  const farmId = getActiveFarmId();

  // ── Load user + recent activity ──────────────────────────────────────────────
  useEffect(() => {
    if (!farmId) return;
    Promise.all([
      authApi.getMe(),
      analyticsApi.getDashboard(farmId),
    ]).then(([meRes, dashRes]) => {
      const me = meRes.data.user;
      setUser(me);
      // Workers only see their own activity
      const all = dashRes.data.recentActivity || [];
      const mine = all.filter(a => {
        const actorId = typeof a.user === "object" && "_id" in a.user ? (a.user as any)._id : null;
        return actorId === me._id;
      });
      setActivity(mine);
    }).catch(() => {}).finally(() => setLoadingData(false));
  }, [farmId]);

  // ── Network status ────────────────────────────────────────────────────────────
  useEffect(() => {
    const go   = () => { setIsOffline(false); showToast("Back online. Syncing records..."); };
    const away = () => { setIsOffline(true);  showToast("Offline. Records will sync when reconnected."); };
    window.addEventListener("online",  go);
    window.addEventListener("offline", away);
    return () => { window.removeEventListener("online", go); window.removeEventListener("offline", away); };
  }, []);

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 4000); };

  // ── Theme ─────────────────────────────────────────────────────────────────────
  const bgMain       = isHighContrast ? "bg-black"      : "bg-[#F8FAF9]";
  const textMain     = isHighContrast ? "text-white"    : "text-[#1B3022]";
  const cardBg       = isHighContrast ? "bg-black border-2 border-white" : "bg-white shadow-sm border border-gray-100";
  const textSub      = isHighContrast ? "text-gray-300" : "text-gray-500";
  const accentBtn    = isHighContrast ? "bg-white text-black" : "bg-[#1B3022] text-white";

  const initials = (name?: string) => name ? name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() : "?";

  // ── AgriSnap ──────────────────────────────────────────────────────────────────
  const openCamera = () => {
    setIsDrawerOpen(false);
    setCapturedImage(null); setCapturedFile(null);
    setScanPhase("idle"); setExtractedData([]); setSnapError(""); setSnapResult(null);
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedImage(URL.createObjectURL(file));
    setCapturedFile(file);
    setActiveAction("snap");
    setScanPhase("scanning");
    setSnapError("");
    e.target.value = "";

    if (!farmId) {
      setTimeout(() => { setScanPhase("done"); setExtractedData([{ field: "Status", value: "No farm selected — log in first" }]); }, 1500);
      return;
    }

    try {
      const result = await aiApi.agriSnap(farmId, file);
      setSnapResult(result);
      setScanPhase("done");
      const rows = result.extractedRecords
        .flatMap(r => Object.entries(r.data).map(([k, v]) => ({ field: k, value: String(v) })))
        .slice(0, 8);
      setExtractedData(rows.length ? rows : [{ field: "Result", value: "No structured data found in image" }]);
    } catch (err) {
      setScanPhase("done");
      setSnapError(err instanceof Error ? err.message : "Extraction failed");
      setExtractedData([{ field: "Error", value: "Could not extract data. Try a clearer photo." }]);
    }
  };

  // ── AgriTalk ──────────────────────────────────────────────────────────────────
  const startTalk = useCallback(() => {
    setIsDrawerOpen(false);
    setActiveAction("talk");
    setLiveTranscript(""); setTranscribing(false); setTalkResult(null); setTalkError(""); setIsListening(true);

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      showToast("Speech recognition not supported in this browser.");
      setIsListening(false); setActiveAction(null);
      return;
    }

    const recognition: SpeechRecognitionType = new SR();
    recognition.continuous    = true;
    recognition.interimResults = true;
    recognition.lang          = "en-US";
    recognitionRef.current    = recognition;

    recognition.onresult = (event: any) => {
      let interim = ""; let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      if (final.trim()) recognition._lastFinal = (recognition._lastFinal || "") + final;
      setLiveTranscript((recognition._lastFinal || "") + interim);
    };

    recognition.onend = async () => {
      setIsListening(false);
      const spoken = (recognitionRef.current?._lastFinal || "").trim();
      if (!spoken) { setTranscribing(false); return; }
      setTranscribing(true);
      try {
        if (farmId) {
          const result = await aiApi.agriTalk(farmId, undefined, spoken);
          setTalkResult(result);
        } else {
          setTalkResult({ transcript: spoken, parsedRecords: [], intent: "unknown", confidence: 0, suggestedActions: [] });
        }
      } catch (err) {
        setTalkError(err instanceof Error ? err.message : "Processing failed");
        setTalkResult({ transcript: spoken, parsedRecords: [], intent: "unknown", confidence: 0, suggestedActions: [] });
      } finally { setTranscribing(false); }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "no-speech") showToast(`Mic error: ${e.error}`);
      setIsListening(false); setTranscribing(false);
    };

    recognition.start();
  }, [farmId]);

  const stopListening = () => recognitionRef.current?.stop();

  useEffect(() => () => recognitionRef.current?.abort(), []);

  // ── Shared: apply parsed records to DB ────────────────────────────────────────
  const applyParsedRecords = async (result: AgriTalkResult) => {
    if (!farmId || !result.parsedRecords?.length) return;
    setApplying(true);
    try {
      await aiApi.applyRecords(farmId, result.parsedRecords);
      showToast("Records saved to farm data!");
      analyticsApi.getDashboard(farmId).then(r => {
        const all = r.data.recentActivity || [];
        setActivity(all.filter(a => { const id = typeof a.user === "object" && "_id" in a.user ? (a.user as any)._id : null; return id === user?._id; }));
      }).catch(() => {});
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save records");
    } finally { setApplying(false); }
  };

  // ── Manual entry ──────────────────────────────────────────────────────────────
  const openManual = () => { setIsDrawerOpen(false); setManualText(""); setManualResult(null); setActiveAction("manual"); };

  const submitManual = async () => {
    if (!manualText.trim()) return;
    setManualBusy(true);
    const fullText = `[${manualType.toUpperCase()}] ${manualText.trim()}`;
    try {
      if (farmId) {
        const result = await aiApi.agriTalk(farmId, undefined, fullText);
        // Auto-apply parsed records immediately
        if (result.parsedRecords?.length > 0) {
          await aiApi.applyRecords(farmId, result.parsedRecords);
        }
        setManualResult(result);
        analyticsApi.getDashboard(farmId).then(r => {
          const all = r.data.recentActivity || [];
          setActivity(all.filter(a => { const id = typeof a.user === "object" && "_id" in a.user ? (a.user as any)._id : null; return id === user?._id; }));
        }).catch(() => {});
      } else {
        setManualResult({ transcript: fullText, parsedRecords: [], intent: manualType, confidence: 1, suggestedActions: [] });
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save entry");
    } finally { setManualBusy(false); }
  };

  return (
    <>
      <div className={`min-h-screen ${bgMain} ${textMain} font-sans selection:bg-emerald-200 selection:text-black transition-colors duration-300 pb-32 flex justify-center`}>
        <div className="w-full max-w-md relative min-h-screen flex flex-col">

          {/* HEADER */}
          <header className="px-6 pt-10 pb-6 shrink-0 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className={`text-sm font-bold tracking-widest uppercase ${textSub}`}>Field Mode Active</p>
                <h1 className="text-3xl font-black mt-1">
                  {user ? `Hey, ${user.name.split(" ")[0]}` : "Loading..."}
                </h1>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${isHighContrast ? "bg-white text-black" : "bg-[#1B3022] text-white"}`}>
                {initials(user?.name)}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${isHighContrast ? "border-white" : "border-gray-200 bg-white"} ${isOffline ? "text-amber-500" : "text-emerald-500"}`}>
                {isOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                {isOffline ? "Offline" : "Online"}
              </div>
              <button
                onClick={() => setIsHighContrast(v => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors ${isHighContrast ? "bg-white text-black border-white" : "bg-white border-gray-200 text-[#1B3022] hover:border-[#1B3022]"}`}
              >
                <Contrast className="w-3.5 h-3.5" /> Sun-Glare Mode
              </button>
              <button
                onClick={() => setIsStudyMode(v => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors ${isStudyMode ? "bg-emerald-50 text-emerald-700 border-emerald-200" : (isHighContrast ? "border-gray-700 text-gray-400" : "bg-white border-gray-200 text-[#1B3022]")}`}
              >
                <BookOpen className="w-3.5 h-3.5" /> Study Mode
              </button>
            </div>
          </header>

          {/* CONTENT */}
          <main className="flex-1 px-6 space-y-8">

            {/* RECENT ACTIVITY */}
            <section>
              <h2 className="text-xl font-black mb-4">Recent Activity</h2>
              {loadingData ? (
                <div className={`${cardBg} rounded-2xl p-6 flex items-center justify-center gap-3 ${textSub}`}>
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading...
                </div>
              ) : activity.length === 0 ? (
                <div className={`${cardBg} rounded-2xl p-8 text-center ${textSub}`}>
                  <p className="font-bold text-sm">No activity yet.</p>
                  <p className="text-xs mt-1">Use the + button to log your first observation.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {activity.slice(0, 8).map((item, i) => {
                    const actor = typeof item.user === "object" && "name" in item.user ? item.user.name : "Unknown";
                    return (
                      <div key={item._id} className="flex gap-4">
                        <div className="relative flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 z-10 ${isHighContrast ? "border-white bg-black" : "bg-emerald-50 border-emerald-100"}`}>
                            <CheckCircle2 className={`w-5 h-5 ${isHighContrast ? "text-white" : "text-emerald-500"}`} />
                          </div>
                          {i < Math.min(activity.length, 8) - 1 && (
                            <div className={`w-0.5 flex-1 mt-1 ${isHighContrast ? "bg-gray-800" : "bg-gray-200"}`} style={{ minHeight: 24 }} />
                          )}
                        </div>
                        <div className="pt-2 pb-4 flex-1 min-w-0">
                          <p className="font-bold leading-tight text-sm">{ACTION_LABELS[item.action] || item.action}</p>
                          <p className={`text-xs mt-0.5 truncate ${textSub}`}>{item.details}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${isHighContrast ? "border border-gray-600 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                              {actor}
                            </span>
                            <span className={`text-xs font-bold ${textSub}`}>{timeAgo(item.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageCapture} className="hidden" />

      {/* TOAST */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 16 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-0 left-1/2 -translate-x-1/2 z-200 w-[90%] max-w-sm px-4 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 ${accentBtn}`}
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}
          onClick={() => setIsDrawerOpen(true)}
          className={`w-16 h-16 rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] flex items-center justify-center relative ${isHighContrast ? "bg-white text-black" : "bg-[#1B3022] text-white"}`}
        >
          <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${isHighContrast ? "bg-white" : "bg-[#1B3022]"}`} />
          <Plus className="w-8 h-8 relative z-10" />
        </motion.button>
      </div>

      {/* QUICK-ACTION DRAWER */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <motion.div
              initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`fixed bottom-0 left-0 right-0 z-60 rounded-t-3xl max-w-md mx-auto ${isHighContrast ? "bg-black border-4 border-white" : "bg-white"} ${textMain}`}
            >
              <div className="p-6 space-y-3">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-black">Log Entry</h2>
                  <button onClick={() => setIsDrawerOpen(false)} className={`p-2 rounded-full ${isHighContrast ? "text-white" : "bg-gray-100"}`}><X className="w-6 h-6" /></button>
                </div>

                {[
                  { icon: Camera,  label: "Scan Paper Log",       sub: "AgriSnap AI extraction",   onClick: openCamera,  accent: true },
                  { icon: Mic,     label: "Voice Observation",    sub: "AgriTalk transcription",    onClick: startTalk,   accent: true },
                  { icon: Edit3,   label: "Input Manually",       sub: "Type records by hand",      onClick: openManual,  accent: false },
                ].map(({ icon: Icon, label, sub, onClick, accent }) => (
                  <motion.button
                    key={label} whileTap={{ scale: 0.96 }}
                    onClick={onClick}
                    className={`w-full p-4 rounded-2xl flex items-center gap-4 text-left border-2 transition-all ${isHighContrast ? "border-gray-700 hover:border-white" : "border-gray-100 hover:border-[#1B3022] bg-gray-50"}`}
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${accent ? accentBtn : (isHighContrast ? "bg-gray-800 text-white" : "bg-gray-200 text-black")}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{label}</h3>
                      <p className={`text-sm font-medium ${textSub}`}>{sub}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AGRISNAP OVERLAY */}
      <AnimatePresence>
        {activeAction === "snap" && capturedImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-100 bg-black text-white flex flex-col">
            <div className="p-6 flex justify-between items-center">
              <button onClick={() => { setActiveAction(null); setCapturedImage(null); }} className="p-2 bg-white/20 rounded-full"><X className="w-6 h-6" /></button>
              <div className={`px-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-2 ${scanPhase === "done" ? "bg-emerald-500 text-black" : "bg-amber-400 text-black"}`}>
                {scanPhase === "done" ? <CheckCircle2 className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                {scanPhase === "done" ? "Extraction Complete" : "AI Scanning..."}
              </div>
            </div>
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-contain" />
              {scanPhase === "scanning" && (
                <>
                  <div className="absolute inset-x-4 inset-y-16 border-2 border-white/30 rounded-2xl z-10">
                    {["tl","tr","bl","br"].map(c => (
                      <div key={c} className={`absolute w-8 h-8 border-emerald-400 border-4 ${c === "tl" ? "top-0 left-0 border-t border-l rounded-tl-2xl" : c === "tr" ? "top-0 right-0 border-t border-r rounded-tr-2xl" : c === "bl" ? "bottom-0 left-0 border-b border-l rounded-bl-2xl" : "bottom-0 right-0 border-b border-r rounded-br-2xl"}`} />
                    ))}
                  </div>
                  <motion.div animate={{ top: ["10%","90%","10%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute left-4 right-4 h-0.5 bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,1)] z-20" />
                </>
              )}
            </div>
            <div className="p-6 pb-10">
              {scanPhase === "scanning" ? (
                <p className="font-bold text-center animate-pulse">Analyzing handwriting and table headers...</p>
              ) : (
                <div className="space-y-4">
                  <p className="font-bold text-emerald-400 text-center">
                    {snapError ? "⚠ Extraction issue" : `✓ ${extractedData.length} fields extracted`}
                  </p>
                  <div className="bg-white/10 border border-white/20 rounded-xl p-4 space-y-2 max-h-48 overflow-y-auto">
                    {extractedData.map((d, i) => (
                      <div key={i} className="flex justify-between text-sm gap-3">
                        <span className="opacity-70 shrink-0">{d.field}</span>
                        <span className="font-bold text-right">{d.value}</span>
                      </div>
                    ))}
                  </div>
                  {snapError && <p className="text-amber-400 text-xs font-medium text-center">{snapError}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setActiveAction(null); setCapturedImage(null); setSnapResult(null); }}
                      className="flex-1 bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition"
                    >Discard</button>
                    {snapResult && snapResult.extractedRecords.length > 0 && (
                      <button
                        onClick={async () => {
                          try {
                            if (farmId) await aiApi.applyRecords(farmId, snapResult.extractedRecords);
                            showToast("Records saved successfully!");
                            analyticsApi.getDashboard(farmId!).then(r => {
                            const all = r.data.recentActivity || [];
                            setActivity(all.filter(a => { const id = typeof a.user === "object" && "_id" in a.user ? (a.user as any)._id : null; return id === user?._id; }));
                          }).catch(() => {});
                          } catch { showToast("Failed to save records."); }
                          setActiveAction(null); setCapturedImage(null); setSnapResult(null);
                        }}
                        className="flex-1 bg-emerald-500 text-black font-bold py-3 rounded-xl hover:bg-emerald-400 transition"
                      >Save to Records</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AGRITALK MODAL */}
      <AnimatePresence>
        {activeAction === "talk" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed inset-0 z-100 flex flex-col items-center justify-center p-6 ${isHighContrast ? "bg-black text-white" : "bg-[#1B3022] text-white"}`}
          >
            <button
              onClick={() => { setActiveAction(null); recognitionRef.current?.abort(); setIsListening(false); setTalkResult(null); setLiveTranscript(""); }}
              className="absolute top-6 right-6 p-3 bg-white/10 rounded-full hover:bg-white/20 transition"
            ><X className="w-6 h-6" /></button>

            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-8">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isListening ? "bg-emerald-500 animate-pulse" : "bg-emerald-500"}`}>
                {transcribing || talkResult ? <Sparkles className="w-8 h-8 text-black" /> : <Mic className="w-8 h-8 text-black" />}
              </div>
            </div>

            {isListening && (
              <>
                <h2 className="text-3xl font-black mb-2">Listening...</h2>
                <p className="opacity-70 font-medium mb-4 text-center text-sm">Speak your observation clearly, then tap Stop</p>
                {liveTranscript && (
                  <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 mb-6 max-w-xs w-full text-center">
                    <p className="text-sm font-medium italic">"{liveTranscript}"</p>
                  </div>
                )}
                <div className="flex items-center gap-1.5 h-12 mb-8">
                  {[...Array(15)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: ["20%", `${40 + (i * 7) % 60}%`, "20%"] }}
                      transition={{ duration: 0.6 + (i % 3) * 0.2, repeat: Infinity, ease: "easeInOut" }}
                      className="w-1.5 bg-emerald-400 rounded-full"
                      style={{ height: "20%" }}
                    />
                  ))}
                </div>
                <button onClick={stopListening} className="bg-white text-black font-bold px-10 py-3.5 rounded-xl hover:bg-gray-200 transition">
                  Stop & Process
                </button>
              </>
            )}

            {!isListening && transcribing && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
                <h2 className="text-2xl font-bold">Structuring Data...</h2>
                {liveTranscript && <p className="opacity-60 text-sm text-center max-w-xs">"{liveTranscript.trim()}"</p>}
              </div>
            )}

            {!isListening && !transcribing && talkResult && (
              <div className="flex flex-col items-center max-w-sm w-full text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {talkError ? "Saved as Note" : "Data Structured"}
                  </h2>
                  <p className="text-sm opacity-60 mt-1">"{talkResult.transcript}"</p>
                </div>

                {talkResult.parsedRecords.length > 0 ? (
                  <div className="bg-white/10 border border-white/20 p-4 rounded-xl text-left w-full space-y-2">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Extracted Records</p>
                    {talkResult.parsedRecords.map((rec, i) => (
                      <div key={i} className="space-y-1 pb-2 border-b border-white/10 last:border-0">
                        <p className="text-xs font-bold text-emerald-300 uppercase">{rec.type}</p>
                        {Object.entries(rec.data).slice(0, 4).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-sm">
                            <span className="opacity-60 capitalize">{k}</span>
                            <span className="font-bold">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/10 border border-white/20 p-4 rounded-xl w-full text-sm text-left space-y-1">
                    <div className="flex justify-between">
                      <span className="opacity-60">Intent</span>
                      <span className="font-bold capitalize">{talkResult.intent || "observation"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Confidence</span>
                      <span className="font-bold">{Math.round((talkResult.confidence || 0) * 100)}%</span>
                    </div>
                    {talkError && <p className="text-amber-400 text-xs pt-1">{talkError}</p>}
                  </div>
                )}

                {talkResult.suggestedActions?.length > 0 && (
                  <div className="w-full text-left">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Suggested Next Steps</p>
                    <ul className="space-y-1">
                      {talkResult.suggestedActions.map((a, i) => (
                        <li key={i} className="text-sm opacity-70 flex gap-2"><span>•</span>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col gap-3 w-full">
                  {talkResult.parsedRecords.length > 0 && (
                    <button
                      onClick={() => applyParsedRecords(talkResult)}
                      disabled={applying}
                      className="w-full bg-emerald-500 text-black font-bold py-3.5 rounded-xl hover:bg-emerald-400 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {applying ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "✓ Apply to Farm Records"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActiveAction(null); setTalkResult(null); setLiveTranscript(""); setTalkError("");
                    }}
                    className="w-full bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition"
                  >Done</button>
                </div>
              </div>
            )}

            {!isListening && !transcribing && !talkResult && (
              <div className="flex flex-col items-center gap-4">
                <p className="opacity-60">Press the mic button to start speaking</p>
                <button onClick={startTalk} className="bg-emerald-500 text-black font-bold px-8 py-3 rounded-xl">Start Recording</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MANUAL INPUT MODAL */}
      <AnimatePresence>
        {activeAction === "manual" && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setActiveAction(null); setManualResult(null); }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100" />
            <motion.div
              initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`fixed bottom-0 left-0 right-0 z-110 rounded-t-3xl max-w-md mx-auto ${isHighContrast ? "bg-black border-4 border-white text-white" : "bg-white text-[#1B3022]"}`}
            >
              <div className="p-6 space-y-5">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto" />
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black">Manual Entry</h2>
                  <button onClick={() => { setActiveAction(null); setManualResult(null); }} className={`p-2 rounded-full ${isHighContrast ? "text-white" : "bg-gray-100"}`}><X className="w-5 h-5" /></button>
                </div>

                {manualResult ? (
                  <div className="space-y-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold">Entry Saved</p>
                        <p className={`text-xs ${textSub}`}>
                          {manualResult.parsedRecords.length > 0
                            ? `${manualResult.parsedRecords.length} record(s) structured by AI`
                            : "Logged as observation"}
                        </p>
                      </div>
                    </div>
                    {manualResult.parsedRecords.length > 0 && (
                      <div className={`${isHighContrast ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"} border rounded-xl p-4 space-y-2`}>
                        {manualResult.parsedRecords.map((rec, i) => (
                          <div key={i}>
                            <p className="text-xs font-bold text-emerald-600 uppercase mb-1">{rec.type}</p>
                            {Object.entries(rec.data).slice(0, 4).map(([k, v]) => (
                              <div key={k} className={`flex justify-between text-sm ${textSub}`}>
                                <span className="capitalize">{k}</span>
                                <span className="font-bold">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => { setActiveAction(null); setManualResult(null); setManualText(""); }}
                      className={`w-full font-bold py-3 rounded-xl transition ${isHighContrast ? "bg-white text-black" : "bg-[#1B3022] text-white"}`}
                    >Done</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Type selector */}
                    <div className="space-y-2">
                      <label className={`text-sm font-bold ${textSub}`}>Entry Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["observation", "feeding", "health", "weight", "mortality", "other"].map(t => (
                          <button
                            key={t}
                            onClick={() => setManualType(t)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold capitalize border-2 transition-colors ${manualType === t ? (isHighContrast ? "bg-white text-black border-white" : "bg-[#1B3022] text-white border-[#1B3022]") : (isHighContrast ? "border-gray-700 text-gray-400" : "border-gray-200 text-gray-500 hover:border-[#1B3022]")}`}
                          >{t}</button>
                        ))}
                      </div>
                    </div>

                    {/* Text input */}
                    <div className="space-y-2">
                      <label className={`text-sm font-bold ${textSub}`}>Details</label>
                      <textarea
                        rows={4}
                        placeholder={
                          manualType === "feeding"     ? "e.g. Fed Batch A 3kg of starter feed at 8am" :
                          manualType === "health"      ? "e.g. Batch B has 3 birds showing sneezing symptoms" :
                          manualType === "weight"      ? "e.g. Weighed 10 birds from Pen 2, avg 2.3kg" :
                          manualType === "mortality"   ? "e.g. Found 2 dead in Pen 1, suspected heat stress" :
                                                        "Describe what you observed..."
                        }
                        value={manualText}
                        onChange={e => setManualText(e.target.value)}
                        className={`w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors ${isHighContrast ? "bg-gray-900 border-2 border-gray-700 text-white focus:border-white placeholder-gray-600" : "bg-gray-50 border border-gray-200 focus:border-[#1B3022] focus:bg-white placeholder-gray-400"}`}
                      />
                    </div>

                    <button
                      onClick={submitManual}
                      disabled={manualBusy || !manualText.trim()}
                      className={`w-full font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 ${isHighContrast ? "bg-white text-black" : "bg-[#1B3022] text-white hover:bg-[#2d4f38]"}`}
                    >
                      {manualBusy
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                        : <><Send className="w-4 h-4" /> Save Entry</>
                      }
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
