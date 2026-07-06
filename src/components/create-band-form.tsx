"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export function CreateBandForm({ onCancel }: { onCancel?: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/band", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description })
      });

      if (res.ok) {
        toast.success("Band created!");
        window.location.reload();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create band");
        setError(data.error || "Failed to create band");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
      setError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-3xl p-8 md:p-12 text-center max-w-xl mx-auto border border-zinc-800 bg-zinc-950/90 relative">
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-2xl font-bold text-white text-left">{onCancel ? "Create a New Band" : "You aren't in a band yet!"}</h2>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors absolute top-6 right-6">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <p className="text-zinc-400 mb-8 text-left">{onCancel ? "Start a new project or group." : "Wait for an invite or start your own band right now."}</p>
      
      <form onSubmit={handleCreate} className="space-y-4 text-left">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300 ml-1">Band Name</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full glass-input rounded-xl px-4 py-3 text-sm outline-none" placeholder="The Rockers" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300 ml-1">Description (Optional)</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full glass-input rounded-xl px-4 py-3 text-sm outline-none resize-none" placeholder="We play alternative rock..." />
        </div>
        <button type="submit" disabled={isSubmitting} className="w-full mt-4 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2">
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Band
        </button>
      </form>
    </motion.div>
  );
}
