"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Download, ArrowUpRight, ArrowDownRight, MoreHorizontal, Plus, X, Loader2 } from "lucide-react";
import { financeApi, getActiveFarmId, type Transaction } from "@/lib/api";

const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } };
const stagger: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };

const fmt = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

const INCOME_CATS  = ["Egg Sales", "Livestock Auction", "Meat Sales", "Fish Sales", "Milk Sales", "Consulting", "Other Income"];
const EXPENSE_CATS = ["Feed Purchase", "Vet Services", "Labour", "Equipment", "Medicine", "Utilities", "Transport", "Other Expense"];

export default function FinancesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary]           = useState({ totalIncome: 0, totalExpenses: 0, profit: 0, profitMargin: "0%" });
  const [isLoading, setIsLoading]       = useState(true);
  const [isAddOpen, setIsAddOpen]       = useState(false);
  const farmId = getActiveFarmId();

  const [form, setForm] = useState({ type: "income", category: "", amount: "", description: "", date: new Date().toISOString().slice(0, 10), status: "completed" });
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const load = async () => {
    if (!farmId) return;
    try {
      const r = await financeApi.getAll(farmId, { limit: "50" });
      setTransactions(r.data || []);
      if (r.meta?.summary) setSummary(r.meta.summary as any);
    } catch {}
    finally { setIsLoading(false); }
  };
  useEffect(() => { load(); }, [farmId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId) return;
    setSaving(true); setSaveErr("");
    try {
      await financeApi.create(farmId, { type: form.type as "income" | "expense", category: form.category, amount: parseFloat(form.amount), description: form.description, status: form.status as any, date: form.date });
      await load();
      setIsAddOpen(false);
      setForm({ type: "income", category: "", amount: "", description: "", date: new Date().toISOString().slice(0, 10), status: "completed" });
    } catch (err) { setSaveErr(err instanceof Error ? err.message : "Failed to save transaction"); }
    finally { setSaving(false); }
  };

  const exportUrl = farmId ? financeApi.export(farmId, "xlsx") : "#";

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="p-5 lg:px-8 lg:py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Financial Records</h1>
            <p className="text-gray-500 font-medium mt-1">Track ROI, categorize expenses, and monitor cash flow.</p>
          </div>
          <div className="flex items-center gap-3">
            <a href={exportUrl} target="_blank" rel="noreferrer" className="bg-white border border-gray-200 text-black px-3.5 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> Export XLSX
            </a>
            <button onClick={() => setIsAddOpen(true)} className="bg-black text-white px-3.5 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Transaction
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {!isLoading && (
          <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Income",        val: fmt(summary.totalIncome),   clr: "text-emerald-600" },
              { label: "Expenses",      val: fmt(summary.totalExpenses),  clr: "text-red-500" },
              { label: "Net Profit",    val: fmt(summary.profit),         clr: summary.profit >= 0 ? "text-gray-900" : "text-red-600" },
              { label: "Profit Margin", val: summary.profitMargin,        clr: "text-blue-600" },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
                <p className={`text-xl font-black tracking-tight mt-1 ${s.clr}`}>{s.val}</p>
              </div>
            ))}
          </motion.div>
        )}

        <motion.div variants={fadeUp} className="bg-white border border-gray-200 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold">Recent Transactions</h3>
            <span className="text-sm text-gray-400 font-medium">{transactions.length} records</span>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-36 gap-3 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 text-gray-400 gap-2">
                <p className="font-medium">No transactions yet.</p>
                <button onClick={() => setIsAddOpen(true)} className="text-sm font-bold text-black underline">Add your first transaction</button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-bold">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((trx) => (
                    <tr key={trx._id} className="hover:bg-gray-50 transition-colors group cursor-pointer">
                      <td className="px-6 py-4 font-bold text-xs text-gray-400">{trx._id.slice(-6).toUpperCase()}</td>
                      <td className="px-6 py-4 font-bold text-sm">{fmtDate(trx.date)}</td>
                      <td className="px-6 py-4 font-bold text-sm text-gray-900">{trx.category}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[180px] truncate">{trx.description}</td>
                      <td className="px-6 py-4">
                        <span className={`font-black text-sm flex items-center gap-1 ${trx.type === "income" ? "text-emerald-600" : "text-gray-900"}`}>
                          {trx.type === "income" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4 text-red-400" />}
                          {trx.type === "income" ? "+" : "-"}{fmt(trx.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold capitalize ${trx.status === "completed" ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-600"}`}>{trx.status}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-gray-400 hover:text-black transition-colors opacity-0 group-hover:opacity-100 p-1"><MoreHorizontal className="w-5 h-5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-3xl p-8 max-w-md w-full relative z-10">
              <button onClick={() => setIsAddOpen(false)} className="absolute top-6 right-6 bg-gray-100 rounded-full p-2 text-gray-400 hover:text-black transition-colors"><X className="w-5 h-5" /></button>
              <form onSubmit={submit} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Add Transaction</h2>
                  <p className="text-gray-500 text-sm font-medium mt-1">Record an income or expense entry.</p>
                </div>
                <div className="space-y-4">
                  <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                    {["income", "expense"].map(t => (
                      <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t, category: "" }))} className={`flex-1 py-2.5 text-sm font-bold capitalize transition-colors ${form.type === t ? "bg-black text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>{t}</button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Category</label>
                    <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium appearance-none">
                      <option value="">Select category...</option>
                      {(form.type === "income" ? INCOME_CATS : EXPENSE_CATS).map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Amount (₦)</label>
                    <input required type="number" min="1" placeholder="e.g. 150000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Description</label>
                    <input required type="text" placeholder="Brief description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Date</label>
                      <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Status</label>
                      <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black font-medium appearance-none">
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>
                </div>
                {saveErr && <p className="text-sm text-red-500 font-medium">{saveErr}</p>}
                <button type="submit" disabled={saving} className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Transaction"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
