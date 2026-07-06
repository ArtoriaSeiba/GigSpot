"use client";

import { useState, useEffect } from "react";
import { Music, Plus, Loader2, X, Music4, Edit2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type Song = {
  id: string;
  title: string;
  artist: string | null;
  key: string | null;
  tempo: number | null;
};

export default function RepertoirePage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [songKey, setSongKey] = useState("");
  const [tempo, setTempo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bandRole, setBandRole] = useState("MUSICIAN");

  const openModal = (song?: Song) => {
    if (song) {
      setEditingSong(song);
      setTitle(song.title);
      setArtist(song.artist || "");
      setSongKey(song.key || "");
      setTempo(song.tempo ? song.tempo.toString() : "");
    } else {
      setEditingSong(null);
      setTitle("");
      setArtist("");
      setSongKey("");
      setTempo("");
    }
    setIsModalOpen(true);
  };

  const fetchSongs = async () => {
    try {
      const roleRes = await fetch("/api/band/role");
      if (roleRes.ok) {
        const { role } = await roleRes.json();
        setBandRole(role);
      }
      
      const res = await fetch("/api/songs");
      const data = await res.json();
      setSongs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = "/api/songs";
      const method = editingSong ? "PUT" : "POST";
      const body = editingSong
        ? JSON.stringify({ id: editingSong.id, title, artist, key: songKey, tempo })
        : JSON.stringify({ title, artist, key: songKey, tempo });

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchSongs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this song from repertoire? It will be removed from all setlists.")) return;
    try {
      const res = await fetch("/api/songs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchSongs();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in relative">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Repertoire</h1>
          <p className="text-zinc-400 text-sm">Manage your master song list and AR tracking data.</p>
        </div>
        {bandRole === "ADMIN" && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-5 h-5" />
            Add Song
          </motion.button>
        )}
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : (
        <div className="glass-card rounded-3xl p-6">
          {songs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-zinc-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                <Music className="w-8 h-8 text-zinc-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Your repertoire is empty</h3>
              <p className="text-zinc-400">Add some songs to start building your master setlist.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                    <th className="pb-4 font-medium pl-2">Title</th>
                    <th className="pb-4 font-medium">Artist</th>
                    <th className="pb-4 font-medium">Key</th>
                    <th className="pb-4 font-medium">Tempo (BPM)</th>
                    <th className="pb-4 font-medium text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  <AnimatePresence>
                    {songs.map((song) => (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        key={song.id} 
                        className="hover:bg-white/5 transition-colors group"
                      >
                        <td className="py-4 pl-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                              <Music4 className="w-4 h-4 text-indigo-400" />
                            </div>
                            <span className="font-bold text-zinc-200">{song.title}</span>
                          </div>
                        </td>
                        <td className="py-4 text-zinc-400">{song.artist || "-"}</td>
                        <td className="py-4 text-zinc-400">
                          {song.key ? <span className="px-2 py-1 rounded bg-zinc-800 text-xs font-mono">{song.key}</span> : "-"}
                        </td>
                        <td className="py-4 text-zinc-400">{song.tempo || "-"}</td>
                        <td className="py-4 text-right pr-2">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/dashboard/rehearse/${song.id}`} className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20">
                              Launch AR
                            </Link>
                            {bandRole === "ADMIN" && (
                              <>
                                <button onClick={() => openModal(song)} className="text-zinc-500 hover:text-indigo-400 p-1"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(song.id)} className="text-zinc-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Song Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-card rounded-3xl w-full max-w-lg p-6 border border-zinc-700/50 shadow-2xl relative"
          >
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">{editingSong ? "Edit Song" : "Add New Song"}</h2>
            
            <form onSubmit={handleAddSong} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Song Title</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="Mr. Brightside" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Original Artist (Optional)</label>
                <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="The Killers" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 ml-1">Key</label>
                  <input type="text" value={songKey} onChange={(e) => setSongKey(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none uppercase" placeholder="Db Major" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 ml-1">Tempo (BPM)</label>
                  <input type="number" value={tempo} onChange={(e) => setTempo(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="148" />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-medium text-sm text-zinc-300 glass hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingSong ? "Update Song" : "Save Song"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
