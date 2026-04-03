"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Layers, Wheat, Wallet, Users, Sparkles,
  Search, Bell, AlignLeft, ChevronDown, LogOut, Loader2
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authApi, aiApi, analyticsApi, getActiveFarmId, clearTokens, type User, type Farm, type Notification } from "@/lib/api";

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',      href: '/dashboard' },
  { icon: Layers,          label: 'Production',     href: '/dashboard/production' },
  { icon: Wheat,           label: 'Feed & Inventory',href: '/dashboard/feed' },
  { icon: Wallet,          label: 'Finances',       href: '/dashboard/finances' },
  { icon: Users,           label: 'Team',           href: '/dashboard/team' },
  { icon: Sparkles,        label: 'AI Settings',    href: '/dashboard/ai-settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser]               = useState<User | null>(null);
  const [farmName, setFarmName]       = useState("My Farm");
  const [notifCount, setNotifCount]   = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs]   = useState(false);
  const [aiQuery, setAiQuery]         = useState("");
  const [aiAnswer, setAiAnswer]       = useState("");
  const [aiLoading, setAiLoading]     = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router   = useRouter();
  const farmId   = getActiveFarmId();

  useEffect(() => {
    authApi.getMe()
      .then(({ data }) => {
        setUser(data.user);
        const activeFarm = data.farms.find(m => m.farm._id === farmId) || data.farms[0];
        if (activeFarm) setFarmName(activeFarm.farm.name);
      })
      .catch(() => { clearTokens(); router.push("/auth"); });

    if (farmId) {
      analyticsApi.getNotifications(farmId, true)
        .then(r => { setNotifications(r.data || []); setNotifCount(r.data?.length || 0); })
        .catch(() => {});
    }

    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [farmId]);

  const handleLogout = async () => {
    await authApi.logout().catch(() => {});
    clearTokens();
    router.push("/auth");
  };

  const handleAiSearch = async (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || !aiQuery.trim() || !farmId) return;
    setAiLoading(true); setAiAnswer("");
    try {
      const res = await aiApi.chat(farmId, aiQuery);
      setAiAnswer(res.data.answer);
    } catch {}
    finally { setAiLoading(false); }
  };

  const markAllRead = async () => {
    if (!farmId) return;
    await analyticsApi.markAllRead(farmId).catch(() => {});
    setNotifCount(0);
    setNotifications(n => n.map(x => ({ ...x, isRead: true })));
  };

  return (
    <div className="flex h-screen bg-[#f4f4f5] text-[#111] overflow-hidden font-sans selection:bg-black selection:text-white">
      
      {/* SIDEBAR */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="shrink-0 bg-white border-r border-gray-200 flex-col justify-between hidden md:flex z-20"
          >
            <div>
              <Link href="/" className="px-6 py-6 flex items-center gap-2">
                <div className="w-7 h-7 bg-[#111] text-white flex items-center justify-center rounded-md font-bold text-sm">A</div>
                <span className="text-lg font-bold tracking-tight">AgriFlow</span>
              </Link>
              
              <nav className="px-4 space-y-1 mt-4">
                {navItems.map((item, i) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link 
                      key={i} 
                      href={item.href}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        isActive ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-black'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="p-6 border-t border-gray-100">
              <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Farm</p>
                <p className="text-sm font-bold text-gray-900 truncate">{farmName}</p>
                <button onClick={handleLogout} className="w-full text-left text-xs text-gray-400 hover:text-red-500 font-medium flex items-center gap-1.5 transition-colors mt-1">
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 lg:px-8 shrink-0 z-10 w-full">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors hidden md:block">
              <AlignLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold tracking-tight hidden sm:block">{farmName}</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden md:block w-72 lg:w-96">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={aiQuery}
                onChange={e => { setAiQuery(e.target.value); setAiAnswer(""); }}
                onKeyDown={handleAiSearch}
                placeholder="Ask AgriFlow AI... (Enter)"
                className="w-full bg-gray-100 border border-transparent rounded-full pl-10 pr-4 py-2.5 text-sm outline-none focus:bg-white focus:border-black transition-all font-medium placeholder:text-gray-400"
              />
              {aiLoading && <Loader2 className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
              {aiAnswer && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl p-4 shadow-lg z-50 text-sm text-gray-700 leading-relaxed">
                  <p className="font-bold text-xs text-gray-400 uppercase tracking-widest mb-2">AgriFlow AI</p>
                  {aiAnswer}
                  <button onClick={() => setAiAnswer("")} className="mt-2 text-xs text-gray-400 hover:text-black block">Dismiss</button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 border-l border-gray-200 pl-6">
              {/* Notifications */}
              <div ref={notifRef} className="relative">
                <button onClick={() => setShowNotifs(v => !v)} className="relative p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                  <Bell className="w-5 h-5" />
                  {notifCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />}
                </button>
                <AnimatePresence>
                  {showNotifs && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-sm">Notifications</h3>
                        {notifCount > 0 && <button onClick={markAllRead} className="text-xs text-gray-400 hover:text-black font-medium">Mark all read</button>}
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-center text-gray-400 text-sm py-6">All caught up!</p>
                        ) : notifications.map(n => (
                          <div key={n._id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.isRead ? "bg-blue-50/40" : ""}`}>
                            <p className="text-sm font-bold text-gray-900">{n.title}</p>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 leading-relaxed">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {user?.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-bold leading-none">{user?.name ?? "Loading..."}</p>
                  <p className="text-xs text-gray-500 font-medium mt-1">{user?.email ?? ""}</p>
                </div>
                <button onClick={handleLogout} title="Logout" className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
