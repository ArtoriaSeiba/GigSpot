"use client";

import { useState, useEffect } from "react";
import { Briefcase, Plus, Loader2, X, AlertTriangle, ShieldCheck, Edit2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type GearItem = {
  id: string;
  name: string;
  type: string;
  condition: string | null;
  assignedTo: string | null;
};

export default function GearInventoryPage() {
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGear, setEditingGear] = useState<GearItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("Instrument");
  const [condition, setCondition] = useState("Good");
  const [assignedTo, setAssignedTo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bandRole, setBandRole] = useState("MUSICIAN");

  const openModal = (item?: GearItem) => {
    if (item) {
      setEditingGear(item);
      setName(item.name);
      setType(item.type);
      setCondition(item.condition || "Good");
      setAssignedTo(item.assignedTo || "");
    } else {
      setEditingGear(null);
      setName("");
      setType("Instrument");
      setCondition("Good");
      setAssignedTo("");
    }
    setIsModalOpen(true);
  };

  const fetchGear = async () => {
    try {
      const roleRes = await fetch("/api/band/role");
      if (roleRes.ok) {
        const { role } = await roleRes.json();
        setBandRole(role);
      }
      
      const res = await fetch("/api/gear");
      const data = await res.json();
      setGearItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGear();
  }, []);

  const handleAddGear = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = "/api/gear";
      const method = editingGear ? "PUT" : "POST";
      const body = editingGear
        ? JSON.stringify({ id: editingGear.id, name, type, condition, assignedTo })
        : JSON.stringify({ name, type, condition, assignedTo });

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchGear();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this gear item?")) return;
    try {
      const res = await fetch("/api/gear", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchGear();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in relative">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gear Inventory</h1>
          <p className="text-zinc-400 text-sm">Keep track of all band equipment, instruments, and PA gear.</p>
        </div>
        {bandRole === "ADMIN" && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </motion.button>
        )}
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
      ) : (
        <div className="glass-card rounded-3xl p-6">
          {gearItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-zinc-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                <Briefcase className="w-8 h-8 text-zinc-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No gear logged yet</h3>
              <p className="text-zinc-400">Add instruments, cables, and PA equipment to manage who holds what.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {gearItems.map((item) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={item.id} 
                    className="glass p-5 rounded-2xl border border-zinc-800/50 hover:border-amber-500/30 transition-colors group relative"
                  >
                    {bandRole === "ADMIN" && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(item)} className="p-1.5 rounded-lg bg-zinc-900/80 text-zinc-400 hover:text-indigo-400"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg bg-zinc-900/80 text-zinc-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-3 pr-14">
                      <h3 className="text-lg font-bold text-zinc-100 line-clamp-1">{item.name}</h3>
                    </div>
                    <div className="mb-4">
                      <span className="px-2.5 py-1 rounded bg-zinc-900/80 text-xs font-semibold text-zinc-400 border border-zinc-800">
                        {item.type}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mt-4 text-sm border-t border-zinc-800/50 pt-3">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="flex items-center gap-2">
                          {item.condition === "Needs Repair" ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                          Condition
                        </span>
                        <span className={item.condition === "Needs Repair" ? "text-red-400 font-medium" : "text-emerald-400 font-medium"}>
                          {item.condition}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Assigned to</span>
                        <span className="text-zinc-200 font-medium">{item.assignedTo || "Unassigned"}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Add Gear Modal */}
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
            <h2 className="text-2xl font-bold text-white mb-6">{editingGear ? "Edit Gear" : "Log New Gear"}</h2>
            
            <form onSubmit={handleAddGear} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Item Name / Model</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="Fender Stratocaster" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 ml-1">Category</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none [color-scheme:dark]">
                    <option value="Instrument">Instrument</option>
                    <option value="PA System">PA System</option>
                    <option value="Cables/Misc">Cables/Misc</option>
                    <option value="Lighting">Lighting</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 ml-1">Condition</label>
                  <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none [color-scheme:dark]">
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Needs Repair">Needs Repair</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Assigned Member (Optional)</label>
                <input type="text" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="Band Member Name" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-medium text-sm text-zinc-300 glass hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-xl font-medium text-sm text-white bg-amber-600 hover:bg-amber-500 transition-colors flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingGear ? "Update Gear" : "Save Gear"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
