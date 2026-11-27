"use client";

import { useEffect, useRef, useState } from "react";
import { bandRoleLabel } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { GigSpotBrand } from "@/components/gigspot-brand";
import { BandSwitcher } from "@/components/band-switcher";
import { DashboardNav } from "@/components/dashboard-nav";
import { LogoutButton } from "@/components/logout-button";

interface MobileSidebarProps {
  user: { name?: string | null };
  bandRole: string;
  activeBandId: string | null;
}

export function MobileSidebar({ user, bandRole, activeBandId }: MobileSidebarProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 80rem)");
    const closeOnDesktop = () => {
      if (desktop.matches) dialog.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <div className="workspace-rail relative z-40 flex shrink-0 items-center gap-2 border-b px-3 py-2 xl:hidden">
      <GigSpotBrand href="/dashboard" className="gap-1.5 text-base" />
      <div className="ml-auto min-w-0 max-w-60 flex-1">
        <BandSwitcher activeBandId={activeBandId} />
      </div>
      <button
        type="button"
        onClick={() => {
          dialog.current?.showModal();
          setIsOpen(true);
        }}
        aria-label="Open Dashboard Menu"
        aria-expanded={isOpen}
        aria-controls="mobile-dashboard-menu"
        className="grid size-11 shrink-0 place-items-center rounded-lg text-zinc-300 hover:bg-white/5 hover:text-white"
      >
        <Menu aria-hidden="true" className="size-6" />
      </button>

      <dialog
        id="mobile-dashboard-menu"
        ref={dialog}
        onClose={() => setIsOpen(false)}
        aria-labelledby="mobile-dashboard-menu-title"
        className="workspace-rail fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(20rem,100vw)] max-w-none border-l text-white shadow-xl backdrop:bg-black/65 open:flex open:flex-col"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 p-4">
          <h2 id="mobile-dashboard-menu-title" className="font-semibold">Dashboard Menu</h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close Dashboard Menu"
            className="grid size-11 place-items-center rounded-lg text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <DashboardNav onNavigate={() => dialog.current?.close()} />
        <div className="flex items-center justify-between gap-3 border-t border-zinc-800 p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-200">{user.name}</p>
            <p className="text-xs text-zinc-400">{bandRoleLabel(bandRole)}</p>
          </div>
          <LogoutButton />
        </div>
      </dialog>
    </div>
  );
}
