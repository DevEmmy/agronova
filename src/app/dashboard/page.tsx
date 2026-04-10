"use client";

import { motion, type Variants } from "framer-motion";
import {
  Sparkles, ShieldAlert, ArrowUpRight, ArrowDownRight,
  Zap, Loader2, TrendingUp, Package, Users, Activity
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar
} from "recharts";
import { useEffect, useState } from "react";
import {
  analyticsApi, getActiveFarmId,
  type DashboardStats, type FarmInsight
} from "@/lib/api";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};
const stagger: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

function healthLabel(score: number) {
  if (score >= 80) return "Optimal";
  if (score >= 60) return "Good";
  if (score >= 40) return "Warning";
  return "Critical";
}

function healthColor(score: number) {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#3b82f6";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

interface WeightTrend {
  _id: { date: string; species: string };
  avgWeight: number;
  totalCount: number;
}

export default function DashboardPage() {
  const [stats, setStats]     = useState<DashboardStats | null>(null);
  const [insights, setInsights] = useState<FarmInsight[]>([]);
  const [chartData, setChartData] = useState<{ name: string; avgWeight: number; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const farmId = getActiveFarmId();

  useEffect(() => {
    if (!farmId) return;
    Promise.allSettled([
      analyticsApi.getDashboard(farmId),
      analyticsApi.getInsights(farmId),
      analyticsApi.getProduction(farmId, 30),
    ]).then(([dashRes, insightRes, prodRes]) => {
      if (dashRes.status === "fulfilled") setStats(dashRes.value.data);
      if (insightRes.status === "fulfilled") setInsights(insightRes.value.data.insights || []);
      if (prodRes.status === "fulfilled") {
        const trends: WeightTrend[] = (prodRes.value as any).data?.weightTrends || [];
        // Group by date — average weight and sum count across species
        const byDate: Record<string, { totalWeight: number; count: number; n: number }> = {};
        for (const t of trends) {
          const d = t._id.date;
          if (!byDate[d]) byDate[d] = { totalWeight: 0, count: 0, n: 0 };
          byDate[d].totalWeight += t.avgWeight;
          byDate[d].count       += t.totalCount;
          byDate[d].n           += 1;
        }
        const formatted = Object.entries(byDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, v]) => ({
            name: date.slice(5).replace("-", "/"), // "MM/DD"
            avgWeight: Math.round((v.totalWeight / v.n) * 10) / 10,
            count: v.count,
          }));
        setChartData(formatted);
      }
    }).finally(() => setIsLoading(false));
  }, [farmId]);

  // Safe accessors — backend returns {} when no data exists
  const batches  = stats?.batches  ?? { totalBatches: 0, totalAnimals: 0, healthy: 0, warning: 0, critical: 0 };
  const feed     = stats?.feed     ?? { total: 0, critical: 0, outOfStock: 0 };
  const finances = stats?.finances ?? { income: 0, expenses: 0, profit: 0, profitMargin: "0%" };
  const score    = stats?.healthScore ?? 0;

  const batchPct = batches.totalBatches > 0
    ? Math.round((batches.healthy / batches.totalBatches) * 100) : 0;
  const feedPct = feed.total > 0
    ? Math.round(((feed.total - feed.critical - feed.outOfStock) / feed.total) * 100) : 0;

  const healthData = [
    { name: "Feed",    value: feedPct,   fill: "#10b981" },
    { name: "Batches", value: batchPct,  fill: "#3b82f6" },
    { name: "Overall", value: score,     fill: healthColor(score) },
  ];

  return (
    <main>
      {/* INSIGHT ENGINE */}
      <section className="bg-white border-b border-gray-200 px-6 lg:px-8 pt-8 pb-8 relative overflow-hidden">
        <div className="absolute top-0 right-10 w-64 h-64 bg-blue-50 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-emerald-50 rounded-full blur-[80px]" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">InsightEngine</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory hide-scrollbar">
            {isLoading ? (
              <div className="flex items-center gap-3 text-gray-400 py-4">
                <Loader2 className="w-5 h-5 animate-spin" /> Generating insights...
              </div>
            ) : insights.length > 0 ? insights.map((insight, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="min-w-[320px] md:min-w-[380px] snap-center bg-gray-50 border border-gray-200 rounded-3xl p-6 flex flex-col gap-4 hover:bg-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  {insight.type === "critical"
                    ? <ShieldAlert className="w-4 h-4 text-red-500" />
                    : insight.type === "warning"
                    ? <ShieldAlert className="w-4 h-4 text-amber-500" />
                    : <Zap className="w-4 h-4 text-emerald-500" />}
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    insight.type === "critical" ? "bg-red-50 text-red-600"
                    : insight.type === "warning" ? "bg-amber-50 text-amber-600"
                    : "bg-emerald-50 text-emerald-600"}`}>
                    {insight.category}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">{insight.title}</p>
                  <p className="text-sm text-gray-600 font-medium leading-relaxed mt-1">{insight.message}</p>
                  {insight.daysUntilIssue && (
                    <p className="text-xs font-bold text-red-500 mt-2">⏱ {insight.daysUntilIssue} days until issue</p>
                  )}
                </div>
                {insight.actionLabel && (
                  <button className="self-start px-4 py-2 bg-black text-white text-sm font-bold rounded-full hover:bg-gray-800 transition-colors">
                    {insight.actionLabel}
                  </button>
                )}
              </motion.div>
            )) : (
              <div className="min-w-[320px] snap-center bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-6 flex items-center justify-center text-gray-400 text-sm text-center">
                No insights yet. Add batches and feed data to unlock AI predictions.
              </div>
            )}
          </div>
        </div>
      </section>

      <motion.div variants={stagger} initial="hidden" animate="show" className="p-5 lg:px-8 lg:py-6 space-y-5">

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              icon: TrendingUp, label: "Revenue (This Month)",
              value: formatCurrency(finances.income),
              sub: `${finances.profitMargin} margin`,
              isUp: finances.income > 0, color: "text-emerald-600 bg-emerald-50",
            },
            {
              icon: ArrowDownRight, label: "Expenses (This Month)",
              value: formatCurrency(finances.expenses),
              sub: `${finances.income > 0 ? Math.round((finances.expenses / finances.income) * 100) : 0}% of revenue`,
              isUp: false, color: "text-red-600 bg-red-50",
            },
            {
              icon: Activity, label: "Net Profit",
              value: formatCurrency(finances.profit),
              sub: finances.profit >= 0 ? "Profitable" : "Operating at loss",
              isUp: finances.profit >= 0,
              color: finances.profit >= 0 ? "text-blue-600 bg-blue-50" : "text-red-600 bg-red-50",
            },
            {
              icon: Package, label: "Active Batches",
              value: String(batches.totalBatches || 0),
              sub: `${batches.totalAnimals || 0} total animals`,
              isUp: (batches.totalBatches || 0) > 0, color: "text-purple-600 bg-purple-50",
            },
          ].map((kpi, i) => (
            <motion.div variants={fadeUp} key={i} className="bg-white border border-gray-200 rounded-3xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${kpi.isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                  {kpi.isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                </div>
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-black tracking-tight">{isLoading ? "—" : kpi.value}</h3>
              <p className="text-xs font-medium text-gray-400 mt-1">{isLoading ? "" : kpi.sub}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">

          {/* PRODUCTION WEIGHT CHART */}
          <motion.div variants={fadeUp} className="bg-white border border-gray-200 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Weight Trend (30 Days)</h3>
                <p className="text-sm font-medium text-gray-500 mt-1">Average recorded weight across all active batches.</p>
              </div>
              {chartData.length > 0 && (
                <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
                  {chartData.length} data points
                </span>
              )}
            </div>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center text-gray-400 gap-3">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading chart...
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-gray-400 gap-3 border border-dashed border-gray-200 rounded-2xl">
                <TrendingUp className="w-10 h-10 text-gray-300" />
                <div className="text-center">
                  <p className="font-bold text-sm">No weight records yet</p>
                  <p className="text-xs mt-1">Log batch weights in Production to see trends here.</p>
                </div>
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#111" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#111" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 600 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 600 }} unit="kg" />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontWeight: "bold" }}
                      formatter={(v) => [`${v} kg`, "Avg Weight"]}
                    />
                    <Area type="monotone" dataKey="avgWeight" stroke="#111" strokeWidth={2.5} fillOpacity={1} fill="url(#weightGrad)" dot={{ r: 3, fill: "#111" }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>

          <div className="space-y-6 flex flex-col">

            {/* HEALTH GAUGE */}
            <motion.div variants={fadeUp} className="bg-white border border-gray-200 rounded-3xl p-6 flex-1">
              <h3 className="text-lg font-bold tracking-tight">Farm Health</h3>
              <p className="text-sm font-medium text-gray-500 mb-4">Computed from batch and feed status.</p>
              {isLoading ? (
                <div className="h-[180px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
              ) : (
                <>
                  <div className="h-[180px] relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart innerRadius="55%" outerRadius="100%" barSize={10} data={healthData} startAngle={180} endAngle={0}>
                        <RadialBar background clockWise dataKey="value" cornerRadius={8} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-2 text-center pointer-events-none">
                      <div className="text-4xl font-black tracking-tighter" style={{ color: healthColor(score) }}>{score}%</div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{healthLabel(score)}</div>
                    </div>
                  </div>
                  <div className="space-y-2.5 mt-2">
                    {healthData.map((d, i) => (
                      <div key={i} className="flex justify-between items-center text-sm font-bold">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                          <span className="text-gray-600">{d.name}</span>
                        </div>
                        <span>{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>

            {/* BATCH QUICK STATS */}
            <motion.div variants={fadeUp} className="bg-white border border-gray-200 rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-gray-400" />
                <h3 className="text-lg font-bold tracking-tight">Batch Status</h3>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center h-16"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
              ) : batches.totalBatches === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">No active batches. Create one in Production.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Healthy",  value: batches.healthy  || 0, color: "text-emerald-600 bg-emerald-50" },
                    { label: "Warning",  value: batches.warning  || 0, color: "text-amber-600 bg-amber-50" },
                    { label: "Critical", value: batches.critical || 0, color: "text-red-600 bg-red-50" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`rounded-xl p-3 text-center ${color}`}>
                      <p className="text-xl font-black">{value}</p>
                      <p className="text-xs font-bold mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <motion.div variants={fadeUp} className="bg-white border border-gray-200 rounded-3xl p-6">
          <h3 className="text-xl font-bold tracking-tight mb-6">Recent Activity</h3>
          {isLoading ? (
            <div className="flex items-center gap-3 text-gray-400 py-4"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>
          ) : (stats?.recentActivity ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No activity yet. Start by adding batches, feed items, or transactions.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats!.recentActivity.map((log) => {
                const u = log.user as { name: string; avatar?: string };
                return (
                  <div key={log._id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                      {u?.name?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 leading-snug">
                        <span className="font-bold text-gray-900">{u?.name ?? "Unknown"}</span>
                        {" — "}{log.details}
                      </p>
                      <p className="text-xs font-bold text-gray-400 mt-0.5">{timeAgo(log.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

      </motion.div>
    </main>
  );
}
