"use client";

import { useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { WorkspaceDialog } from "@/components/workspace-dialog";

export function WorkspaceFilter({ title, value, active, children }: {
  title: string;
  value: string;
  active: boolean;
  children: (dismiss: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dismiss = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className="workspace-secondary min-w-0 max-w-full gap-2 px-3 text-left data-[active=true]:border-violet-400/45 data-[active=true]:bg-violet-400/15 data-[active=true]:text-violet-100"
        data-active={active}
        aria-label={`${title}, ${value}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-violet-200" />
        <span className="min-w-0 wrap-break-word">{value}</span>
        <ChevronDown aria-hidden="true" className="ml-1 size-4 shrink-0 text-zinc-400" />
      </button>
      {open && <WorkspaceDialog title={title} busy={false} onDismiss={dismiss}>{children(dismiss)}</WorkspaceDialog>}
    </>
  );
}
