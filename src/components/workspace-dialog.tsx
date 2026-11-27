"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function WorkspaceDialog({ title, busy, onDismiss, children, wide = false }: {
  title: string;
  busy: boolean;
  onDismiss: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  function dismiss() {
    if (busy) return;
    ref.current?.close();
    onDismiss();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      className={`workspace-panel fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto text-zinc-100 shadow-2xl backdrop:bg-black/70 ${wide ? "max-w-3xl" : "max-w-lg"}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-xl font-semibold">{title}</h2>
        <button type="button" aria-label="Close Dialog" className="workspace-icon-button" disabled={busy} onClick={dismiss}>
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
