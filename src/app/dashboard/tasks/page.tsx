"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, X, CheckSquare, Clock, ArrowRight, Trash2, Edit2, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type Task = {
  id: string;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  assignedTo: string | null;
  dueDate: string | null;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [bandRole, setBandRole] = useState("MUSICIAN");
  const [error, setError] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTitle(task.title);
      setAssignedTo(task.assignedTo || "");
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "");
    } else {
      setEditingTask(null);
      setTitle("");
      setAssignedTo("");
      setDueDate("");
    }
    setError("");
    setIsModalOpen(true);
  };

  const [members, setMembers] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>("");

  const fetchTasks = async () => {
    try {
      const [roleRes, membersRes, tasksRes] = await Promise.all([
        fetch("/api/band/role"),
        fetch("/api/band/members"),
        fetch("/api/tasks")
      ]);

      if (roleRes.ok) {
        const { role, userId } = await roleRes.json();
        setBandRole(role);
        setUserId(userId);
      }
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const url = "/api/tasks";
      const method = editingTask ? "PUT" : "POST";
      const body = editingTask 
        ? JSON.stringify({ taskId: editingTask.id, title, assignedTo, dueDate })
        : JSON.stringify({ title, assignedTo, dueDate });

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok) {
        toast.success(editingTask ? "Task updated!" : "Task created!");
        setIsModalOpen(false);
        fetchTasks();
      } else {
        const data = await res.json();
        toast.error(data.error || "An error occurred");
        setError(data.error || "An error occurred");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit. Check your connection.");
      setError("Failed to submit. Check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId })
      });
      if (res.ok) {
        toast.success("Task deleted");
        fetchTasks();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete task");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error");
    }
  };

  const updateStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      });
      if (res.ok) {
        toast.success("Task status updated");
        fetchTasks();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update status");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error");
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  // Sort tasks by due date (closest first), nulls at the end
  const sortTasks = (a: Task, b: Task) => {
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  };

  const pendingTasks = tasks.filter(t => t.status === "PENDING").sort(sortTasks);
  const inProgressTasks = tasks.filter(t => t.status === "IN_PROGRESS").sort(sortTasks);
  const completedTasks = tasks.filter(t => t.status === "COMPLETED").sort(sortTasks);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Task Board</h1>
          <p className="text-zinc-400 text-sm max-w-xl">
            Delegate responsibilities and track progress. You can use this board for <strong>anything</strong>: next practice prep, gig logistics, gear maintenance, or social media tasks.
          </p>
        </div>
        {bandRole === "ADMIN" && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openModal()}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-5 h-5" />
            New Task
          </motion.button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Pending Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-zinc-400" />
              Pending
            </h2>
            <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-1 rounded-full">{pendingTasks.length}</span>
          </div>
          <AnimatePresence>
            {pendingTasks.map(task => (
              <motion.div 
                layout 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={task.id} 
                className="glass-card rounded-2xl p-4 border-l-4 border-zinc-500 group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white flex-1">{task.title}</h3>
                  {bandRole === "ADMIN" && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); openModal(task); }} className="text-zinc-500 hover:text-indigo-400"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} className="text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 mb-4">
                  {task.assignedTo && (
                    <p className="text-xs text-zinc-400 line-clamp-1">
                      Assigned: {task.assignedTo.split(',').map(id => {
                        const m = members.find((mem: any) => mem.userId === id.trim());
                        return m ? (m.user?.name || m.user?.email || "Unknown") : "Unknown";
                      }).join(', ')}
                    </p>
                  )}
                  {task.dueDate && <p className="text-xs text-indigo-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Due: {new Date(task.dueDate).toLocaleDateString()}</p>}
                </div>
                {(bandRole === "ADMIN" || (task.assignedTo && task.assignedTo.split(',').map((i: string) => i.trim()).includes(userId))) && (
                  <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => updateStatus(task.id, "IN_PROGRESS")} className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                      Start <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* In Progress Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-cyan-400" />
              In Progress
            </h2>
            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs px-2 py-1 rounded-full">{inProgressTasks.length}</span>
          </div>
          <AnimatePresence>
            {inProgressTasks.map(task => (
              <motion.div 
                layout 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={task.id} 
                className="glass-card rounded-2xl p-4 border-l-4 border-cyan-500 group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white flex-1">{task.title}</h3>
                  {bandRole === "ADMIN" && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); openModal(task); }} className="text-cyan-600 hover:text-cyan-400"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} className="text-cyan-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 mb-4">
                  {task.assignedTo && (
                    <p className="text-xs text-cyan-200/50 line-clamp-1">
                      Assigned: {task.assignedTo.split(',').map(id => {
                        const m = members.find((mem: any) => mem.userId === id.trim());
                        return m ? (m.user?.name || m.user?.email || "Unknown") : "Unknown";
                      }).join(', ')}
                    </p>
                  )}
                  {task.dueDate && <p className="text-xs text-cyan-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Due: {new Date(task.dueDate).toLocaleDateString()}</p>}
                </div>
                {(bandRole === "ADMIN" || (task.assignedTo && task.assignedTo.split(',').map((i: string) => i.trim()).includes(userId))) && (
                  <div className="flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => updateStatus(task.id, "PENDING")} className="text-xs font-medium text-zinc-400 hover:text-zinc-300">
                      Undo
                    </button>
                    <button onClick={() => updateStatus(task.id, "COMPLETED")} className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                      Complete <CheckSquare className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Completed Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
              Completed
            </h2>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2 py-1 rounded-full">{completedTasks.length}</span>
          </div>
          <AnimatePresence>
            {completedTasks.map(task => (
              <motion.div 
                layout 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={task.id} 
                className="glass-card rounded-2xl p-4 border-l-4 border-emerald-500 opacity-60 group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white line-through flex-1">{task.title}</h3>
                  {bandRole === "ADMIN" && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); openModal(task); }} className="text-emerald-600 hover:text-emerald-400"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} className="text-emerald-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 mb-4">
                  {task.assignedTo && (
                    <p className="text-xs text-emerald-200/50 line-through line-clamp-1">
                      Assigned: {task.assignedTo.split(',').map(id => {
                        const m = members.find((mem: any) => mem.userId === id);
                        return m ? (m.user?.name || m.user?.email || "Unknown") : "Unknown";
                      }).join(', ')}
                    </p>
                  )}
                </div>
                {(bandRole === "ADMIN" || (task.assignedTo && task.assignedTo.split(',').includes(userId))) && (
                  <div className="flex justify-start opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => updateStatus(task.id, "IN_PROGRESS")} className="text-xs font-medium text-zinc-400 hover:text-zinc-300">
                      Undo
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

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
            <h2 className="text-2xl font-bold text-white mb-6">{editingTask ? "Edit Task" : "Create Task"}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Task Title</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="e.g. Book the van for Saturday" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-medium text-zinc-300 ml-1">Assign To (Optional)</label>
                  <div className="flex-1 glass-input rounded-xl p-2 max-h-32 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                    {members.length === 0 && <span className="text-xs text-zinc-500 p-1">No members found</span>}
                    {members.map((m: any) => (
                      <label key={m.userId} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-zinc-800/50 transition-colors group">
                        <input 
                          type="checkbox" 
                          checked={assignedTo.split(',').includes(m.userId)}
                          onChange={(e) => {
                            const current = assignedTo ? assignedTo.split(',') : [];
                            if (e.target.checked) {
                               setAssignedTo([...current, m.userId].join(','));
                            } else {
                               setAssignedTo(current.filter(id => id !== m.userId).join(','));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
                        />
                        <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">{m.user?.name || m.user?.email || "Unknown"}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 ml-1">Due Date</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none [color-scheme:dark]" />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-medium text-sm text-zinc-300 glass hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingTask ? "Update Task" : "Save Task")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
