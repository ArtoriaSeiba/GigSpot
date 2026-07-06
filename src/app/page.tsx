"use client";

import Link from "next/link";
import { ArrowRight, Guitar, CalendarSync, Sparkles, Music2, Users, DollarSign, CheckCircle2, Star, ShieldCheck } from "lucide-react";
import { motion, Variants } from "framer-motion";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-black overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            GigSpot.
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#workflow" className="hover:text-white transition-colors">How it Works</Link>
            <Link href="#testimonials" className="hover:text-white transition-colors">Testimonials</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-zinc-300 hover:text-white transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link href="/register" className="text-sm font-bold bg-white text-black px-5 py-2.5 rounded-full hover:bg-zinc-200 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-40 pb-20 lg:pt-48 lg:pb-32 px-6">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="relative z-10 max-w-5xl mx-auto text-center"
        >
          <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-indigo-500/30 shadow-lg shadow-indigo-500/10 mb-8">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-indigo-100 tracking-wide">Introducing WebAR Fretboard Sync v2.0</span>
          </motion.div>

          <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 mb-8 leading-[1.1]">
            The Command Center for <br className="hidden lg:block" />
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              Independent Musicians.
            </span>
          </motion.h1>

          <motion.p variants={fadeIn} className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Escape the chaos of group chats. GigSpot is the all-in-one platform to organize gigs, manage dynamic setlists, track revenue, and master your repertoire with live Augmented Reality.
          </motion.p>

          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register" 
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] w-full sm:w-auto"
            >
              <span>Start for free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="#features" 
              className="inline-flex items-center justify-center px-8 py-4 glass rounded-full font-medium text-white hover:bg-white/10 transition-colors w-full sm:w-auto"
            >
              Explore Features
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div variants={fadeIn} className="mt-16 pt-10 border-t border-white/10 flex flex-col items-center justify-center gap-6">
            <p className="text-sm text-zinc-500 font-medium uppercase tracking-widest">Trusted by over 10,000 gigging bands worldwide</p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-50 grayscale">
              {/* Fake band logos using text for demo */}
              <span className="text-xl font-bold font-serif">The Velvet Underground</span>
              <span className="text-xl font-black italic tracking-tighter">METALLICA</span>
              <span className="text-xl font-mono font-bold">RADIOHEAD</span>
              <span className="text-xl font-bold tracking-widest">COLDPLAY</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-24 bg-zinc-950 relative border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Everything you need to own the stage.</h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">We built GigSpot to replace the 5 different apps your band currently uses to barely stay organized.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <CalendarSync className="w-6 h-6 text-indigo-400" />,
                title: "Logistics & Calendars",
                desc: "A single source of truth. Centralize load-in times, venue details, and automatically sync to Google Calendar."
              },
              {
                icon: <Guitar className="w-6 h-6 text-cyan-400" />,
                title: "WebAR Rehearsal",
                desc: "Launch our WebAR engine in your browser to project digital notes and chords precisely onto your physical fretboard."
              },
              {
                icon: <Users className="w-6 h-6 text-purple-400" />,
                title: "Band Management",
                desc: "Invite members, assign roles, and manage permissions. Everyone always has the latest version of the setlist."
              },
              {
                icon: <DollarSign className="w-6 h-6 text-emerald-400" />,
                title: "Revenue Tracking",
                desc: "Log gig payouts, track merchandise sales, and automatically calculate splits for each band member."
              },
              {
                icon: <ShieldCheck className="w-6 h-6 text-blue-400" />,
                title: "Secure Cloud Storage",
                desc: "Store stage plots, technical riders, and contract PDFs safely in the cloud, accessible from anywhere."
              },
              {
                icon: <Music2 className="w-6 h-6 text-pink-400" />,
                title: "Dynamic Setlists",
                desc: "Drag and drop songs to build setlists in seconds. Add BPMs, keys, and transition notes for the whole band."
              }
            ].map((feature, i) => (
              <div key={i} className="glass-card p-8 rounded-3xl group hover:bg-white/[0.02] transition-colors border border-white/5">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- WORKFLOW --- */}
      <section id="workflow" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-8">
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                From booking to encore, <br/>we've got you covered.
              </h2>
              
              <div className="space-y-6 pt-4">
                {[
                  "Create a gig and invite your bandmates.",
                  "Build a dynamic setlist and attach stage plots.",
                  "Sync load-in times to everyone's Google Calendar.",
                  "Get paid and instantly calculate member splits."
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-lg text-zinc-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-1/2 w-full">
              <div className="glass-card p-2 rounded-2xl border border-white/10 shadow-2xl shadow-indigo-500/10">
                {/* Fake Dashboard UI Mockup */}
                <div className="bg-[#0a0a0f] rounded-xl overflow-hidden border border-white/5">
                  <div className="h-12 border-b border-white/5 flex items-center px-4 gap-2 bg-white/[0.02]">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="mx-auto bg-black/50 px-32 py-1.5 rounded-md text-xs text-zinc-500 font-mono">gigspot.app/dashboard</div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <h4 className="text-xl font-bold text-white">Upcoming Gigs</h4>
                        <p className="text-xs text-zinc-500">Next 30 days</p>
                      </div>
                      <div className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded-full">3 Confirmed</div>
                    </div>
                    
                    <div className="space-y-3">
                      {[
                        { date: "Oct 24", name: "The Viper Room", pay: "$500" },
                        { date: "Oct 31", name: "Halloween Bash @ Roxy", pay: "$1,200" },
                        { date: "Nov 05", name: "Whisky a Go Go", pay: "$800" },
                      ].map((gig, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex flex-col items-center justify-center">
                              <span className="text-[10px] uppercase font-bold text-indigo-400 leading-none">{gig.date.split(' ')[0]}</span>
                              <span className="text-sm font-black text-white leading-none mt-1">{gig.date.split(' ')[1]}</span>
                            </div>
                            <span className="font-semibold text-zinc-200">{gig.name}</span>
                          </div>
                          <span className="text-sm text-emerald-400 font-mono">{gig.pay}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS --- */}
      <section id="testimonials" className="py-24 bg-zinc-950 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white">Built by musicians, for musicians.</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "GigSpot completely eliminated the confusion of text thread setlists. We literally load in, look at the dashboard, and rock out.",
                author: "Sarah J.",
                role: "Lead Singer, The Echoes"
              },
              {
                quote: "The WebAR feature is mind-blowing. Learning new covers for wedding gigs takes half the time it used to.",
                author: "Mike T.",
                role: "Session Guitarist"
              },
              {
                quote: "Syncing load-in times directly to my Google Calendar means I'm actually on time for soundcheck now.",
                author: "Dave R.",
                role: "Drummer (Always late)"
              }
            ].map((t, i) => (
              <div key={i} className="glass-card p-8 rounded-3xl relative">
                <Star className="w-8 h-8 text-yellow-500/20 absolute top-6 right-6" />
                <p className="text-zinc-300 mb-6 italic">"{t.quote}"</p>
                <div>
                  <p className="font-bold text-white">{t.author}</p>
                  <p className="text-xs text-indigo-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-900/20" />
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <h2 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">Ready to rock?</h2>
          <p className="text-xl text-zinc-400 mb-10">Stop managing spreadsheets. Start managing your music.</p>
          <Link 
            href="/register" 
            className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-white text-black font-black rounded-full hover:scale-105 active:scale-95 transition-transform shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] text-lg"
          >
            Create Your Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-6 text-sm text-zinc-500">No credit card required. Setup takes 30 seconds.</p>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-white/10 bg-black py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <Link href="/" className="font-bold text-xl bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            GigSpot.
          </Link>
          <div className="text-sm text-zinc-500 flex gap-6">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors">Contact</Link>
          </div>
          <p className="text-sm text-zinc-600">© 2026 GigSpot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
