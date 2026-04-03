"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Camera, Mic, Edit3, Sun, CloudRain, Wifi, WifiOff,
  CheckCircle2, Clock, X, Loader2, Sparkles, BookOpen, Contrast
} from "lucide-react";
import { aiApi, getActiveFarmId, type AgriSnapResult, type AgriTalkResult } from "@/lib/api";

// Mock Data
const chores = [
  { id: 1, title: 'Feeding: Batch A (Pigs)', status: '0/2 Completed', active: true },
  { id: 2, title: 'Health Check: Pen 4 (Goats)', status: 'Pending', active: true },
  { id: 3, title: 'Reproduction Watch: Sow #042', status: 'Due: 2 days', active: false }
];

const timeline = [
  { id: 1, text: 'Uploaded Feed Log', tag: 'Academic Log', time: '10m ago', hasThumb: true, thumbColor: 'bg-emerald-100' },
  { id: 2, text: 'Recorded Voice: 2 sick birds', tag: 'Observation', time: '1h ago', hasThumb: false, thumbColor: 'bg-blue-100' },
];

// Web Speech API types
/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionType = any;

export default function FieldUtilityPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  const [activeAction, setActiveAction] = useState<'snap' | 'talk' | 'manual' | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);

  // Camera / Scanner state
  const [capturedImage, setCapturedImage]   = useState<string | null>(null);
  const [capturedFile, setCapturedFile]     = useState<File | null>(null);
  const [scanPhase, setScanPhase]           = useState<'idle' | 'scanning' | 'done'>('idle');
  const [snapResult, setSnapResult]         = useState<AgriSnapResult | null>(null);
  const [talkResult, setTalkResult]         = useState<AgriTalkResult | null>(null);
  const [extractedData, setExtractedData]   = useState<{field: string; value: string}[]>([]);
  const [fieldError, setFieldError]         = useState("");
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const recognitionRef  = useRef<SpeechRecognitionType>(null);
  const farmId = getActiveFarmId();

  const forestGreen = "#1B3022";
  
  // Theme mappings
  const bgMain = isHighContrast ? "bg-black" : "bg-[#F8FAF9]";
  const textMain = isHighContrast ? "text-white" : "text-[#1B3022]";
  const cardBg = isHighContrast ? "bg-black border-2 border-white" : "bg-white shadow-sm border border-gray-100";
  const textSub = isHighContrast ? "text-gray-300" : "text-gray-500";
  const unstyledAccent = isHighContrast ? "bg-white text-black" : "bg-[#1B3022] text-white";

  // Simulate offline toast
  const toggleOffline = () => {
    setIsOffline(!isOffline);
    setToastMsg(!isOffline ? 'Connectivity low. Records will be saved locally & synced via AI later.' : 'Back online. Syncing records...');
    setTimeout(() => setToastMsg(''), 4000);
  };

  // ===== REAL CAMERA: open native file picker / camera =====
  const openCamera = () => {
    setIsDrawerOpen(false);
    setCapturedImage(null);
    setScanPhase('idle');
    setExtractedData([]);
    // Trigger hidden file input
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCapturedImage(url);
    setCapturedFile(file);
    setActiveAction('snap');
    setScanPhase('scanning');
    setFieldError("");
    e.target.value = '';

    // Call real AgriSnap API if farm is connected and API key configured
    if (farmId) {
      try {
        const result = await aiApi.agriSnap(farmId, file);
        setSnapResult(result);
        setScanPhase('done');
        setExtractedData(
          result.extractedRecords.flatMap(r =>
            Object.entries(r.data).map(([k, v]) => ({ field: k, value: String(v) }))
          ).slice(0, 6)
        );
      } catch (err) {
        // Fallback to mock if API unavailable
        setTimeout(() => {
          setScanPhase('done');
          setExtractedData([
            { field: 'Document Type', value: 'Farm Log' },
            { field: 'Records Found', value: '0 (AI not configured)' },
            { field: 'Tip', value: 'Add OPENAI_API_KEY to backend .env' },
          ]);
          setFieldError(err instanceof Error ? err.message : "AI extraction failed");
        }, 2000);
      }
    } else {
      // No farm selected — show demo result
      setTimeout(() => {
        setScanPhase('done');
        setExtractedData([
          { field: 'Status', value: 'Demo mode — no farm selected' },
          { field: 'Tip', value: 'Log in and select a farm to save records' },
        ]);
      }, 3000);
    }
  };

  // ===== REAL VOICE: Web Speech API =====
  const startTalk = useCallback(() => {
    setIsDrawerOpen(false);
    setActiveAction('talk');
    setTranscript('');
    setLiveTranscript('');
    setTranscribing(false);
    setIsListening(true);

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      // Fallback for browsers without Speech API
      setLiveTranscript('Speech API not supported. Simulating...');
      setTimeout(() => {
        setIsListening(false);
        setTranscribing(true);
        setTimeout(() => {
          setTranscribing(false);
          setTranscript('Feeding: 50kg for Batch A logged successfully.');
        }, 2000);
      }, 3000);
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      if (final) (recognition as any)._lastFinal = final;
      setLiveTranscript(final || interim);
    };

    recognition.onend = async () => {
      setIsListening(false);
      const spoken = (recognitionRef.current as any)?._lastFinal || liveTranscript;
      if (!spoken) { setTranscribing(false); return; }
      setTranscribing(true);
      try {
        if (farmId) {
          const result = await aiApi.agriTalk(farmId, undefined, spoken);
          setTalkResult(result);
          setTranscript(result.transcript || spoken);
        } else {
          setTranscript(spoken);
        }
      } catch {
        setTranscript(spoken);
      } finally {
        setTranscribing(false);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setTranscribing(false);
    };

    recognition.start();
  }, [liveTranscript]);

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  return (
    <>
      {/* Main scrollable page content */}
      <div className={`min-h-screen ${bgMain} ${textMain} font-sans selection:bg-emerald-200 selection:text-black transition-colors duration-300 pb-32 flex justify-center`}>
        <div className="w-full max-w-md relative min-h-screen flex flex-col">
          
          {/* HEADER */}
          <header className="px-6 pt-10 pb-6 shrink-0 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className={`text-sm font-bold tracking-widest uppercase ${textSub}`}>Field Mode Active</p>
                <h1 className="text-3xl font-black mt-1">Welcome, Segun</h1>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${isHighContrast ? 'bg-white text-black' : 'bg-[#1B3022] text-white'}`}>
                SA
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${isHighContrast ? 'border-white' : 'border-gray-200 bg-white'}`}>
                <Sun className="w-4 h-4 text-amber-500" />
                <span>32°C / Sunny</span>
              </div>
              <button onClick={toggleOffline} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border hover:opacity-80 transition-opacity ${isHighContrast ? 'border-white' : 'border-gray-200 bg-white'} ${isOffline ? 'text-amber-500' : 'text-emerald-500'}`}>
                {isOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                <span>{isOffline ? 'Local Save' : 'Online'}</span>
              </button>
            </div>

            {/* TOGGLES */}
            <div className="flex gap-2 pt-2 overflow-x-auto hide-scrollbar">
              <button 
                onClick={() => setIsHighContrast(!isHighContrast)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border-2 transition-colors ${isHighContrast ? 'bg-white text-black border-white' : 'bg-white border-gray-200 text-[#1B3022] hover:border-[#1B3022]'}`}
              >
                <Contrast className="w-4 h-4" /> Sun-Glare Mode
              </button>
              <button 
                onClick={() => setIsStudyMode(!isStudyMode)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border-2 transition-colors ${isStudyMode ? (isHighContrast ? 'bg-white text-black border-white' : 'bg-emerald-50 text-emerald-700 border-emerald-200') : (isHighContrast ? 'border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-[#1B3022] hover:border-emerald-200')}`}
              >
                <BookOpen className="w-4 h-4" /> Study Mode {isStudyMode && '(ON)'}
              </button>
            </div>
          </header>

          {/* FEED: MY TASKS */}
          <main className="flex-1 px-6 space-y-8">
            <section>
               <h2 className="text-xl font-black mb-4 flex items-center justify-between">
                 My Tasks today
                 <span className={`text-xs px-2 py-1 rounded-md ${unstyledAccent}`}>3 left</span>
               </h2>
               <div className="space-y-3">
                 {chores.map((chore) => (
                   <motion.div 
                     whileTap={{ scale: 0.98 }}
                     key={chore.id} 
                     className={`${cardBg} p-5 rounded-2xl flex items-center justify-between gap-4 cursor-pointer hover:opacity-90 transition-opacity`}
                   >
                     <div className="space-y-1">
                       <h3 className={`font-bold leading-tight ${!chore.active && 'opacity-50'}`}>{chore.title}</h3>
                       <p className={`text-sm font-bold ${chore.status.includes('Due') ? 'text-red-500' : textSub}`}>{chore.status}</p>
                     </div>
                     <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${isHighContrast ? 'border-white' : 'border-gray-200'}`}>
                        <CheckCircle2 className={`w-5 h-5 ${isHighContrast ? 'text-white opacity-20' : 'text-gray-200'}`} />
                     </div>
                   </motion.div>
                 ))}
               </div>
            </section>

            {/* ACTIVITY TIMELINE */}
            <section>
               <h2 className="text-xl font-black mb-4">My Recent Logs</h2>
               <div className="space-y-5">
                 {timeline.map((item, i) => (
                   <div key={i} className="flex gap-4">
                     <div className="relative flex flex-col items-center">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 z-10 ${isHighContrast ? 'border-white bg-black' : 'bg-emerald-50 border-emerald-100'}`}>
                          <CheckCircle2 className={`w-5 h-5 ${isHighContrast ? 'text-white' : 'text-emerald-500'}`} />
                       </div>
                       {i !== timeline.length - 1 && (
                         <div className={`w-0.5 h-full absolute top-10 ${isHighContrast ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                       )}
                     </div>
                     <div className="pt-2 pb-2 flex-1">
                       <p className="font-bold leading-tight">{item.text}</p>
                       <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${isHighContrast ? 'border border-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                            {item.tag}
                          </span>
                          <span className={`text-xs font-bold ${textSub}`}>{item.time}</span>
                       </div>
                       
                       {/* Visual Bridge: Paper Thumbnail */}
                       {item.hasThumb && (
                         <div className={`mt-3 w-16 h-16 rounded-xl border-2 flex items-center justify-center overflow-hidden relative ${isHighContrast ? 'border-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="absolute inset-0 opacity-20 flex flex-col gap-1 p-2 justify-center">
                              <div className="w-full h-1 bg-black rounded-full"></div>
                              <div className="w-3/4 h-1 bg-black rounded-full"></div>
                              <div className="w-5/6 h-1 bg-black rounded-full"></div>
                            </div>
                            <Camera className="w-4 h-4 opacity-50" />
                         </div>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
            </section>
          </main>
        </div>
      </div>

      {/* Hidden file input for camera - MUST be at top level */}
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        capture="environment"
        onChange={handleImageCapture}
        className="hidden" 
      />

      {/* ===== EVERYTHING BELOW IS PORTALED TO THE TOP LEVEL ===== */}

      {/* TOAST SYSTEM */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 16 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-0 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm px-4 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 ${unstyledAccent}`}
          >
            {isOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* QUICK-ACTION FLOATING DOCK */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsDrawerOpen(true)}
          className={`w-16 h-16 rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] flex items-center justify-center relative ${isHighContrast ? 'bg-white text-black' : 'bg-[#1B3022] text-white'}`}
        >
          <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${isHighContrast ? 'bg-white' : 'bg-[#1B3022]'}`}></div>
          <Plus className="w-8 h-8 relative z-10" />
        </motion.button>
      </div>

      {/* DRAWER MENU */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`fixed bottom-0 left-0 right-0 z-[60] rounded-t-3xl max-w-md mx-auto ${isHighContrast ? 'bg-black border-4 border-white' : 'bg-white'} ${textMain}`}
            >
              <div className="p-6 space-y-4">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>
                
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-black">Quick Action</h2>
                   <button onClick={() => setIsDrawerOpen(false)} className={`p-2 rounded-full ${isHighContrast ? 'text-white' : 'bg-gray-100'}`}>
                     <X className="w-6 h-6" />
                   </button>
                </div>

                <div className="grid gap-3">
                  <motion.button 
                    whileTap={{ scale: 0.96 }}
                    onClick={openCamera}
                    className={`w-full p-4 rounded-2xl flex items-center gap-4 text-left border-2 group transition-all ${isHighContrast ? 'border-gray-700 hover:border-white' : 'border-gray-100 hover:border-[#1B3022] bg-gray-50'}`}
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${unstyledAccent}`}>
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Scan Paper Log</h3>
                      <p className={`text-sm font-medium ${textSub}`}>AgriSnap AI extraction</p>
                    </div>
                  </motion.button>

                  <motion.button 
                    whileTap={{ scale: 0.96 }}
                    onClick={startTalk}
                    className={`w-full p-4 rounded-2xl flex items-center gap-4 text-left border-2 group transition-all ${isHighContrast ? 'border-gray-700 hover:border-white' : 'border-gray-100 hover:border-[#1B3022] bg-gray-50'}`}
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${unstyledAccent}`}>
                      <Mic className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Voice Observation</h3>
                      <p className={`text-sm font-medium ${textSub}`}>AgriTalk transcription</p>
                    </div>
                  </motion.button>

                  <motion.button 
                    whileTap={{ scale: 0.96 }}
                    className={`w-full p-4 rounded-2xl flex items-center gap-4 text-left border-2 border-transparent transition-all ${isHighContrast ? 'hover:border-gray-800' : 'hover:bg-gray-100'}`}
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${isHighContrast ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'}`}>
                      <Edit3 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Input Manually</h3>
                      <p className={`text-sm font-medium ${textSub}`}>Type records by hand</p>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AGRISNAP SCANNER OVERLAY */}
      <AnimatePresence>
        {activeAction === 'snap' && capturedImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black text-white flex flex-col"
          >
            <div className="p-6 flex justify-between items-center relative z-30">
              <button onClick={() => { setActiveAction(null); setCapturedImage(null); }} className="p-2 bg-white/20 rounded-full backdrop-blur">
                <X className="w-6 h-6" />
              </button>
              <div className={`px-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-2 ${scanPhase === 'done' ? 'bg-emerald-500 text-black' : 'bg-amber-400 text-black'}`}>
                {scanPhase === 'done' ? <CheckCircle2 className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                {scanPhase === 'done' ? 'Extraction Complete' : 'AI Scanning...'}
              </div>
            </div>
            
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
               {/* Actual captured image */}
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={capturedImage} alt="Captured notebook" className="absolute inset-0 w-full h-full object-contain" />

               {scanPhase === 'scanning' && (
                 <>
                   {/* Focus Brackets */}
                   <div className="absolute inset-x-4 inset-y-16 border-2 border-white/30 rounded-2xl z-10">
                     <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl"></div>
                     <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl"></div>
                     <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl"></div>
                     <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl"></div>
                   </div>

                   {/* Laser Line scanning over the image */}
                   <motion.div 
                     animate={{ top: ["10%", "90%", "10%"] }}
                     transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                     className="absolute left-4 right-4 h-0.5 bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,1)] z-20"
                   />

                   {/* Bounding box flicker */}
                   <motion.div 
                     animate={{ opacity: [0, 1, 0] }}
                     transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                     className="absolute top-[40%] left-[10%] right-[30%] h-8 border-2 border-amber-400 bg-amber-400/10 rounded-md z-10"
                   />
                   <motion.div 
                     animate={{ opacity: [0, 1, 0] }}
                     transition={{ duration: 1.5, repeat: Infinity, delay: 1.2 }}
                     className="absolute top-[55%] left-[15%] right-[20%] h-8 border-2 border-amber-400 bg-amber-400/10 rounded-md z-10"
                   />
                 </>
               )}
            </div>
            
            {/* Bottom result panel */}
            <div className="p-6 pb-10">
              {scanPhase === 'scanning' ? (
                <p className="font-bold text-center animate-pulse">Analyzing handwriting and table headers...</p>
              ) : (
                <div className="space-y-4">
                  <p className="font-bold text-emerald-400 text-center">✓ {extractedData.length} fields extracted</p>
                  <div className="bg-white/10 border border-white/20 rounded-xl p-4 space-y-2">
                    {extractedData.map((d, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="opacity-70">{d.field}</span>
                        <span className="font-bold">{d.value}</span>
                      </div>
                    ))}
                  </div>
                  {fieldError && <p className="text-red-400 text-xs font-medium text-center">{fieldError}</p>}
                  <button
                    onClick={async () => {
                      if (snapResult && farmId) {
                        try { await aiApi.applyRecords(farmId, snapResult.extractedRecords); } catch {}
                      }
                      setActiveAction(null); setCapturedImage(null); setSnapResult(null); setFieldError("");
                    }}
                    className="w-full bg-emerald-500 text-black font-bold py-3.5 rounded-xl hover:bg-emerald-400 transition"
                  >
                    Save to Records
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AGRITALK WAVEFORM MODAL */}
      <AnimatePresence>
        {activeAction === 'talk' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 ${isHighContrast ? 'bg-black text-white' : 'bg-[#1B3022] text-white'}`}
          >
            <button onClick={() => { setActiveAction(null); recognitionRef.current?.abort(); setIsListening(false); }} className="absolute top-6 right-6 p-3 bg-white/10 rounded-full hover:bg-white/20 transition">
              <X className="w-6 h-6" />
            </button>
            
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center">
                {transcribing || transcript ? <Sparkles className="w-8 h-8 text-black" /> : <Mic className="w-8 h-8 text-black" />}
              </div>
            </div>

            {isListening ? (
              <>
                <h2 className="text-3xl font-black mb-2">Listening...</h2>
                <p className="opacity-70 font-medium mb-4 text-center">Speak your field observation clearly</p>
                
                {/* Live transcript preview */}
                {liveTranscript && (
                  <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 mb-8 max-w-xs w-full text-center">
                    <p className="text-sm font-medium italic">"{liveTranscript}"</p>
                  </div>
                )}
                
                {/* Waveform Visualizer */}
                <div className="flex items-center gap-1.5 h-16 mb-8">
                  {[...Array(15)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: ["20%", `${Math.random() * 80 + 20}%`, "20%"] }}
                      transition={{ duration: 0.5 + Math.random() * 0.5, repeat: Infinity, ease: "easeInOut" }}
                      className="w-1.5 bg-emerald-400 rounded-full"
                      style={{ height: "20%" }}
                    ></motion.div>
                  ))}
                </div>

                <button onClick={stopListening} className="bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-gray-200 transition">
                  Stop & Process
                </button>
              </>
            ) : transcribing ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-6" />
                <h2 className="text-2xl font-bold">Extracting Data...</h2>
                {liveTranscript && <p className="opacity-70 text-sm mt-2 max-w-xs text-center">"{liveTranscript}"</p>}
              </div>
            ) : transcript ? (
              <div className="flex flex-col items-center max-w-sm text-center">
                <div className="w-16 h-16 rounded-full bg-white text-emerald-600 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Structured Data Saved</h2>
                <p className="text-sm opacity-70 mb-4">Transcribed: "{transcript}"</p>
                <div className="bg-white/10 border border-white/20 p-4 rounded-xl text-left w-full space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="opacity-70">Action</span>
                    <span className="font-bold">Feeding</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-70">Amount</span>
                    <span className="font-bold text-emerald-400">50kg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-70">Target</span>
                    <span className="font-bold">Batch A</span>
                  </div>
                </div>
                <button onClick={() => setActiveAction(null)} className="w-full mt-8 bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 transition">
                  Done
                </button>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
