"use client";

import { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { Sparkles, Mic, Camera, BrainCircuit, Loader2, CheckCircle2 } from "lucide-react";
import { farmApi, getActiveFarmId, type FarmSettings } from "@/lib/api";

const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } };
const stagger: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center cursor-pointer gap-3">
      <div onClick={() => onChange(!enabled)} className={`relative w-14 h-8 rounded-full transition-colors ${enabled ? "bg-black" : "bg-gray-200"}`}>
        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} />
      </div>
      <span className="font-bold text-gray-900">{enabled ? "Enabled" : "Disabled"}</span>
    </label>
  );
}

export default function AISettingsPage() {
  const [settings, setSettings] = useState<Partial<FarmSettings>>({ agriSnapEnabled: true, agriTalkEnabled: true, insightEngineEnabled: true, feedVarianceTolerance: 10, predictiveHorizonDays: 14 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving]   = useState(false);
  const [saved,    setSaved]      = useState(false);
  const farmId = getActiveFarmId();

  useEffect(() => {
    if (!farmId) return;
    farmApi.get(farmId)
      .then(r => { if (r.data?.settings) setSettings(r.data.settings); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [farmId]);

  const save = async () => {
    if (!farmId) return;
    setIsSaving(true);
    try {
      await farmApi.updateSettings(farmId, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    finally { setIsSaving(false); }
  };

  const update = (key: keyof FarmSettings, val: boolean | number) => setSettings(s => ({ ...s, [key]: val }));

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-5 lg:px-8 lg:py-6 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Sparkles className="w-6 h-6 text-black" /> AI Settings</h1>
          <p className="text-gray-500 font-medium mt-2 leading-relaxed">Configure the Smart Bridges—the AI models powering AgriFlow's automatic data extraction and InsightEngine predictions.</p>
        </div>
        <button onClick={save} disabled={isSaving || isLoading} className="shrink-0 bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50">
          {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : saved ? <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Saved!</> : "Save Changes"}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 text-gray-400 py-8"><Loader2 className="w-5 h-5 animate-spin" /> Loading settings...</div>
      ) : (
        <div className="space-y-6">
          {/* AgriSnap */}
          <motion.div variants={fadeUp} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center"><Camera className="w-5 h-5" /></div>
                <h3 className="text-xl font-bold tracking-tight">AgriSnap (Vision OCR)</h3>
              </div>
              <p className="text-gray-500 font-medium text-sm leading-relaxed max-w-md">Powered by OpenAI GPT-4o Vision. Extracts tabular data from handwritten notebooks and printed Excel sheets, translating them into structured database records.</p>
            </div>
            <div className="shrink-0"><Toggle enabled={!!settings.agriSnapEnabled} onChange={v => update("agriSnapEnabled", v)} /></div>
          </motion.div>

          {/* AgriTalk */}
          <motion.div variants={fadeUp} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center"><Mic className="w-5 h-5" /></div>
                <h3 className="text-xl font-bold tracking-tight">AgriTalk (Voice Input)</h3>
              </div>
              <p className="text-gray-500 font-medium text-sm leading-relaxed max-w-md">Powered by OpenAI Whisper. Transcribes spoken field notes and automatically maps them to batch, feed, and health records. Works in noisy farm environments.</p>
            </div>
            <div className="shrink-0"><Toggle enabled={!!settings.agriTalkEnabled} onChange={v => update("agriTalkEnabled", v)} /></div>
          </motion.div>

          {/* InsightEngine */}
          <motion.div variants={fadeUp} className="bg-white border border-gray-200 rounded-2xl p-6 gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center"><BrainCircuit className="w-5 h-5" /></div>
                <h3 className="text-xl font-bold tracking-tight">InsightEngine Thresholds</h3>
              </div>
              <Toggle enabled={!!settings.insightEngineEnabled} onChange={v => update("insightEngineEnabled", v)} />
            </div>
            <p className="text-gray-500 font-medium text-sm leading-relaxed max-w-md mt-3 mb-6">Set the AI sensitivity for triggering Critical and Optimization alerts across the dashboard. Uses GPT-4o to generate natural-language farm insights.</p>

            <div className="space-y-6 max-w-sm">
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-bold">
                  <span>Feed Variance Tolerance</span>
                  <span className="text-black">{settings.feedVarianceTolerance}%</span>
                </div>
                <input type="range" className="w-full accent-black" value={settings.feedVarianceTolerance} min="5" max="25" onChange={e => update("feedVarianceTolerance", parseInt(e.target.value))} />
                <div className="flex justify-between text-xs text-gray-400 font-medium"><span>5% (strict)</span><span>25% (lenient)</span></div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-bold">
                  <span>Predictive Horizon</span>
                  <span className="text-black">{settings.predictiveHorizonDays} days</span>
                </div>
                <input type="range" className="w-full accent-black" value={settings.predictiveHorizonDays} min="7" max="30" onChange={e => update("predictiveHorizonDays", parseInt(e.target.value))} />
                <div className="flex justify-between text-xs text-gray-400 font-medium"><span>7 days</span><span>30 days</span></div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
