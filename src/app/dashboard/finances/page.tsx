"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, X, ArrowUpRight, ArrowDownRight, Wallet, Edit2, Trash2, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";
import { readGigPayment } from "@/lib/gig-payment-description";
import { workspaceErrorMessage, workspaceMutation, workspaceRequest, type BandRole } from "@/lib/workspace-requests";
import { WorkspaceFilter } from "@/components/workspace-filter";

type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  date: string;
};

function localDateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function formatFilterDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

type DateRange = { from: string; to: string };

function TransactionDateFilter({ range, onApply, dismiss }: {
  range: DateRange;
  onApply: (range: DateRange) => void;
  dismiss: () => void;
}) {
  const [draft, setDraft] = useState(range);
  const invalid = Boolean(draft.from && draft.to && draft.from > draft.to);

  function apply(value: DateRange) {
    onApply(value);
    dismiss();
  }

  return (
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault();
      if (!invalid) apply(draft);
    }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1.5 text-sm font-medium">From
          <input className="workspace-input [color-scheme:dark]" type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-medium">To
          <input className="workspace-input [color-scheme:dark]" type="date" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} />
        </label>
      </div>
      {invalid && <p role="alert" className="text-sm text-red-300">The end date must be on or after the start date.</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-(--gig-stroke) pt-4">
        <button type="button" className="workspace-secondary" disabled={!range.from && !range.to && !draft.from && !draft.to} onClick={() => apply({ from: "", to: "" })}>Clear Dates</button>
        <button type="submit" className="workspace-primary w-auto" disabled={invalid}>Apply Dates</button>
      </div>
    </form>
  );
}

export default function FinancesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [bandRole, setBandRole] = useState("MUSICIAN");
  const [range, setRange] = useState<DateRange>({ from: "", to: "" });
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Form State
  const [type, setType] = useState("INCOME");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openModal = (tx?: Transaction) => {
    setSaveError("");
    if (tx) {
      setEditingTx(tx);
      setType(readGigPayment(tx.description) ? "INCOME" : tx.type);
      setAmount(tx.amount.toString());
      setDescription(readGigPayment(tx.description)?.description ?? tx.description);
    } else {
      setEditingTx(null);
      setType("INCOME");
      setAmount("");
      setDescription("");
    }
    setIsModalOpen(true);
  };

  const fetchData = (signal?: AbortSignal) =>
    Promise.all([
      workspaceRequest<BandRole>("/api/band/role", "Could not load your band.", { signal }),
      workspaceRequest<Transaction[]>("/api/finances", "Could not load transactions.", { signal }),
    ]).then(([{ role }, data]) => {
      if (!signal?.aborted) {
        setBandRole(role);
        setTransactions(data);
        setLoadError(false);
      }
    }).catch(() => {
      if (!signal?.aborted) setLoadError(true);
    }).finally(() => {
      if (!signal?.aborted) setIsLoading(false);
    });

  useEffect(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);
    return () => controller.abort();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSaveError("");
    try {
      await workspaceMutation("/api/finances", editingTx ? "PUT" : "POST", {
        ...(editingTx && { id: editingTx.id }), type, amount, description,
      }, "Could not save the transaction.");
      setIsModalOpen(false);
      toast.success("Transaction saved.");
      void fetchData();
    } catch (error) {
      setSaveError(workspaceErrorMessage(error, "Could not save the transaction."));
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

  const { from, to } = range;
  const hasRange = Boolean(from || to);
  const rangeLabel = from && to ? `${formatFilterDate(from)} – ${formatFilterDate(to)}`
    : from ? `From ${formatFilterDate(from)}` : to ? `Through ${formatFilterDate(to)}` : "All Dates";
  const visibleTransactions = transactions.filter((tx) => {
    const date = localDateKey(new Date(tx.date));
    return (!from || date >= from) && (!to || date <= to);
  });
  const totalIncome = visibleTransactions.filter(t => t.type === "INCOME").reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = visibleTransactions.filter(t => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;
  const editingPayment = editingTx && readGigPayment(editingTx.description);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse relative">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between items-start gap-4">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-zinc-800/50 rounded-lg"></div>
            <div className="hidden lg:block h-4 w-64 bg-zinc-800/50 rounded"></div>
          </div>
          <div className="h-10 w-full lg:w-40 bg-zinc-800/50 rounded-xl"></div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 rounded-3xl border border-zinc-800/50 bg-zinc-900/20">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-24 bg-zinc-800/50 rounded"></div>
                <div className="w-8 h-8 rounded-full bg-zinc-800/50"></div>
              </div>
              <div className="h-8 w-32 bg-zinc-800/50 rounded-lg"></div>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-3xl p-6 border border-zinc-800/50 bg-zinc-900/20">
          <div className="h-6 w-48 bg-zinc-800/50 rounded-lg mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl bg-zinc-800/30 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-800/50 shrink-0"></div>
                  <div className="space-y-2">
                    <div className="h-5 w-48 bg-zinc-800/50 rounded"></div>
                    <div className="h-4 w-24 bg-zinc-800/30 rounded"></div>
                  </div>
                </div>
                <div className="h-6 w-20 bg-zinc-800/50 rounded pl-14 md:pl-0"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in relative">
      <header className="workspace-header">
        <div>
          <h1>Finances</h1>
          <p>Track payouts, expenses, and manage the band fund.</p>
        </div>
        {bandRole === "ADMIN" && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openModal()}
            className="workspace-primary"
          >
            <Plus className="w-5 h-5" />
            New Transaction
          </motion.button>
        )}
      </header>

      {loadError && (
        <section className="workspace-panel space-y-3" aria-label="Transaction Loading Error">
          <p role="alert">Could not load transactions.</p>
          <button type="button" className="workspace-secondary" onClick={() => {
            setIsLoading(true);
            void fetchData();
          }}>Try Again</button>
        </section>
      )}

      {!loadError && <>
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <WorkspaceFilter title="Filter By Date Range" value={rangeLabel} active={hasRange}>
            {(dismiss) => <TransactionDateFilter range={range} onApply={setRange} dismiss={dismiss} />}
          </WorkspaceFilter>
        </div>
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
          <h2 className="text-xl font-bold text-white mb-6">Transactions</h2>
          <div className="workspace-nav space-y-3 max-h-[500px] overflow-y-auto" role="region" aria-label="Transactions" tabIndex={0}>
            {visibleTransactions.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">{hasRange ? "No transactions in this date range." : "No transactions recorded yet."}</p>
              </div>
            ) : (
              <AnimatePresence>
                {visibleTransactions.map((tx, i) => {
                  const payment = readGigPayment(tx.description);
                  const title = payment?.title ?? tx.description;
                  return (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.035 * Math.min(i, 5) }}
                      key={tx.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl bg-black/20 hover:bg-black/40 transition-colors border border-zinc-800 group gap-4"
                    >
                      <div className="flex items-start md:items-center gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1 md:mt-0 ${tx.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {tx.type === 'INCOME' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          {payment ? (
                            <Link href={`/dashboard/gigs/${encodeURIComponent(payment.gigId)}`} className="break-words font-medium text-violet-200 hover:underline">{title}</Link>
                          ) : <p className="break-words font-medium text-zinc-200">{title}</p>}
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                            {payment && <span className="rounded-md bg-violet-400/15 px-2 py-0.5 font-medium text-violet-200">Gig Payment</span>}
                            <time dateTime={tx.date}>{new Date(tx.date).toLocaleDateString(undefined, { dateStyle: "medium" })}</time>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end shrink-0 w-full md:w-auto pl-14 md:pl-0 mt-3 md:mt-0">
                        <p className={`font-bold ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.type === 'INCOME' ? '+' : '-'}${tx.amount.toFixed(2)}
                        </p>
                        {bandRole === "ADMIN" && (
                          <div className="transition-opacity flex items-center gap-2 md:border-l md:border-zinc-800 md:pl-4 md:ml-4">
                            <button aria-label={`Edit ${title}`} onClick={() => openModal(tx)} className="workspace-icon-button"><Edit2 className="size-4" /></button>
                            <button aria-label={`Delete ${title}`} onClick={() => handleDelete(tx.id)} className="workspace-icon-button hover:text-red-300"><Trash2 className="size-4" /></button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </>}

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
              {editingPayment ? <p className="text-sm text-violet-200">Gig Payment · Income</p> : <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setType('INCOME')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${type === 'INCOME' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'glass text-zinc-400'}`}>Income</button>
                  <button type="button" onClick={() => setType('EXPENSE')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${type === 'EXPENSE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'glass text-zinc-400'}`}>Expense</button>
                </div>
              </div>}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Amount ($)</label>
                <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="0.00" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Description</label>
                <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="e.g. Gig payout - The Roxy" />
              </div>

              {saveError && <p role="alert" className="text-sm text-red-300">{saveError}</p>}
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
