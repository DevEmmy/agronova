"use client";

import { motion, type Variants } from "framer-motion";
import { Sparkles, ShieldAlert, ArrowUpRight, ArrowDownRight, Zap, Loader2 } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar
} from "recharts";
import { useEffect, useState } from "react";
import { analyticsApi, getActiveFarmId, type DashboardStats, type FarmInsight } from "@/lib/api";

const productionData = Array.from({ length: 30 }).map((_, i) => ({
  name: `Day ${i + 1}`,
  yield: Math.floor(Math.random() * (500 - 300 + 1) + 300) + (i * 10),
}));

const sparklineData1 = Array.from({ length: 7 }).map(() => ({ value: Math.random() * 100 + 500 }));
const sparklineData2 = Array.from({ length: 7 }).map(() => ({ value: Math.random() * 100 + 200 }));
const sparklineData3 = Array.from({ length: 7 }).map(() => ({ value: Math.random() * 100 + 300 }));

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [insights, setInsights] = useState<FarmInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const farmId = getActiveFarmId();

  useEffect(() => {
    if (!farmId) return;
    const load = async () => {
      try {
        const [dashRes, insightRes] = await Promise.allSettled([
          analyticsApi.getDashboard(farmId),
          analyticsApi.getInsights(farmId),
        ]);
        if (dashRes.status === 'fulfilled') setStats(dashRes.value.data);
        if (insightRes.status === 'fulfilled') setInsights(insightRes.value.data.insights || []);
      } catch {}
      finally { setIsLoading(false); }
    };
    load();
  }, [farmId]);

  const healthData = [
    { name: 'Batches', value: stats ? Math.round((stats.batches.healthy / Math.max(stats.batches.totalBatches, 1)) * 100) : 88, fill: '#3b82f6' },
    { name: 'Feed', value: stats ? Math.round(((stats.feed.total - stats.feed.critical - stats.feed.outOfStock) / Math.max(stats.feed.total, 1)) * 100) : 96, fill: '#10b981' },
    { name: 'Overall', value: stats?.healthScore ?? 92, fill: '#111111' },
  ];

  return (
    <main>
      {/* INSIGHT ENGINE HERO SETTING - Light Enterprise theme */}
      <section className="bg-white border-b border-gray-200 px-6 lg:px-8 pt-8 pb-8 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-10 w-64 h-64 bg-blue-50 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-emerald-50 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-200">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">InsightEngine Actions</h2>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory hide-scrollbar">
            {isLoading ? (
              <div className="flex items-center gap-3 text-gray-400 py-4">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading insights...
              </div>
            ) : insights.length > 0 ? insights.map((insight, idx) => (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                key={idx}
                className="min-w-[320px] md:min-w-[380px] snap-center bg-gray-50 border border-gray-200 rounded-3xl p-6 flex flex-col justify-between gap-6 relative overflow-hidden group hover:bg-white transition-colors cursor-pointer"
              >
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center gap-2">
                    {insight.type === 'critical' ? <ShieldAlert className="w-4 h-4 text-red-500" /> : <Zap className="w-4 h-4 text-yellow-500" />}
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{insight.title}</span>
                  </div>
                  <p className="text-gray-900 font-medium leading-relaxed">{insight.message}</p>
                  {insight.daysUntilIssue && (
                    <p className="text-xs font-bold text-red-500">⏱ {insight.daysUntilIssue} days until issue</p>
                  )}
                </div>
                {insight.actionLabel && (
                  <button className="self-start px-4 py-2 bg-black text-white text-sm font-bold rounded-full hover:bg-gray-800 transition-colors relative z-10">
                    {insight.actionLabel}
                  </button>
                )}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-white rounded-full blur-2xl group-hover:bg-gray-50 transition-colors"></div>
              </motion.div>
            )) : (
              <div className="min-w-[320px] snap-center bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-6 flex items-center justify-center text-gray-400 text-sm">
                No insights yet. Add batches and feed data to unlock AI predictions.
              </div>
            )}
          </div>
        </div>
      </section>

      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="p-5 lg:px-8 lg:py-6 -mt-6 relative z-20 space-y-5"
      >
        {/* KPI CARDS (Financial Pulse) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
           {[
             {
               title: "Total Revenue",
               value: stats ? formatCurrency(stats.finances.income) : "₦0",
               trend: stats ? `${stats.finances.profitMargin} margin` : "+0%",
               isUp: true, data: sparklineData1, color: "#10b981"
             },
             {
               title: "Operating Expenses",
               value: stats ? formatCurrency(stats.finances.expenses) : "₦0",
               trend: stats ? `${stats.batches.totalAnimals} animals` : "0",
               isUp: false, data: sparklineData2, color: "#ef4444"
             },
             {
               title: "Profit (This Month)",
               value: stats ? formatCurrency(stats.finances.profit) : "₦0",
               trend: stats?.finances.profitMargin || "0%",
               isUp: (stats?.finances.profit ?? 0) >= 0, data: sparklineData3, color: "#3b82f6"
             },
           ].map((kpi, i) => (
             <motion.div variants={fadeUp} key={i} className="bg-white border border-gray-200 rounded-3xl p-6 flex flex-col justify-between">
               <div className="flex justify-between items-start mb-4">
                 <div className="space-y-1">
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{kpi.title}</p>
                   <h3 className="text-2xl font-bold tracking-tight">{kpi.value}</h3>
                 </div>
                 <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-md ${kpi.isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                   {kpi.isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                   {kpi.trend}
                 </div>
               </div>
               <div className="h-16 w-full mt-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={kpi.data}>
                      <defs>
                        <linearGradient id={`color-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={kpi.color} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={kpi.color} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={kpi.color} strokeWidth={2} fillOpacity={1} fill={`url(#color-${i})`} />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
             </motion.div>
           ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
           {/* PRODUCTION CHART */}
           <motion.div variants={fadeUp} className="bg-white border border-gray-200 rounded-3xl p-6">
             <div className="flex items-center justify-between mb-8">
               <div>
                 <h3 className="text-xl font-bold tracking-tight">Production Yield (30 Days)</h3>
                 <p className="text-sm font-medium text-gray-500 mt-1">Overall harvest metrics across all active batches.</p>
               </div>
               <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">
                 Export Report
               </button>
             </div>
             
             <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={productionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#111" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#111" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 600 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                      itemStyle={{ color: '#111' }}
                    />
                    <Area type="monotone" dataKey="yield" stroke="#111" strokeWidth={3} fillOpacity={1} fill="url(#colorYield)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
           </motion.div>

           <div className="space-y-6 flex flex-col h-full">
             {/* HEALTH GAUGE */}
             <motion.div variants={fadeUp} className="bg-white border border-gray-200 rounded-3xl p-6 flex-1">
                <h3 className="text-lg font-bold tracking-tight mb-2">Overall Farm Health</h3>
                <p className="text-sm font-medium text-gray-500 mb-6">Aggregated via InsightEngine tracking.</p>
                
                <div className="h-[200px] relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart 
                      innerRadius="60%" 
                      outerRadius="100%" 
                      barSize={12} 
                      data={healthData} 
                      startAngle={180} 
                      endAngle={0}
                    >
                      <RadialBar background clockWise dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-2 text-center">
                     <div className="text-4xl font-black tracking-tighter">{stats?.healthScore ?? 92}%</div>
                     <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Optimal</div>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  {healthData.map((d, i) => (
                    <div key={i} className="flex justify-between items-center text-sm font-bold">
                      <div className="flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }}></div>
                         <span className="text-gray-600">{d.name}</span>
                      </div>
                      <span>{d.value}%</span>
                    </div>
                  ))}
                </div>
             </motion.div>

             {/* TEAM PRESENCE FEED */}
             <motion.div variants={fadeUp} className="bg-white border border-gray-200 rounded-3xl p-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold tracking-tight">Active Team</h3>
                  <button className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">Ping All</button>
                </div>
                
                <div className="space-y-5 flex-1 overflow-y-auto pr-2">
                  {(stats?.recentActivity ?? []).length > 0 ? stats!.recentActivity.map((log) => {
                    const u = log.user as { name: string; avatar?: string };
                    return (
                      <div key={log._id} className="flex gap-4 group">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                            {u?.name?.[0]?.toUpperCase() ?? 'U'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-800 leading-tight">
                            <span className="font-bold text-black">{u?.name ?? 'User'}</span> {log.details}
                          </p>
                          <p className="text-xs font-bold text-gray-400">{timeAgo(log.createdAt)}</p>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-sm text-gray-400 text-center py-4">No recent activity</div>
                  )}
                </div>
             </motion.div>
           </div>
        </div>

      </motion.div>
    </main>
  );
}
