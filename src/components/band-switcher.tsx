"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, Music2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { CreateBandForm } from "@/components/create-band-form";
import { AnimatePresence, motion } from "framer-motion";

export function BandSwitcher() {
  const [memberships, setMemberships] = useState<any[]>([]);
  const [activeBandId, setActiveBandId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateBandOpen, setIsCreateBandOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Get active band from cookie
    const match = document.cookie.match(new RegExp('(^| )activeBandId=([^;]+)'));
    if (match) setActiveBandId(match[2]);

    fetch("/api/band/my-bands")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMemberships(data);
          
          // If no active band is set, but we have bands, set the first one
          if (!match && data.length > 0) {
            switchBand(data[0].band.id);
          }
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const switchBand = (bandId: string) => {
    document.cookie = `activeBandId=${bandId}; path=/; max-age=31536000`; // 1 year
    setActiveBandId(bandId);
    setIsOpen(false);
    
    // Refresh the page to reload context
    window.location.href = "/dashboard";
  };

  if (isLoading) {
    return (
      <div className="relative mt-2">
        <div className="w-full flex items-center justify-between px-3 py-2 bg-white/5 border border-zinc-800/50 rounded-xl">
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 rounded-lg bg-zinc-800/50 animate-pulse shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="w-2/3 h-3 bg-zinc-800/50 rounded animate-pulse" />
              <div className="w-1/3 h-2 bg-zinc-800/50 rounded animate-pulse" />
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-zinc-700 shrink-0" />
        </div>
      </div>
    );
  }

  const activeMembership = memberships.find(m => m.band.id === activeBandId) || memberships[0];

  if (!activeMembership) return null;

  return (
    <div className="relative mt-2" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 border border-zinc-800 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {activeMembership.band.logoUrl ? (
             <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
               <img src={activeMembership.band.logoUrl} alt="Logo" className="w-full h-full object-cover" />
             </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Music2 className="w-4 h-4" />
            </div>
          )}
          <div className="flex flex-col items-start truncate text-left">
            <span className="text-sm font-bold text-white truncate">{activeMembership.band.name}</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{activeMembership.bandRole}</span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50">
          <div className="max-h-64 overflow-y-auto">
            {memberships.map((m) => (
              <button
                key={m.band.id}
                onClick={() => switchBand(m.band.id)}
                className={`w-full flex flex-col items-start px-4 py-3 hover:bg-white/5 transition-colors ${
                  activeBandId === m.band.id ? "bg-white/5 border-l-2 border-indigo-500" : "border-l-2 border-transparent"
                }`}
              >
                <span className="text-sm font-bold text-white">{m.band.name}</span>
                <span className="text-xs text-zinc-500">{m.bandRole}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              setIsCreateBandOpen(true);
            }}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-500/10 transition-colors border-t border-zinc-800/50 text-zinc-400 hover:text-indigo-400 font-medium text-sm group"
          >
            <span>Create New Band</span>
            <div className="w-6 h-6 rounded-md bg-zinc-800/50 group-hover:bg-indigo-500/20 flex items-center justify-center transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      <AnimatePresence>
        {isCreateBandOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl"
            >
              <CreateBandForm onCancel={() => setIsCreateBandOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
