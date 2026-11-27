"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button 
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })} 
      className="grid size-11 shrink-0 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-red-400"
      aria-label="Log Out"
      title="Log Out"
    >
      <LogOut className="w-4 h-4" />
    </button>
  );
}
