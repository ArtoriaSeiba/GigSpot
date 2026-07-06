"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Camera, ShieldAlert, SkipBack, SkipForward, Play } from "lucide-react";

export default function WebARRehearsalPage({ params }: { params: { setlistId: string } }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize WebAR Camera Feed
  useEffect(() => {
    async function initWebAR() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      } catch (err) {
        console.error("WebAR Initialization Failed:", err);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    }

    initWebAR();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-4 animate-fade-in">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-zinc-400 font-medium animate-pulse tracking-wide">Calibrating AR Engine...</p>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-red-950/20 border border-red-900/50 rounded-3xl animate-fade-in">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
        <h2 className="text-2xl font-bold text-white mb-2">Camera Access Required</h2>
        <p className="text-zinc-400 max-w-md">
          WebAR spatial tracking requires camera permissions to project digital notes onto your physical instrument. Please enable camera access in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Live Rehearsal</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Track: <span className="text-indigo-400 font-semibold">Neon Lights</span> • 120 BPM
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full glass shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">AR Active</span>
        </div>
      </div>

      <div className="relative flex-1 w-full min-h-[500px] bg-black rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl shadow-indigo-500/10">
        
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />

        {/* Mock AR Fretboard Overlay Layer */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <div className="relative w-80 h-80">
            {/* Corner brackets for tracking UI */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-indigo-500" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-indigo-500" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-indigo-500" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-indigo-500" />
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="glass px-6 py-3 rounded-full border border-indigo-500/30">
                <p className="text-indigo-300 font-medium text-sm tracking-wide">
                  Scanning Fretboard Marker...
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* HUD Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6 glass px-8 py-4 rounded-full border border-zinc-700/50 shadow-2xl shadow-black/50">
          <button className="text-zinc-400 hover:text-white transition-colors">
            <SkipBack className="w-6 h-6 fill-current" />
          </button>
          <button className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-all hover:scale-105 active:scale-95">
            <Play className="w-6 h-6 fill-current ml-1" />
          </button>
          <button className="text-zinc-400 hover:text-white transition-colors">
            <SkipForward className="w-6 h-6 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
