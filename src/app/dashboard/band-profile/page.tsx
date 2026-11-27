"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Image as ImageIcon, Save, Trash2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function BandProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisbanding, setIsDisbanding] = useState(false);
  const [isDisbandModalOpen, setIsDisbandModalOpen] = useState(false);
  const [confirmBandName, setConfirmBandName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("MUSICIAN");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    genres: "",
    instagram: "",
    spotify: "",
    youtube: "",
    website: ""
  });
  
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/band/profile");
      if (res.ok) {
        const data = await res.json();
        setRole(data.role);
        const band = data.band;
        setFormData({
          name: band.name || "",
          description: band.description || "",
          location: band.location || "",
          genres: band.genres || "",
          instagram: band.instagram || "",
          spotify: band.spotify || "",
          youtube: band.youtube || "",
          website: band.website || ""
        });
        setLogoPreview(band.logoUrl || null);
        setCoverPreview(band.coverUrl || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (type === 'logo') {
        setLogoPreview(url);
        setRemoveLogo(false);
      } else {
        setCoverPreview(url);
        setRemoveCover(false);
      }
    }
  };

  const handleRemoveImage = (type: 'logo' | 'cover') => {
    if (type === 'logo') {
      setLogoPreview(null);
      setRemoveLogo(true);
      if (logoInputRef.current) logoInputRef.current.value = '';
    } else {
      setCoverPreview(null);
      setRemoveCover(true);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== "ADMIN") return;
    
    setIsSaving(true);
    
    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value);
      });
      
      const logoFile = logoInputRef.current?.files?.[0];
      if (logoFile) submitData.append("logoFile", logoFile);
      
      const coverFile = coverInputRef.current?.files?.[0];
      if (coverFile) submitData.append("coverFile", coverFile);
      
      if (removeLogo) submitData.append("removeLogo", "true");
      if (removeCover) submitData.append("removeCover", "true");
      
      const toastId = toast.loading("Saving profile...");
      const res = await fetch("/api/band/profile", {
        method: "POST",
        body: submitData
      });
      
      if (res.ok) {
        toast.success("Band profile updated!", { id: toastId });
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save", { id: toastId });
      }
    } catch (error) {
      toast.error("Network error occurred");
    } finally {
      setIsSaving(false);
      window.scrollTo(0, 0);
    }
  };

  const handleDisbandBand = async () => {
    if (confirmBandName !== formData.name) {
      toast.error("Band name doesn't match");
      return;
    }
    if (!confirmPassword) {
      toast.error("Password is required");
      return;
    }

    setIsDisbanding(true);
    const toastId = toast.loading("Disbanding band...");
    try {
      const res = await fetch("/api/band/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: confirmPassword })
      });
      if (res.ok) {
        toast.success("Band disbanded successfully", { id: toastId });
        // Force full page reload to clear context and hit dashboard
        window.location.href = "/dashboard";
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to disband band", { id: toastId });
      }
    } catch (e) {
      toast.error("Network error occurred", { id: toastId });
    } finally {
      setIsDisbanding(false);
      if (!isDisbanding) {
        setIsDisbandModalOpen(false);
        setConfirmPassword("");
        setConfirmBandName("");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-pulse relative px-2 pb-24">
        <header className="mb-8">
          <div className="h-10 bg-zinc-800/50 rounded-lg w-64 mb-3"></div>
          <div className="h-4 bg-zinc-800/50 rounded-lg w-96"></div>
        </header>

        <div className="space-y-8 mt-8">
          {/* Cover Photo Skeleton */}
          <div className="glass-card rounded-[2rem] border border-zinc-800/50 relative mb-8">
            <div className="h-64 md:h-80 w-full bg-zinc-800/30 rounded-[2rem]"></div>
            <div className="absolute -bottom-10 left-8 md:left-12">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-zinc-800/50 border-4 border-zinc-900"></div>
            </div>
          </div>

          {/* Basic Info Skeleton */}
          <div className="glass-card rounded-[2rem] p-8 md:p-10 border border-zinc-800/50 mt-16">
            <div className="h-7 bg-zinc-800/50 rounded-lg w-48 mb-6"></div>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="h-3 bg-zinc-800/50 rounded w-24"></div>
                <div className="h-12 bg-zinc-800/30 rounded-xl w-full"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-zinc-800/50 rounded w-32"></div>
                <div className="h-24 bg-zinc-800/30 rounded-xl w-full"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="h-3 bg-zinc-800/50 rounded w-20"></div>
                  <div className="h-12 bg-zinc-800/30 rounded-xl w-full"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-zinc-800/50 rounded w-16"></div>
                  <div className="h-12 bg-zinc-800/30 rounded-xl w-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Social links Skeleton */}
          <div className="glass-card rounded-[2rem] p-8 md:p-10 border border-zinc-800/50">
            <div className="h-7 bg-zinc-800/50 rounded-lg w-40 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 bg-zinc-800/50 rounded w-28"></div>
                  <div className="h-12 bg-zinc-800/30 rounded-xl w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in relative px-2 pb-24">
      <header className="workspace-header">
        <div>
          <h1>Band Profile</h1>
          <p>Manage your band&apos;s identity, images, and public presence.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8 mt-8">
        
        {/* Cover Photo */}
        <div className="glass-card rounded-[2rem] border border-zinc-800 overflow-visible relative group mb-8">
          <div className="h-64 md:h-80 w-full bg-zinc-900 relative rounded-[2rem] overflow-hidden">
            {coverPreview ? (
              <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                <span className="text-sm font-medium">No Cover Photo</span>
              </div>
            )}
            {role === "ADMIN" && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <button type="button" onClick={() => coverInputRef.current?.click()} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md font-bold transition-colors">
                  Upload Cover Photo
                </button>
                {coverPreview && (
                  <button type="button" onClick={() => handleRemoveImage('cover')} className="p-3 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-xl backdrop-blur-md transition-colors" title="Remove Cover Photo">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <input type="file" ref={coverInputRef} onChange={(e) => handleFileChange(e, 'cover')} accept="image/*" className="hidden" />
              </div>
            )}
          </div>
          
          {/* Logo overlay */}
          <div className="absolute -bottom-10 left-8 md:left-12 flex items-end">
            <div className="relative group/logo">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-zinc-950 border-4 border-zinc-900 overflow-hidden relative shadow-2xl">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-zinc-900">
                    <ImageIcon className="w-8 h-8 opacity-50" />
                  </div>
                )}
                {role === "ADMIN" && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <button type="button" onClick={() => logoInputRef.current?.click()} className="text-xs text-white font-bold bg-white/20 px-3 py-2 rounded-lg backdrop-blur-sm">
                      Change Logo
                    </button>
                    {logoPreview && (
                      <button type="button" onClick={() => handleRemoveImage('logo')} className="text-xs text-red-300 font-bold bg-red-500/20 hover:bg-red-500/40 px-3 py-2 rounded-lg backdrop-blur-sm">
                        Remove
                      </button>
                    )}
                    <input type="file" ref={logoInputRef} onChange={(e) => handleFileChange(e, 'logo')} accept="image/*" className="hidden" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="glass-card rounded-[2rem] p-8 md:p-10 border border-zinc-800">
          <h3 className="text-xl font-bold text-white mb-6">Basic Information</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 ml-1">Band Name</label>
              <input 
                type="text" required disabled={role !== "ADMIN"}
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white disabled:opacity-50 outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 ml-1">Bio / Description</label>
              <textarea 
                rows={4} disabled={role !== "ADMIN"}
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white disabled:opacity-50 outline-none resize-none" 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 ml-1">Location</label>
                <input 
                  type="text" placeholder="e.g. Los Angeles, CA" disabled={role !== "ADMIN"}
                  value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                  className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white disabled:opacity-50 outline-none" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 ml-1">Genres</label>
                <input 
                  type="text" placeholder="e.g. Rock, Alternative" disabled={role !== "ADMIN"}
                  value={formData.genres} onChange={e => setFormData({...formData, genres: e.target.value})}
                  className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white disabled:opacity-50 outline-none" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Social links */}
        <div className="glass-card rounded-[2rem] p-8 md:p-10 border border-zinc-800">
          <h3 className="text-xl font-bold text-white mb-6">Social Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 ml-1">Instagram URL</label>
              <input 
                type="url" placeholder="https://instagram.com/..." disabled={role !== "ADMIN"}
                value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white disabled:opacity-50 outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 ml-1">Spotify Artist URL</label>
              <input 
                type="url" placeholder="https://open.spotify.com/artist/..." disabled={role !== "ADMIN"}
                value={formData.spotify} onChange={e => setFormData({...formData, spotify: e.target.value})}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white disabled:opacity-50 outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 ml-1">YouTube Channel URL</label>
              <input 
                type="url" placeholder="https://youtube.com/..." disabled={role !== "ADMIN"}
                value={formData.youtube} onChange={e => setFormData({...formData, youtube: e.target.value})}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white disabled:opacity-50 outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 ml-1">Website URL</label>
              <input 
                type="url" placeholder="https://yourband.com" disabled={role !== "ADMIN"}
                value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white disabled:opacity-50 outline-none" 
              />
            </div>
          </div>
        </div>

        {role === "ADMIN" && (
          <div className="flex justify-end">
            <button 
              type="submit" disabled={isSaving} 
              className="workspace-primary"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Profile Changes
            </button>
          </div>
        )}

      </form>

      {role === "ADMIN" && (
        <div className="glass-card rounded-[2rem] p-8 md:p-10 border border-red-500/20 mt-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-red-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </h3>
              <p className="text-zinc-400 text-sm max-w-xl">
                Disbanding your band is a permanent action. This will immediately delete the band, all members, gigs, setlists, tasks, gear, and finances associated with it. This action cannot be undone.
              </p>
            </div>
            <button 
              onClick={() => setIsDisbandModalOpen(true)}
              className="shrink-0 px-6 py-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl font-bold transition-all border border-red-500/20 hover:border-red-500"
            >
              Disband Band
            </button>
          </div>
        </div>
      )}

      {/* Disband Confirmation Modal */}
      <AnimatePresence>
        {isDisbandModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card max-w-md w-full rounded-3xl p-8 border border-red-500/20 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-red-500/5" />
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-6 mx-auto">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 text-center">Are You Absolutely Sure?</h3>
                <p className="text-zinc-400 text-center mb-6 text-sm">
                  This action cannot be undone. This will permanently delete the <strong>{formData.name}</strong> band and remove all associated data.
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 ml-1">Type The Band Name To Confirm</label>
                    <input 
                      type="text" required placeholder={formData.name}
                      value={confirmBandName} onChange={e => setConfirmBandName(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 ml-1">Your Password</label>
                    <input 
                      type="password" required placeholder="Enter password to confirm"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white outline-none" 
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setIsDisbandModalOpen(false);
                      setConfirmBandName("");
                      setConfirmPassword("");
                    }}
                    disabled={isDisbanding}
                    className="flex-1 py-3 px-4 glass rounded-xl font-medium text-zinc-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDisbandBand}
                    disabled={isDisbanding || confirmBandName !== formData.name || !confirmPassword}
                    className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDisbanding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Yes, Disband
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
