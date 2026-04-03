"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Plus, Camera, Search, Filter, MoreHorizontal, X, UploadCloud, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { batchApi, aiApi, getActiveFarmId, type Batch, type AgriSnapResult } from "@/lib/api";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const statusColor: Record<string, string> = {
  healthy: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  critical: 'bg-red-50 text-red-600',
  harvested: 'bg-blue-50 text-blue-600',
  sold: 'bg-gray-50 text-gray-600',
};

export default function ProductionPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const farmId = getActiveFarmId();

  // New batch form state
  const [form, setForm] = useState({ species: 'Poultry', breed: '', initialCount: '', ageWeeks: '', expectedHarvestDate: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // AgriSnap state
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanResult, setScanResult] = useState<AgriSnapResult | null>(null);
  const [isScanLoading, setIsScanLoading] = useState(false);
  const [scanError, setScanError] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!farmId) return;
    batchApi.getAll(farmId)
      .then(res => setBatches(res.data || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [farmId]);

  const filtered = batches.filter(b =>
    !search || b.batchCode.toLowerCase().includes(search.toLowerCase()) ||
    b.species.toLowerCase().includes(search.toLowerCase()) ||
    b.breed.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId) return;
    setIsSaving(true);
    setSaveError("");
    try {
      const res = await batchApi.create(farmId, {
        species: form.species,
        breed: form.breed,
        initialCount: parseInt(form.initialCount),
        ageWeeks: parseInt(form.ageWeeks) || 0,
        expectedHarvestDate: form.expectedHarvestDate || undefined,
      });
      setBatches(prev => [res.data, ...prev]);
      setIsBatchOpen(false);
      setForm({ species: 'Poultry', breed: '', initialCount: '', ageWeeks: '', expectedHarvestDate: '' });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to create batch');
    } finally {
      setIsSaving(false);
    }
  };

  const handleScanUpload = async () => {
    if (!scanFile || !farmId) return;
    setIsScanLoading(true);
    setScanError("");
    try {
      const result = await aiApi.agriSnap(farmId, scanFile);
      setScanResult(result);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'AI extraction failed');
    } finally {
      setIsScanLoading(false);
    }
  };

  const handleApplyRecords = async () => {
    if (!scanResult || !farmId) return;
    setIsApplying(true);
    try {
      await aiApi.applyRecords(farmId, scanResult.extractedRecords);
      const res = await batchApi.getAll(farmId);
      setBatches(res.data || []);
      setIsScanOpen(false);
      setScanResult(null);
      setScanFile(null);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Failed to apply records');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="p-5 lg:px-8 lg:py-6 space-y-6"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Production Tracking</h1>
            <p className="text-gray-500 font-medium mt-1">Manage livestock batches, weights, and AgriSnap entries.</p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsScanOpen(true)} className="bg-white border border-gray-200 text-black px-3.5 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Camera className="w-4 h-4" /> Scan Notebook
            </button>
            <button onClick={() => setIsBatchOpen(true)} className="bg-black text-white px-3.5 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Batch
            </button>
          </div>
        </div>

        <motion.div variants={fadeUp} className="bg-white border border-gray-200 rounded-3xl overflow-hidden flex flex-col h-[calc(100vh-220px)]">
          <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search batches or species..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-black focus:bg-white transition-all font-medium"
              />
            </div>
            <span className="text-sm text-gray-400 font-medium">{filtered.length} batch{filtered.length !== 1 ? 'es' : ''}</span>
          </div>

          <div className="overflow-x-auto flex-1 h-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-48 gap-3 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading batches...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                <div className="text-3xl">🐣</div>
                <p className="font-medium">No batches yet. Add your first batch to get started.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-bold">
                    <th className="px-6 py-4">Batch ID</th>
                    <th className="px-6 py-4">Species & Breed</th>
                    <th className="px-6 py-4">Count</th>
                    <th className="px-6 py-4">Age (weeks)</th>
                    <th className="px-6 py-4">Avg Weight</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((batch) => (
                    <tr key={batch._id} className="hover:bg-gray-50 transition-colors group cursor-pointer bg-white">
                      <td className="px-6 py-4 font-bold text-sm">{batch.batchCode}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-sm text-gray-900">{batch.species}</div>
                        <div className="text-xs text-gray-500 font-medium">{batch.breed}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-sm text-gray-600">{batch.currentCount.toLocaleString()}</td>
                      <td className="px-6 py-4 font-medium text-sm text-gray-600">{batch.ageWeeks}w</td>
                      <td className="px-6 py-4 font-medium text-sm text-gray-600">{batch.avgWeightKg ? `${batch.avgWeightKg} kg` : '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold capitalize ${statusColor[batch.status] || 'bg-gray-50 text-gray-600'}`}>
                          {batch.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-gray-400 hover:text-black transition-colors opacity-0 group-hover:opacity-100 p-1">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* MODALS */}
      <AnimatePresence>
        {isScanOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsScanOpen(false); setScanResult(null); setScanFile(null); }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-3xl p-8 max-w-md w-full relative z-10 max-h-[90vh] overflow-y-auto">
              <button onClick={() => { setIsScanOpen(false); setScanResult(null); setScanFile(null); }} className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-full p-2">
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">AgriSnap — AI OCR</h2>
                  <p className="text-gray-500 font-medium text-sm mt-1">Upload a photo of your farm notebook. AI will extract all records instantly.</p>
                </div>

                {!scanResult ? (
                  <>
                    <input ref={fileInputRef} type="file" accept="image/*,.heic" className="hidden" onChange={e => setScanFile(e.target.files?.[0] || null)} />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center py-12 px-6 bg-gray-50 hover:bg-gray-100 hover:border-black transition-all cursor-pointer group text-center"
                    >
                      <div className="w-16 h-16 bg-white border border-gray-200 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Camera className="w-8 h-8 text-black" />
                      </div>
                      {scanFile ? (
                        <span className="font-bold text-sm text-green-600">✓ {scanFile.name}</span>
                      ) : (
                        <>
                          <span className="font-bold text-sm text-gray-900">Click to upload or drag photo here</span>
                          <span className="text-xs text-gray-400 font-medium mt-1">JPEG, PNG, HEIC up to 10MB</span>
                        </>
                      )}
                    </div>

                    {scanError && <p className="text-sm text-red-500 font-medium text-center">{scanError}</p>}

                    <button
                      onClick={handleScanUpload}
                      disabled={!scanFile || isScanLoading}
                      className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isScanLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Extracting...</> : <><UploadCloud className="w-5 h-5" /> Start AI Extraction</>}
                    </button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-bold">Extracted {scanResult.extractedRecords.length} records ({Math.round(scanResult.confidence * 100)}% confidence)</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-xs font-mono text-gray-600 max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {scanResult.rawText}
                    </div>
                    <div className="space-y-2">
                      {scanResult.extractedRecords.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${r.type === 'batch' ? 'bg-blue-50 text-blue-600' : r.type === 'feed' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>{r.type}</span>
                          <span className="text-gray-600">{r.rawLine}</span>
                        </div>
                      ))}
                    </div>
                    {scanResult.suggestions.length > 0 && (
                      <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700 font-medium">
                        {scanResult.suggestions.join(' ')}
                      </div>
                    )}
                    {scanError && <p className="text-sm text-red-500 font-medium">{scanError}</p>}
                    <div className="flex gap-3">
                      <button onClick={() => { setScanResult(null); setScanFile(null); }} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                        Re-scan
                      </button>
                      <button onClick={handleApplyRecords} disabled={isApplying} className="flex-1 bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                        {isApplying ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save to Records'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {isBatchOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBatchOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-3xl p-8 max-w-lg w-full relative z-10">
              <button onClick={() => setIsBatchOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-full p-2">
                <X className="w-5 h-5" />
              </button>

              <form onSubmit={handleCreateBatch} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Add New Batch</h2>
                  <p className="text-gray-500 font-medium text-sm mt-1">Register a newly acquired livestock batch.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-bold">Species</label>
                    <select value={form.species} onChange={e => setForm(f => ({ ...f, species: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium appearance-none">
                      <option>Poultry</option>
                      <option>Swine</option>
                      <option>Cattle</option>
                      <option>Fish</option>
                      <option>Goat</option>
                      <option>Sheep</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Breed / Strain</label>
                    <input required type="text" placeholder="e.g. Kuroiler" value={form.breed} onChange={e => setForm(f => ({ ...f, breed: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Initial Count</label>
                    <input required type="number" min="1" placeholder="500" value={form.initialCount} onChange={e => setForm(f => ({ ...f, initialCount: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Age (weeks)</label>
                    <input type="number" min="0" placeholder="0" value={form.ageWeeks} onChange={e => setForm(f => ({ ...f, ageWeeks: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Expected Harvest</label>
                    <input type="date" value={form.expectedHarvestDate} onChange={e => setForm(f => ({ ...f, expectedHarvestDate: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium text-sm" />
                  </div>
                </div>

                {saveError && <p className="text-sm text-red-500 font-medium">{saveError}</p>}

                <button type="submit" disabled={isSaving} className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Register Batch'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
