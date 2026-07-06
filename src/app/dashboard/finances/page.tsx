"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, X, ArrowUpRight, ArrowDownRight, Wallet, Edit2, Trash2, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  date: string;
};

export default function FinancesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [bandRole, setBandRole] = useState("MUSICIAN");

  // Form State
  const [type, setType] = useState("INCOME");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openModal = (tx?: Transaction) => {
    if (tx) {
      setEditingTx(tx);
      setType(tx.type);
      setAmount(tx.amount.toString());
      setDescription(tx.description);
    } else {
      setEditingTx(null);
      setType("INCOME");
      setAmount("");
      setDescription("");
    }
    setIsModalOpen(true);
  };

  const fetchData = async () => {
    try {
      const roleRes = await fetch("/api/band/role");
      if (roleRes.ok) {
        const { role } = await roleRes.json();
        setBandRole(role);
      }
      
      const res = await fetch("/api/finances");
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = "/api/finances";
      const method = editingTx ? "PUT" : "POST";
      const body = editingTx
        ? JSON.stringify({ id: editingTx.id, type, amount, description })
        : JSON.stringify({ type, amount, description });

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    try {
      const res = await fetch("/api/finances", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in relative">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Finances</h1>
          <p className="hidden lg:block text-zinc-400 text-sm">Track payouts, expenses, and manage the band fund.</p>
        </div>
        {bandRole === "ADMIN" && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openModal()}
            className="w-full lg:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-5 h-5" />
            New Transaction
          </motion.button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Total Income</h3>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">${totalIncome.toFixed(2)}</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Total Expenses</h3>
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">${totalExpenses.toFixed(2)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Net Balance</h3>
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-indigo-500" />
            </div>
          </div>
          <p className={`text-3xl font-extrabold ${netBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            ${netBalance.toFixed(2)}
          </p>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-3xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Recent Transactions</h2>
        <div className="space-y-4 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No transactions recorded yet.</p>
            </div>
          ) : (
            <AnimatePresence>
              {transactions.map((tx, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                  key={tx.id} 
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl bg-black/20 hover:bg-black/40 transition-colors border border-zinc-800 group gap-4"
                >
                  <div className="flex items-start md:items-center gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1 md:mt-0 ${tx.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {tx.type === 'INCOME' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-200 line-clamp-2">{tx.description}</p>
                      <p className="text-xs text-zinc-500">{new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:justify-end shrink-0 w-full md:w-auto pl-14 md:pl-0 mt-3 md:mt-0">
                    <p className={`font-bold ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </p>
                    {bandRole === "ADMIN" && (
                      <div className="transition-opacity flex items-center gap-2 md:border-l md:border-zinc-800 md:pl-4 md:ml-4">
                        <button onClick={() => openModal(tx)} className="p-2 md:p-0 bg-zinc-800/50 md:bg-transparent rounded-lg text-zinc-400 hover:text-indigo-400"><Edit2 className="w-4 h-4 md:w-4 md:h-4" /></button>
                        <button onClick={() => handleDelete(tx.id)} className="p-2 md:p-0 bg-zinc-800/50 md:bg-transparent rounded-lg text-zinc-400 hover:text-red-400"><Trash2 className="w-4 h-4 md:w-4 md:h-4" /></button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-card rounded-3xl w-full max-w-md p-6 border border-zinc-700/50 shadow-2xl relative"
          >
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">{editingTx ? "Edit Transaction" : "Record Transaction"}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setType('INCOME')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${type === 'INCOME' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'glass text-zinc-400'}`}>Income</button>
                  <button type="button" onClick={() => setType('EXPENSE')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${type === 'EXPENSE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'glass text-zinc-400'}`}>Expense</button>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Amount ($)</label>
                <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="0.00" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Description</label>
                <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="e.g. Gig Payout - The Roxy" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-medium text-sm text-zinc-300 glass hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-xl font-medium text-sm text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingTx ? "Update" : "Save")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
