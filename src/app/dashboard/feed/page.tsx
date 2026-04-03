"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Plus, X, Loader2, AlertTriangle, CheckCircle2, Package } from "lucide-react";
import { feedApi, getActiveFarmId, type FeedItem } from "@/lib/api";

const STATUS: Record<string, { bar: string; badge: string; label: string }> = {
  optimal:      { bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700", label: "Optimal" },
  warning:      { bar: "bg-amber-400",   badge: "bg-amber-50 text-amber-700",    label: "Warning" },
  critical:     { bar: "bg-red-500",     badge: "bg-red-50 text-red-700",        label: "Critical" },
  out_of_stock: { bar: "bg-gray-300",    badge: "bg-gray-100 text-gray-500",     label: "Out of Stock" },
};

const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } };
const staggerContainer: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };

export default function FeedInventoryPage() {
  const [items, setItems]         = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const farmId = getActiveFarmId();

  const [dlv, setDlv] = useState({ itemId: "", qty: "", invoice: "", notes: "" });
  const [dlvBusy, setDlvBusy] = useState(false);
  const [dlvErr,  setDlvErr]  = useState("");

  const [nw, setNw] = useState({ name: "", category: "", stock: "0", cap: "1000", unit: "kg", reorder: "100", cost: "", supplier: "" });
  const [nwBusy, setNwBusy] = useState(false);
  const [nwErr,  setNwErr]  = useState("");

  const load = async () => {
    if (!farmId) return;
    try { const r = await feedApi.getAll(farmId); setItems(r.data || []); }
    catch {}
    finally { setIsLoading(false); }
  };
  useEffect(() => { load(); }, [farmId]);

  const submitDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId || !dlv.itemId) return;
    setDlvBusy(true); setDlvErr("");
    try {
      await feedApi.log(farmId, dlv.itemId, { type: "delivery", quantity: parseFloat(dlv.qty), supplierInvoice: dlv.invoice || undefined, notes: dlv.notes || undefined });
      await load();
      setIsLogOpen(false);
      setDlv({ itemId: "", qty: "", invoice: "", notes: "" });
    } catch (err) { setDlvErr(err instanceof Error ? err.message : "Failed to log delivery"); }
    finally { setDlvBusy(false); }
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId) return;
    setNwBusy(true); setNwErr("");
    try {
      await feedApi.create(farmId, { name: nw.name, category: nw.category, stockLevel: parseFloat(nw.stock) || 0, capacityLevel: parseFloat(nw.cap), unit: nw.unit as "kg" | "liters" | "bags" | "pieces", reorderPoint: parseFloat(nw.reorder), costPerUnit: nw.cost ? parseFloat(nw.cost) : undefined, supplier: nw.supplier || undefined });
      await load();
      setIsAddOpen(false);
      setNw({ name: "", category: "", stock: "0", cap: "1000", unit: "kg", reorder: "100", cost: "", supplier: "" });
    } catch (err) { setNwErr(err instanceof Error ? err.message : "Failed to create item"); }
    finally { setNwBusy(false); }
  };

  return (
    <>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="p-5 lg:px-8 lg:py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Feed & Inventory</h1>
            <p className="text-gray-500 font-medium mt-1">Real-time stock tracking with predictive depletion alerts.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsAddOpen(true)} className="bg-white border border-gray-200 text-black px-3.5 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Item
            </button>
            <button onClick={() => setIsLogOpen(true)} className="bg-black text-white px-3.5 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> Log Delivery
            </button>
          </div>
        </div>

        {!isLoading && items.length > 0 && (
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Items",     val: items.length,                                                                    clr: "text-gray-900" },
              { label: "Optimal",         val: items.filter(i => i.status === "optimal").length,                               clr: "text-emerald-600" },
              { label: "Needs Attention", val: items.filter(i => i.status === "critical" || i.status === "out_of_stock").length, clr: "text-red-600" },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
                <p className={`text-2xl font-black tracking-tight mt-1 ${s.clr}`}>{s.val}</p>
              </div>
            ))}
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-48 gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading inventory...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3 bg-white border border-dashed border-gray-200 rounded-3xl">
            <Package className="w-10 h-10 text-gray-300" />
            <p className="font-medium">No feed items yet. Add your first item to begin tracking.</p>
            <button onClick={() => setIsAddOpen(true)} className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors">Add First Item</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((item) => {
              const cfg = STATUS[item.status] || STATUS.optimal;
              const pct = Math.min(100, Math.round((item.stockLevel / item.capacityLevel) * 100));
              return (
                <motion.div variants={fadeUp} key={item._id} onClick={() => { setDlv(d => ({ ...d, itemId: item._id })); setIsLogOpen(true); }} className="bg-white border border-gray-200 rounded-3xl p-6 group hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-bold tracking-tight text-gray-900">{item.name}</h3>
                      <p className="text-sm font-medium text-gray-500">{item.category}</p>
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-md ${cfg.badge}`}>
                      {item.status !== "optimal" && <AlertTriangle className="w-3.5 h-3.5" />}
                      {item.status === "optimal" && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {cfg.label}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-gray-900">{item.stockLevel.toLocaleString()} {item.unit} remaining</span>
                      <span className="text-gray-400">of {item.capacityLevel.toLocaleString()} {item.unit}</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: "easeOut" }} className={`h-full ${cfg.bar} rounded-full`} />
                    </div>
                    <p className="text-xs text-gray-400 font-medium">Reorder at {item.reorderPoint} {item.unit}{item.supplier && ` · ${item.supplier}`}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {/* Log Delivery Modal */}
        {isLogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsLogOpen(false); setDlv({ itemId: "", qty: "", invoice: "", notes: "" }); }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-3xl p-8 max-w-sm w-full relative z-10">
              <button onClick={() => setIsLogOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-full p-2"><X className="w-5 h-5" /></button>
              <form onSubmit={submitDelivery} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Log Delivery</h2>
                  <p className="text-gray-500 font-medium text-sm mt-1">Refill an inventory stock item quickly via this panel.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Feed / Inventory Item</label>
                    <select required value={dlv.itemId} onChange={e => setDlv(d => ({ ...d, itemId: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium appearance-none">
                      <option value="">Select item...</option>
                      {items.map(i => <option key={i._id} value={i._id}>{i.name} ({i.stockLevel} {i.unit})</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Quantity Arrived ({items.find(i => i._id === dlv.itemId)?.unit || "units"})</label>
                    <input required type="number" min="0.1" step="0.1" placeholder="500" value={dlv.qty} onChange={e => setDlv(d => ({ ...d, qty: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Supplier Invoice <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="text" placeholder="INV-2024" value={dlv.invoice} onChange={e => setDlv(d => ({ ...d, invoice: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium" />
                  </div>
                </div>
                {dlvErr && <p className="text-sm text-red-500 font-medium">{dlvErr}</p>}
                <button type="submit" disabled={dlvBusy} className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {dlvBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Add to Stock"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Add Item Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-3xl p-8 max-w-lg w-full relative z-10 max-h-[90vh] overflow-y-auto">
              <button onClick={() => setIsAddOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-full p-2"><X className="w-5 h-5" /></button>
              <form onSubmit={submitAdd} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">New Feed Item</h2>
                  <p className="text-gray-500 font-medium text-sm mt-1">Add a feed or supplement to your inventory tracking.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2"><label className="text-sm font-bold">Item Name</label><input required type="text" placeholder="e.g. Broiler Starter Mash" value={nw.name} onChange={e => setNw(n => ({ ...n, name: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium" /></div>
                  <div className="space-y-2 col-span-2"><label className="text-sm font-bold">Category</label><input required type="text" placeholder="e.g. Starter Feed, Supplement" value={nw.category} onChange={e => setNw(n => ({ ...n, category: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium" /></div>
                  <div className="space-y-2"><label className="text-sm font-bold">Current Stock</label><input type="number" min="0" placeholder="0" value={nw.stock} onChange={e => setNw(n => ({ ...n, stock: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium" /></div>
                  <div className="space-y-2"><label className="text-sm font-bold">Max Capacity</label><input type="number" min="1" placeholder="1000" value={nw.cap} onChange={e => setNw(n => ({ ...n, cap: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium" /></div>
                  <div className="space-y-2"><label className="text-sm font-bold">Unit</label><select value={nw.unit} onChange={e => setNw(n => ({ ...n, unit: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium appearance-none"><option value="kg">kg</option><option value="liters">liters</option><option value="bags">bags</option><option value="pieces">pieces</option></select></div>
                  <div className="space-y-2"><label className="text-sm font-bold">Reorder Point</label><input type="number" min="0" placeholder="100" value={nw.reorder} onChange={e => setNw(n => ({ ...n, reorder: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium" /></div>
                  <div className="space-y-2"><label className="text-sm font-bold">Cost/Unit ₦ <span className="text-gray-400 font-normal">opt.</span></label><input type="number" min="0" placeholder="450" value={nw.cost} onChange={e => setNw(n => ({ ...n, cost: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium" /></div>
                  <div className="space-y-2"><label className="text-sm font-bold">Supplier <span className="text-gray-400 font-normal">opt.</span></label><input type="text" placeholder="AgroVet Ltd" value={nw.supplier} onChange={e => setNw(n => ({ ...n, supplier: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium" /></div>
                </div>
                {nwErr && <p className="text-sm text-red-500 font-medium">{nwErr}</p>}
                <button type="submit" disabled={nwBusy} className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {nwBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Feed Item"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
