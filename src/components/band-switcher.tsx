"use client";

import { useState, useEffect, useRef, useId } from "react";
import { bandRoleLabel } from "@/lib/utils";
import { ChevronDown, Plus, Music2 } from "lucide-react";
import { CreateBandForm } from "@/components/create-band-form";
import { AnimatePresence, motion } from "framer-motion";
import { switchActiveBand } from "@/lib/switch-active-band";

type Membership = {
  band: { id: string; name: string; logoUrl: string | null };
  bandRole: string;
};

export function BandSwitcher({ activeBandId }: { activeBandId: string | null }) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateBandOpen, setIsCreateBandOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionsId = useId();

  useEffect(() => {
    fetch("/api/band/my-bands")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMemberships(data);
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

  if (isLoading) {
    return (
      <div className="relative" aria-hidden="true">
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
    <div
      className="relative"
      ref={dropdownRef}
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button 
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Switch band. Current band: ${activeMembership.band.name}`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? optionsId : undefined}
        className="flex min-h-11 w-full items-center justify-between gap-1 rounded-lg border border-zinc-800 bg-white/5 px-2 py-1.5 transition-colors hover:bg-white/10 xl:px-3"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {activeMembership.band.logoUrl ? (
             <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
               <img src={activeMembership.band.logoUrl} alt="" className="w-full h-full object-cover" />
             </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Music2 className="w-4 h-4" />
            </div>
          )}
          <div className="flex flex-col items-start truncate text-left">
            <span className="max-w-full truncate text-sm font-semibold text-white">{activeMembership.band.name}</span>
            <span className="text-[10px] text-zinc-400">{bandRoleLabel(activeMembership.bandRole)}</span>
          </div>
        </div>
        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div id={optionsId} className="absolute right-0 top-full z-50 mt-2 w-full min-w-48 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
          <div className="max-h-64 overflow-y-auto">
            {memberships.map((m) => (
              <button
                key={m.band.id}
                onClick={() => switchActiveBand(m.band.id)}
                className={`w-full flex flex-col items-start px-4 py-3 hover:bg-white/5 transition-colors ${
                  activeMembership.band.id === m.band.id ? "bg-white/5 border-l-2 border-indigo-500" : "border-l-2 border-transparent"
                }`}
              >
                <span className="text-sm font-bold text-white">{m.band.name}</span>
                <span className="text-xs text-zinc-500">{bandRoleLabel(m.bandRole)}</span>
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
