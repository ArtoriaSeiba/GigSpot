"use client";

import { useState, useEffect, useRef } from "react";
import { User, Mail, CalendarDays, Loader2, Save, Camera, Phone, FileText, Music2, Trash2, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [availability, setAvailability] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [bands, setBands] = useState<any[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'avatar') setImage(reader.result as string);
        else setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setName(data.name || "");
          setEmail(data.email || "");
          setAvailability(data.availability || "");
          setPhone(data.phone || "");
          setBio(data.bio || "");
          setBands(data.bandMembers || []);
          setImage(data.image || null);
          setCoverImage(data.coverImage || null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, availability, phone, bio, image, coverImage }),
      });
      if (res.ok) {
        toast.success("Profile updated successfully!");
      } else {
        toast.error("Failed to update profile.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred.");
    } finally {
      setIsSaving(false);
      window.scrollTo(0, 0);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-pulse relative px-2 pb-24">
        <header className="mb-8">
          <div className="h-10 bg-zinc-800/50 rounded-lg w-64 mb-3"></div>
          <div className="h-4 bg-zinc-800/50 rounded-lg w-96"></div>
        </header>

        <div className="space-y-16 mt-8">
          {/* Cover Photo Skeleton */}
          <div className="glass-card rounded-[2rem] border border-zinc-800/50 relative mb-12">
            <div className="h-64 md:h-80 w-full bg-zinc-800/30 rounded-[2rem]"></div>
            <div className="absolute -bottom-10 left-8 md:left-12">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-zinc-800/50 border-4 border-zinc-900"></div>
            </div>
          </div>

          {/* Basic Info Skeleton */}
          <div className="glass-card rounded-[2rem] p-8 md:p-10 border border-zinc-800/50">
            <div className="h-7 bg-zinc-800/50 rounded-lg w-48 mb-6"></div>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="h-3 bg-zinc-800/50 rounded w-24"></div>
                <div className="h-12 bg-zinc-800/30 rounded-xl w-full"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-zinc-800/50 rounded w-32"></div>
                <div className="h-12 bg-zinc-800/30 rounded-xl w-full"></div>
              </div>
            </div>
          </div>

          {/* Contact & Availability Skeleton */}
          <div className="glass-card rounded-[2rem] p-8 md:p-10 border border-zinc-800/50">
            <div className="h-7 bg-zinc-800/50 rounded-lg w-48 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="h-3 bg-zinc-800/50 rounded w-24"></div>
                <div className="h-12 bg-zinc-800/30 rounded-xl w-full"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-zinc-800/50 rounded w-24"></div>
                <div className="h-12 bg-zinc-800/30 rounded-xl w-full"></div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="h-3 bg-zinc-800/50 rounded w-36"></div>
                <div className="h-24 bg-zinc-800/30 rounded-xl w-full"></div>
              </div>
            </div>
          </div>
          
          {/* My Bands Skeleton */}
          <div className="glass-card rounded-[2rem] p-8 md:p-10 border border-zinc-800/50">
            <div className="h-7 bg-zinc-800/50 rounded-lg w-32 mb-6"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-zinc-800/30 rounded-2xl w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in relative px-2 pb-24">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">My Profile</h1>
        <p className="text-zinc-400 text-sm">Manage your personal settings, identity, and availability.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-16 mt-8">
        
        {/* Cover Photo */}
        <div className="glass-card rounded-[2rem] border border-zinc-800 overflow-visible relative group mb-12">
          <div className="h-64 md:h-80 w-full bg-zinc-900 relative rounded-[2rem] overflow-hidden">
            {coverImage ? (
              <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                <span className="text-sm font-medium">No cover photo</span>
              </div>
            )}
            
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button type="button" onClick={() => coverInputRef.current?.click()} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md font-bold transition-colors">
                Upload Cover Photo
              </button>
              {coverImage && (
                <button type="button" onClick={() => setCoverImage(null)} className="p-3 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-xl backdrop-blur-md transition-colors" title="Remove Cover Photo">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <input type="file" ref={coverInputRef} onChange={(e) => handleImageChange(e, 'cover')} accept="image/*" className="hidden" />
            </div>
          </div>
          
          {/* Avatar overlay */}
          <div className="absolute -bottom-10 left-8 md:left-12 flex items-end">
            <div className="relative group/avatar">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-zinc-950 border-4 border-zinc-900 overflow-hidden relative shadow-2xl">
                {image ? (
                  <img src={image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-zinc-900">
                    <ImageIcon className="w-8 h-8 opacity-50" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <button type="button" onClick={() => avatarInputRef.current?.click()} className="text-xs text-white font-bold bg-white/20 px-3 py-2 rounded-lg backdrop-blur-sm">
                    Change Photo
                  </button>
                  {image && (
                    <button type="button" onClick={() => setImage(null)} className="text-xs text-red-300 font-bold bg-red-500/20 hover:bg-red-500/40 px-3 py-2 rounded-lg backdrop-blur-sm">
                      Remove
                    </button>
                  )}
                  <input type="file" ref={avatarInputRef} onChange={(e) => handleImageChange(e, 'avatar')} accept="image/*" className="hidden" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="glass-card rounded-[2rem] p-8 md:p-10 border border-zinc-800">
          <h3 className="text-xl font-bold text-white mb-6">Basic Information</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Full Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white outline-none" 
                placeholder="John Doe" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                type="email" 
                value={email} 
                disabled
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-zinc-400 outline-none opacity-50 cursor-not-allowed bg-black/20" 
              />
              <p className="text-xs text-zinc-500 ml-1">Email address is linked to your login and cannot be changed.</p>
            </div>
          </div>
        </div>

        {/* Contact & Availability */}
        <div className="glass-card rounded-[2rem] p-8 md:p-10 border border-zinc-800">
          <h3 className="text-xl font-bold text-white mb-6">Contact & Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-400" /> Phone Number
              </label>
              <input 
                type="tel"
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white outline-none" 
                placeholder="+1 (555) 000-0000" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" /> Short Bio
              </label>
              <input 
                type="text"
                value={bio} 
                onChange={(e) => setBio(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white outline-none" 
                placeholder="Bassist, 10 years experience..." 
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-400" /> My Availability Notes
              </label>
              <textarea 
                rows={3}
                value={availability} 
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white outline-none resize-none" 
                placeholder="E.g., I'm usually free on weekends, but busy every Tuesday night." 
              />
            </div>
          </div>
        </div>

        {/* My Bands */}
        <div className="glass-card rounded-[2rem] p-8 md:p-10 border border-zinc-800">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Music2 className="w-5 h-5 text-cyan-400" /> My Bands
          </h3>
          {bands.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-zinc-700/50 rounded-2xl">
              <p className="text-sm text-zinc-500 italic">You are not in any bands yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {bands.map((b: any) => (
                <div key={b.bandId} className="bg-zinc-900/50 hover:bg-zinc-900 rounded-2xl p-5 flex flex-col border border-zinc-800/50 transition-colors">
                  <span className="font-bold text-white text-lg">{b.band.name}</span>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-2">{b.bandRole}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit" disabled={isSaving} 
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-3 disabled:opacity-50 hover:scale-105 active:scale-95"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Profile Changes
          </button>
        </div>

      </form>
    </div>
  );
}
