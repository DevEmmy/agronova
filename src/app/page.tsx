"use client";

import Image from "next/image";
import { ArrowUpRight, Play } from "lucide-react";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";

function Counter({ from, to, duration = 2.5, prefix = "", suffix = "" }: { from: number, to: number, duration?: number, prefix?: string, suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "-50px" });
  const count = useMotionValue(from);
  const rounded = useTransform(count, (latest) => prefix + Math.round(latest) + suffix);

  useEffect(() => {
    if (inView) {
      const controls = animate(count, to, { duration, ease: [0.16, 1, 0.3, 1] });
      return controls.stop;
    } else {
      count.set(from); // Reset when out of view
    }
  }, [count, inView, to, from, duration]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.8, 
      ease: [0.16, 1, 0.3, 1] 
    } 
  }
};

const staggerContainer = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.1,
      duration: 0.5
    }
  }
};

export default function LandingPage() {
  return (
    <div className="bg-[#fcfcfc] min-h-screen text-[#111] font-sans selection:bg-black selection:text-white overflow-hidden">
      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded-lg">A</div>
          AgriFlow
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="#features" className="hover:text-black transition-colors">Features</a>
          <a href="#modules" className="hover:text-black transition-colors">Modules</a>
          <a href="#dashboard" className="hover:text-black transition-colors">Dashboard</a>
          <a href="#about" className="hover:text-black transition-colors">About Us</a>
        </div>
        <button className="hidden md:block px-6 py-2.5 rounded-full border border-gray-200 text-sm font-medium hover:bg-black hover:text-white transition-all">
          Get Access
        </button>
      </motion.nav>

      {/* Hero Section */}
      <section className="px-6 pt-12 pb-24 max-w-7xl mx-auto relative flex flex-col md:flex-row items-center gap-12">
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ margin: "-50px" }}
          className="flex-1 space-y-8 z-10 w-full"
        >
          <motion.h1 
            variants={fadeUp}
            className="text-[10vw] md:text-[6rem] leading-[0.9] font-medium tracking-tight whitespace-nowrap"
          >
            Livestock<br />Management
          </motion.h1>
          <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mt-8 max-w-2xl">
            {["Notebook Digitization", "Voice Updates", "Predictive Analytics", "Offline Capable", "ROI Tracking", "Vet Alerts"].map((tag) => (
              <span key={tag} className="px-5 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-600 shadow-sm">
                {tag}
              </span>
            ))}
          </motion.div>
        </motion.div>
        
        {/* Floating Image */}
        <motion.div 
          initial={{ opacity: 0, x: 100, rotate: 10 }}
          whileInView={{ opacity: 1, x: 0, rotate: 2 }}
          viewport={{ margin: "-50px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="w-[300px] h-[380px] md:w-[320px] md:h-[400px] relative rounded-lg overflow-hidden shadow-2xl shrink-0 -mt-8 md:mt-0 md:-ml-32 z-20 border-[6px] border-white self-end md:self-auto hover:rotate-0 transition-transform duration-500"
        >
          <Image 
            src="/images/hero.png" 
            alt="Modern Farmer" 
            fill 
            className="object-cover" 
            priority
          />
        </motion.div>
        
        {/* Right side tagline */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ margin: "-50px" }}
          transition={{ duration: 1, delay: 0.6 }}
          className="hidden lg:block absolute right-6 top-32 max-w-[200px] text-xs font-semibold text-gray-500 text-right leading-relaxed uppercase tracking-wider"
        >
          Bridging the Analog-to-Digital Gap in African Livestock Management.
        </motion.div>
      </section>

      {/* The Problem / About Section */}
      <section id="about" className="px-6 py-20 max-w-7xl mx-auto border-t border-gray-100 overflow-hidden">
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ margin: "-50px" }}
          className="grid md:grid-cols-2 gap-16"
        >
          <div className="space-y-6">
            <motion.span variants={fadeUp} className="inline-block px-4 py-1.5 rounded-full border border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
              The Problem
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-2xl md:text-4xl font-medium tracking-tight leading-tight">
              Trapped data has always been more than an inconvenience — it's lost yield.
            </motion.h2>
            <motion.div variants={fadeUp} className="relative aspect-video w-full rounded-2xl overflow-hidden mt-8 group cursor-pointer shadow-lg">
              <Image src="/images/about.png" alt="Scanning Notebook" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                <div className="w-16 h-16 bg-black/80 backdrop-blur-sm shadow-xl rounded-full flex items-center justify-center text-white group-hover:bg-black transition-colors">
                  <Play className="w-6 h-6 ml-1" fill="currentColor" />
                </div>
              </div>
            </motion.div>
          </div>
          
          <div className="flex flex-col justify-center space-y-12 md:pl-12">
            <motion.p variants={fadeUp} className="text-gray-500 font-medium text-lg leading-relaxed max-w-md">
              Institutions and farmers keep critical data in easily lost, unsearchable paper notebooks. We act as a bridge, instantly digitizing to a high-fidelity dashboard.
            </motion.p>
            <motion.div variants={staggerContainer} className="space-y-12">
              <motion.div variants={fadeUp}>
                <div className="text-5xl md:text-6xl font-medium tracking-tighter mb-2">
                  <Counter from={0} to={320} prefix="+" />
                </div>
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Hours saved annually on data entry</div>
              </motion.div>
              <motion.div variants={fadeUp} className="border-t border-gray-200 pt-12">
                <div className="text-5xl md:text-6xl font-medium tracking-tighter mb-2">
                  <Counter from={0} to={280} prefix="+" />
                </div>
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Increase in farm productivity metrics</div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section id="features" className="px-6 py-20 max-w-7xl mx-auto border-t border-gray-100">
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ margin: "-50px" }}
          className="grid lg:grid-cols-[1fr_2fr] gap-16"
        >
          <div className="space-y-8 max-w-md">
            <motion.span variants={fadeUp} className="inline-block px-4 py-1.5 rounded-full border border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Smart Bridges
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-2xl md:text-4xl font-medium tracking-tight leading-tight">
              A Comprehensive look at how we digitize farm logs
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 font-medium leading-relaxed">
              We rely on cutting-edge AI models to bridge the gap without forcing farmers to abandon their traditional habits.
            </motion.p>
            <motion.button variants={fadeUp} className="bg-[#111] text-white px-8 py-4 rounded-full font-medium inline-flex items-center gap-2 hover:bg-black transition-colors">
              Explore Bridges
            </motion.button>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: "AgriSnap", desc: "Camera-first entry point. Uses Gemini Pro Vision to perform OCR on handwritten farm logs.", theme: "light" },
              { title: "AgriTalk", desc: "Hands-free virtual officer. Uses Whisper API for Speech-to-Text updates.", theme: "light" },
              { title: "InsightEngine", desc: "Predictive analytics analyzing historical trends (Feed vs. Weight).", theme: "dark" },
              { title: "Live Dashboard", desc: "KPI cards, sparklines, and AI-powered alerts for critical livestock status.", theme: "light" }
            ].map((card, i) => (
              <motion.div 
                key={i} 
                variants={fadeUp}
                whileHover={{ y: -8 }}
                className={`p-8 md:p-10 rounded-3xl flex flex-col justify-between aspect-square group cursor-pointer transition-colors ${card.theme === 'dark' ? 'bg-[#111] text-white' : 'bg-white border border-gray-100 hover:border-gray-300 shadow-sm'}`}
              >
                <div className="space-y-4">
                  <h3 className="text-2xl font-semibold tracking-tight">{card.title}</h3>
                  <p className={`text-sm ${card.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} leading-relaxed font-medium`}>{card.desc}</p>
                </div>
                <div className="flex justify-end">
                  <div className={`p-4 rounded-full ${card.theme === 'dark' ? 'bg-white/10 group-hover:bg-white text-white group-hover:text-black' : 'bg-[#f4f4f4] group-hover:bg-black group-hover:text-white'} transition-all`}>
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Modules / Experience */}
      <section id="modules" className="px-6 py-20 max-w-7xl mx-auto border-t border-gray-100 overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-16">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ margin: "-50px" }}
            className="space-y-6 max-w-md"
          >
            <motion.span variants={fadeUp} className="inline-block px-4 py-1.5 rounded-full border border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Modules
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-2xl md:text-4xl font-medium tracking-tight leading-tight">
              A Complete Ecosystem for Modern Management
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 font-medium">
              An integrated solution that standardizes workflows and development throughout your year.
            </motion.p>
          </motion.div>
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ margin: "-50px" }}
            className="space-y-0 relative"
          >
             <div className="absolute left-0 right-0 top-0 border-t border-gray-200"></div>
            {[
              { title: "Production Tracking", desc: "Batch management (Species, Breed, Weight). Integrates directly with AgriSnap.", stat: "Module 01" },
              { title: "Financial Records", desc: "ROI tracking in ₦, expense categorization, and precise profit margin analysis.", stat: "Module 02", active: true },
              { title: "Reproduction & Health", desc: "AI-driven due date tracking, automated drug schedules, and vet visit alerts.", stat: "Module 03" },
              { title: "Inventory Engine", desc: "Real-time stock progress bars and automated 'Low Stock' notifications.", stat: "Module 04" },
            ].map((mod, i) => (
              <motion.div 
                key={i} 
                variants={fadeUp}
                className={`group flex flex-col sm:flex-row sm:items-center justify-between py-10 border-b border-gray-200 transition-colors relative ${mod.active ? 'bg-[#ebebeb] px-6 -mx-6 rounded-lg' : 'hover:bg-[#f9f9f9] px-6 -mx-6 rounded-lg'}`}
              >
                <div className="space-y-2 max-w-xl">
                  <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[#111]">{mod.title}</h3>
                  <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed">{mod.desc}</p>
                </div>
                <div className="text-lg md:text-xl font-bold tracking-tight text-right mt-4 sm:mt-0 whitespace-nowrap">
                  {mod.stat}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="dashboard" className="px-6 py-20 max-w-7xl mx-auto border-t border-gray-100 mb-12">
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ margin: "-50px" }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16"
        >
          <div className="space-y-6 max-w-2xl">
            <motion.span variants={fadeUp} className="inline-block px-4 py-1.5 rounded-full border border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Dashboard
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-2xl md:text-4xl font-medium tracking-tight leading-tight">
              Explore our high-fidelity dashboard solutions
            </motion.h2>
          </div>
          <motion.p variants={fadeUp} className="text-gray-500 font-medium text-sm md:text-right max-w-xs uppercase tracking-wide">
             A sneak peek into the AgriFlow AI ecosystem.
          </motion.p>
        </motion.div>
        
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ margin: "-50px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <motion.div variants={fadeUp} className="aspect-[4/3] rounded-2xl overflow-hidden relative shadow-md bg-gray-100 col-span-1 lg:col-span-2">
            <Image src="/images/dashboard1.png" alt="Dashboard View" fill className="object-cover hover:scale-105 transition-transform duration-700" />
          </motion.div>
          <motion.div variants={fadeUp} className="aspect-[4/3] rounded-2xl overflow-hidden relative shadow-md bg-[#111] flex flex-col justify-between p-8 group text-white">
            <div className="space-y-4 max-w-[200px]">
               <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
               </div>
               <h4 className="text-2xl font-semibold leading-tight">Insight Engine Data Streams</h4>
            </div>
            <p className="text-sm text-white/50 leading-relaxed font-medium">Predictive modeling for your farm's performance metrics.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* Testimonial */}
      <motion.section 
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ margin: "-50px" }}
        className="px-6 pb-24 pt-12 max-w-4xl mx-auto text-center space-y-12"
      >
        <motion.div variants={fadeUp} className="text-8xl text-gray-200 font-serif leading-none h-[60px]">"</motion.div>
        <motion.p variants={fadeUp} className="text-xl md:text-2xl font-medium leading-relaxed tracking-tight text-[#111]">
          "Most apps ask farmers to change how they work. AgriFlow AI changes how the app works to fit the farmer. We don't replace the notebook; we give the notebook a brain."
        </motion.p>
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-4 pt-6">
          <div className="w-14 h-14 bg-gray-200 rounded-full overflow-hidden relative">
             <Image src="/images/hero.png" alt="Founder" fill className="object-cover object-top" />
          </div>
          <div className="text-left">
            <div className="font-bold text-lg text-[#111]">AgriFlow Team</div>
            <div className="text-gray-500 text-sm font-medium">Founders, FUNAAB</div>
          </div>
        </motion.div>
      </motion.section>

      <footer className="bg-[#111] text-white pt-20 pb-10 px-6">
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ margin: "-50px" }}
          className="max-w-7xl mx-auto"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12 mb-24 border-b border-white/10 pb-24">
            <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-medium tracking-tight leading-tight">
              Let's Connect <br/> There
            </motion.h2>
            <motion.button variants={fadeUp} className="px-8 py-4 rounded-full bg-white/5 border border-white/10 font-medium hover:bg-white hover:text-black transition-colors flex items-center gap-3">
               Get in touch <ArrowUpRight className="w-5 h-5" />
            </motion.button>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-12 text-sm text-gray-400 font-medium pb-24 border-b border-white/10">
            <motion.div variants={fadeUp} className="space-y-4">
               <div className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white mb-6">
                <div className="w-8 h-8 bg-white text-black flex items-center justify-center rounded-sm">A</div>
                AgriFlow
              </div>
              <p className="max-w-[250px] leading-relaxed">Cross-Platform livestock app that uses AI bridging solutions to analyze farm productivity seamlessly.</p>
              <div className="flex gap-4 pt-4">
                <a href="#" className="hover:text-white transition-colors cursor-pointer border border-white/10 px-3 py-1.5 rounded-full">TW</a>
                <a href="#" className="hover:text-white transition-colors cursor-pointer border border-white/10 px-3 py-1.5 rounded-full">IN</a>
                <a href="#" className="hover:text-white transition-colors cursor-pointer border border-white/10 px-3 py-1.5 rounded-full">IG</a>
              </div>
            </motion.div>
            
            <motion.div variants={fadeUp} className="lg:pl-8">
              <h4 className="text-white mb-6 font-semibold uppercase tracking-wider text-xs">Address</h4>
              <p className="leading-relaxed">Technology Hub<br/>FUNAAB Campus<br/>Abeokuta, Ogun State</p>
            </motion.div>
            
            <motion.div variants={fadeUp} className="lg:pl-8">
              <h4 className="text-white mb-6 font-semibold uppercase tracking-wider text-xs">Email Address</h4>
              <p className="leading-relaxed">hello@agriflow.ai<br/>support@agriflow.ai</p>
            </motion.div>
            
             <motion.div variants={fadeUp} className="flex flex-col space-y-3 lg:pl-8 text-right lg:text-left">
               <a href="#modules" className="hover:text-white transition-colors cursor-pointer">Modules</a>
               <a href="#" className="hover:text-white transition-colors cursor-pointer">Studio</a>
               <a href="#features" className="hover:text-white transition-colors cursor-pointer">Features</a>
               <a href="#about" className="hover:text-white transition-colors cursor-pointer">About Us</a>
            </motion.div>
          </div>
          
          <motion.div variants={fadeUp} className="mt-8 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 font-medium font-mono gap-4">
             <div className="flex gap-6">
               <a href="#" className="hover:text-white transition-colors cursor-pointer">Dribbble</a>
               <a href="#" className="hover:text-white transition-colors cursor-pointer">Studio</a>
               <a href="#" className="hover:text-white transition-colors cursor-pointer">Premium</a>
               <a href="#" className="hover:text-white transition-colors cursor-pointer">Contact Us</a>
             </div>
             <div>© {new Date().getFullYear()} AgriFlow AI. All rights reserved.</div>
          </motion.div>
        </motion.div>
      </footer>
    </div>
  );
}
