"use client";

import { useState, useEffect } from "react";
import { Loader2, ArrowLeft, Plus, Trash2, GripVertical, Music, Calendar, DollarSign, CheckSquare } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { Reorder } from "framer-motion";
import toast from "react-hot-toast";

type Song = {
  id: string;
  title: string;
  artist: string;
  tempo: number | null;
  key: string | null;
  duration: string | null;
  status: string;
};

type Gig = {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  type: string;
  income: number | null;
  setlists: {
    id: string;
    songs: { id: string, order: number, song: Song }[];
  }[];
};

export default function GigSetlistPage({ params }: { params: Promise<{ gigId: string }> }) {
  const { gigId } = use(params);
  const [gig, setGig] = useState<Gig | null>(null);
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bandRole, setBandRole] = useState("MUSICIAN");
  const [isPaid, setIsPaid] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  const fetchData = async () => {
    try {
      const roleRes = await fetch("/api/band/role");
      if (roleRes.ok) {
        const data = await roleRes.json();
        setBandRole(data.role);
      }

      const res = await fetch(`/api/gigs/${gigId}`);
      if (res.ok) {
        const data = await res.json();
        setGig(data.gig);
        setAvailableSongs(data.availableSongs);

        if (data.gig.income && data.gig.income > 0) {
          const payRes = await fetch(`/api/gigs/${gigId}/payment`);
          if (payRes.ok) {
            const payData = await payRes.json();
            setIsPaid(payData.isPaid);
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load gig data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [gigId]);

  const handleAddSong = async (songId: string) => {
    try {
      const res = await fetch(`/api/gigs/${gigId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId })
      });
      if (res.ok) {
        toast.success("Song added to setlist");
        fetchData();
      } else {
        toast.error("Failed to add song");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error");
    }
  };

  const handleRemoveSong = async (setlistSongId: string) => {
    try {
      const res = await fetch(`/api/gigs/${gigId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setlistSongId })
      });
      if (res.ok) {
        toast.success("Song removed");
        fetchData();
      } else {
        toast.error("Failed to remove song");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error");
    }
  };

  const handleReorder = async (reorderedSongs: any[]) => {
    if (!gig) return;
    const newGig = { ...gig };
    newGig.setlists[0].songs = reorderedSongs;
    setGig(newGig);
    
    try {
      await fetch(`/api/gigs/${gigId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorderedSongs })
      });
    } catch (e) {
      console.error("Reorder failed", e);
      toast.error("Failed to save new order");
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  if (!gig) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Gig Not Found</h2>
        <Link href="/dashboard/gigs" className="text-indigo-400 hover:text-indigo-300">Back to Gigs</Link>
      </div>
    );
  }

  const setlist = gig.setlists.length > 0 ? gig.setlists[0] : { id: 'temp', songs: [] };
  
  // Filter out songs that are already in the setlist
  const setlistSongIds = new Set(setlist.songs.map(ss => ss.song.id));
  const unaddedSongs = availableSongs.filter(s => !setlistSongIds.has(s.id));

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in relative">
      <Link href="/dashboard/gigs" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Gigs
      </Link>
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-6 h-6 text-indigo-400" />
            <h1 className="text-3xl font-bold text-white">{gig.title}</h1>
          </div>
          <p className="text-zinc-400 text-sm ml-9">{new Date(gig.date).toLocaleDateString()}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Setlist Builder Column */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white mb-4">Gig Setlist</h2>
          
          <div className="glass-card rounded-3xl p-6">
            {setlist.songs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 opacity-50">
                <Music className="w-12 h-12 text-zinc-500 mb-4" />
                <p className="text-zinc-400 font-medium text-sm">No songs added yet.</p>
                <p className="text-zinc-500 text-xs mt-1">Select songs from your Repertoire on the right.</p>
              </div>
            ) : (
              <Reorder.Group axis="y" values={setlist.songs} onReorder={handleReorder} className="space-y-2">
                {setlist.songs.map((ss, idx) => (
                  <Reorder.Item key={ss.id} value={ss} className={`flex items-center gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 transition-colors group ${bandRole === "ADMIN" ? "hover:border-zinc-700" : ""}`}>
                    <div className="text-zinc-500 font-mono text-sm w-4">{idx + 1}</div>
                    {bandRole === "ADMIN" && <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab active:cursor-grabbing hover:text-white transition-colors" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-200 truncate">{ss.song.title}</p>
                      {ss.song.key && <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{ss.song.key}</p>}
                    </div>
                    {bandRole === "ADMIN" && (
                      <button onClick={() => handleRemoveSong(ss.id)} className="text-zinc-600 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </div>
        </div>

        {/* Available Songs Column */}
        {bandRole === "ADMIN" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Add from Repertoire</h2>
            
            <div className="glass-card rounded-3xl p-6 border border-zinc-800/50 bg-black/20">
              {availableSongs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-zinc-400">Your Master Repertoire is empty.</p>
                  <Link href="/dashboard/repertoire" className="inline-block mt-4 text-indigo-400 text-sm font-bold">Add songs to Repertoire</Link>
                </div>
              ) : unaddedSongs.length === 0 ? (
                 <div className="text-center py-8 opacity-50">
                   <p className="text-sm text-zinc-400">All repertoire songs have been added to the setlist!</p>
                 </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {unaddedSongs.map(song => (
                    <div key={song.id} className="flex items-center justify-between p-3 rounded-xl glass hover:bg-white/5 transition-colors border border-transparent">
                      <div>
                        <p className="text-sm font-bold text-zinc-300">{song.title}</p>
                        <p className="text-xs text-zinc-500">{song.artist || "Original"}</p>
                      </div>
                      <button onClick={() => handleAddSong(song.id)} className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors border border-indigo-500/20 hover:border-transparent">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
