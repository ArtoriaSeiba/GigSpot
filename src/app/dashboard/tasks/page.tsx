"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Calendar, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { workspaceErrorMessage, workspaceMutation, workspaceRequest, type BandRole } from "@/lib/workspace-requests";
import { taskAssigneeIds } from "@/lib/utils";

const statuses = [
  { id: "PENDING", label: "Pending", color: "text-zinc-300" },
  { id: "IN_PROGRESS", label: "In Progress", color: "text-cyan-300" },
  { id: "COMPLETED", label: "Completed", color: "text-emerald-300" },
] as const;

type Status = (typeof statuses)[number]["id"];
type Task = { id: string; title: string; status: Status; assignedTo: string | null; dueDate: string | null };
type Member = { userId: string; user: { name: string | null; email: string | null } };
type Board =
  | { status: "loading" | "error" | "no-band" }
  | { status: "ready"; tasks: Task[]; members: Member[]; band: BandRole };

const transitions: Record<Status, { to: Status; label: string }[]> = {
  PENDING: [{ to: "IN_PROGRESS", label: "Start" }],
  IN_PROGRESS: [{ to: "PENDING", label: "Move To Pending" }, { to: "COMPLETED", label: "Complete" }],
  COMPLETED: [{ to: "IN_PROGRESS", label: "Reopen" }],
};

const dueDateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" });

export default function TasksPage() {
  const [board, setBoard] = useState<Board>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [mobileStatus, setMobileStatus] = useState<Status>("PENDING");
  const [editing, setEditing] = useState<Task | null>();
  const [deleting, setDeleting] = useState<Task>();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [updating, setUpdating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };

    async function load() {
      try {
        const band = await workspaceRequest<BandRole>("/api/band/role", "Could not load your band.", options);
        if (!band.bandId) {
          if (!controller.signal.aborted) setBoard({ status: "no-band" });
          return;
        }
        const [tasks, roster] = await Promise.all([
          workspaceRequest<Task[]>("/api/tasks", "Could not load tasks.", options),
          workspaceRequest<{ members: Member[] }>("/api/band/members", "Could not load band members.", options),
        ]);
        if (!controller.signal.aborted) setBoard({ status: "ready", tasks, members: roster.members, band });
      } catch {
        if (!controller.signal.aborted) setBoard({ status: "error" });
      }
    }

    void load();
    return () => controller.abort();
  }, [attempt]);

  const tasks = board.status === "ready" ? board.tasks : [];
  const members = board.status === "ready" ? board.members : [];
  const userId = board.status === "ready" ? board.band.userId : undefined;
  const isAdmin = board.status === "ready" && board.band.role === "ADMIN";
  const filtered = tasks.filter((task) => !myTasksOnly || taskAssigneeIds(task.assignedTo).includes(userId ?? ""));
  const memberNames = new Map(members.map((member) => [member.userId, member.user.name || member.user.email || "Unnamed member"]));
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function openEditor(task: Task | null) {
    setFormError("");
    setEditing(task);
  }

  function recordTask(task: Task) {
    setBoard((current) => current.status === "ready" ? {
      ...current,
      tasks: [...current.tasks.filter((item) => item.id !== task.id), task],
    } : current);
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    const values = new FormData(event.currentTarget);
    const title = String(values.get("title") ?? "").trim();
    if (!title) {
      setFormError("Enter a task title.");
      return;
    }
    setIsSaving(true);
    setFormError("");
    try {
      const formerAssignees = taskAssigneeIds(editing?.assignedTo).filter((id) => !memberNames.has(id));
      const task = await workspaceMutation<Task>("/api/tasks", editing ? "PUT" : "POST", {
        ...(editing && { taskId: editing.id }),
        title,
        assignedTo: [...values.getAll("assignee"), ...formerAssignees].join(","),
        dueDate: String(values.get("dueDate") ?? ""),
      }, "Could not save the task. Please try again.");
      recordTask(task);
      setMobileStatus(task.status);
      setEditing(undefined);
      toast.success(editing ? "Task updated." : "Task created.");
    } catch (error) {
      const message = workspaceErrorMessage(error, "Could not save the task. Please try again.");
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTask(task: Task) {
    if (isSaving) return;
    setIsSaving(true);
    setFormError("");
    try {
      await workspaceMutation("/api/tasks", "DELETE", { taskId: task.id }, "Could not delete the task.");
      setBoard((current) => current.status === "ready" ? {
        ...current,
        tasks: current.tasks.filter((item) => item.id !== task.id),
      } : current);
      setDeleting(undefined);
      toast.success("Task deleted.");
    } catch (error) {
      const message = workspaceErrorMessage(error, "Could not delete the task. Please try again.");
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(task: Task, status: Status) {
    if (updating[task.id]) return;
    setUpdating((current) => ({ ...current, [task.id]: true }));
    try {
      recordTask(await workspaceMutation<Task>("/api/tasks", "PATCH", { taskId: task.id, status }, "Could not update task status."));
      toast.success(`Moved to ${statuses.find((column) => column.id === status)?.label.toLowerCase()}.`);
    } catch (error) {
      toast.error(workspaceErrorMessage(error, "Could not update task status. Please try again."));
    } finally {
      setUpdating((current) => ({ ...current, [task.id]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <header className="workspace-header">
        <div><h1>Tasks</h1><p>Track what needs doing for rehearsals and gigs.</p></div>
        {isAdmin && <button type="button" className="workspace-primary shrink-0" onClick={() => openEditor(null)}><Plus aria-hidden="true" className="size-5" /> New Task</button>}
      </header>

      {board.status !== "ready" ? (
        <section className="workspace-panel space-y-3" aria-label="Task Board Status">
          {board.status === "loading" && <p role="status" className="text-sm text-zinc-400">Loading Tasks…</p>}
          {board.status === "error" && (
            <>
              <p role="alert">Could not load your tasks.</p>
              <button type="button" className="workspace-secondary" onClick={() => {
                setBoard({ status: "loading" });
                setAttempt((value) => value + 1);
              }}>Try Again</button>
            </>
          )}
          {board.status === "no-band" && (
            <>
              <p>Join or create a band to use the task board.</p>
              <Link href="/dashboard" className="workspace-secondary">Go To Dashboard</Link>
            </>
          )}
        </section>
      ) : (
        <>
          {userId && (tasks.length > 0 || myTasksOnly) && (
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 workspace-secondary rounded-xl px-3 text-sm font-medium">
              <input type="checkbox" checked={myTasksOnly} onChange={(event) => setMyTasksOnly(event.target.checked)} className="size-4 accent-indigo-500" />
              Assigned To Me
            </label>
          )}
          {filtered.length === 0 ? (
            <section className="workspace-panel space-y-2" aria-label="Empty Task Board">
              <h2 className="text-lg font-semibold">{myTasksOnly ? "No Tasks Assigned To You" : "No Tasks Yet"}</h2>
              <p className="text-sm text-zinc-400">{myTasksOnly ? "Turn off the filter to see the whole board." : isAdmin ? "Create a task to start organizing your band’s work." : "Tasks will appear here when a band admin adds them."}</p>
            </section>
          ) : (
            <>
              <fieldset className="grid grid-cols-3 gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1 lg:hidden">
                <legend className="sr-only">Task Status</legend>
                {statuses.map(({ id, label }) => (
                  <label key={id} className="relative grid min-h-11 cursor-pointer place-items-center rounded-lg px-1 text-center text-xs font-medium text-zinc-300 has-checked:bg-indigo-500/20 has-checked:text-indigo-100 has-focus-visible:outline-2 has-focus-visible:outline-indigo-300 sm:text-sm">
                    <input type="radio" name="task-status" value={id} checked={mobileStatus === id} onChange={() => setMobileStatus(id)} className="sr-only" />
                    {label}
                  </label>
                ))}
              </fieldset>
              <div className="grid gap-4 lg:grid-cols-3">
                {statuses.map(({ id, label, color }) => {
                  const column = filtered.filter((task) => task.status === id)
                    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.title.localeCompare(b.title));
                  return (
                    <section key={id} aria-labelledby={`tasks-${id}`} className={`workspace-panel ${mobileStatus === id ? "block" : "hidden lg:block"}`}>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h2 id={`tasks-${id}`} className={`font-semibold ${color}`}>{label}</h2>
                        <span className="rounded-lg bg-zinc-800 px-2 py-1 text-xs tabular-nums text-zinc-300">{column.length}</span>
                      </div>
                      {column.length === 0 && <p className="py-3 text-sm text-zinc-400">No tasks in this status.</p>}
                      <ul className="space-y-3">
                        {column.map((task) => {
                          const ids = taskAssigneeIds(task.assignedTo);
                          const canUpdate = isAdmin || ids.includes(userId ?? "");
                          const dueKey = task.dueDate?.slice(0, 10);
                          const dueLabel = id !== "COMPLETED" && dueKey && dueKey < todayKey ? "Overdue" : id !== "COMPLETED" && dueKey === todayKey ? "Due Today" : "Due";
                          return (
                            <li key={task.id} className="workspace-row space-y-2 rounded-xl border p-3" aria-busy={updating[task.id] || undefined}>
                              <h3 className="break-words font-medium">{task.title}</h3>
                              <p className="break-words text-sm text-zinc-400">{ids.length ? ids.map((id) => memberNames.get(id) ?? "Former or unknown member").join(", ") : "Unassigned"}</p>
                              {dueKey && (
                                <p className={`flex items-start gap-1.5 text-xs ${dueLabel === "Overdue" ? "text-red-300" : dueLabel === "Due Today" ? "text-amber-300" : "text-zinc-400"}`}>
                                  <Calendar aria-hidden="true" className="size-4 shrink-0" />
                                  <span>{dueLabel} · <time dateTime={dueKey}>{dueDateFormat.format(new Date(dueKey))}</time></span>
                                </p>
                              )}
                              {(canUpdate || isAdmin) && (
                                <div className="flex flex-wrap items-center gap-1 border-t border-zinc-800 pt-2">
                                  {canUpdate && transitions[id].map(({ to, label }) => (
                                    <button key={to} type="button" disabled={updating[task.id]} onClick={() => void updateStatus(task, to)} className="workspace-secondary px-2 text-xs">{updating[task.id] ? "Moving…" : label}</button>
                                  ))}
                                  {isAdmin && (
                                    <>
                                      <button type="button" disabled={updating[task.id]} aria-label={`Edit ${task.title}`} className="workspace-icon-button" onClick={() => openEditor(task)}><Pencil aria-hidden="true" className="size-4" /></button>
                                      <button type="button" disabled={updating[task.id]} aria-label={`Delete ${task.title}`} className="workspace-icon-button hover:text-red-300" onClick={() => {
                                        setFormError("");
                                        setDeleting(task);
                                      }}><Trash2 aria-hidden="true" className="size-4" /></button>
                                    </>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {editing !== undefined && (
        <WorkspaceDialog title={editing ? "Edit Task" : "New Task"} busy={isSaving} onDismiss={() => setEditing(undefined)}>
          <form onSubmit={saveTask} className="space-y-4">
            <fieldset disabled={isSaving} className="space-y-3">
              <label className="block space-y-1 text-sm font-medium"><span>Task Title</span><input name="title" required defaultValue={editing?.title} className="workspace-input" /></label>
              <label className="block space-y-1 text-sm font-medium"><span>Due Date (Optional)</span><input name="dueDate" type="date" defaultValue={editing?.dueDate?.slice(0, 10) ?? ""} className="workspace-input" /></label>
              <fieldset className="rounded-lg border border-zinc-700 p-2">
                <legend className="px-1 text-sm font-medium">Assign To (Optional)</legend>
                <div className="max-h-44 overflow-y-auto">
                  {members.length === 0 && <p className="p-2 text-sm text-zinc-400">No band members available.</p>}
                  {members.map((member) => (
                    <label key={member.userId} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-white/5">
                      <input name="assignee" type="checkbox" value={member.userId} defaultChecked={taskAssigneeIds(editing?.assignedTo).includes(member.userId)} className="size-4 shrink-0 accent-indigo-500" />
                      <span className="break-all">{memberNames.get(member.userId)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </fieldset>
            {formError && <p role="alert" className="text-sm text-red-300">{formError}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="workspace-secondary" disabled={isSaving} onClick={() => setEditing(undefined)}>Cancel</button>
              <button type="submit" className="workspace-primary" disabled={isSaving}>{isSaving ? "Saving…" : "Save Task"}</button>
            </div>
          </form>
        </WorkspaceDialog>
      )}

      {deleting && (
        <WorkspaceDialog title="Delete Task?" busy={isSaving} onDismiss={() => setDeleting(undefined)}>
          <p className="text-sm text-zinc-300">Remove <strong>{deleting.title}</strong> from the task board?</p>
          {formError && <p role="alert" className="mt-3 text-sm text-red-300">{formError}</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" className="workspace-secondary" disabled={isSaving} onClick={() => setDeleting(undefined)}>Cancel</button>
            <button type="button" className="workspace-danger" disabled={isSaving} onClick={() => void deleteTask(deleting)}>{isSaving ? "Deleting…" : "Delete Task"}</button>
          </div>
        </WorkspaceDialog>
      )}
    </div>
  );
}
