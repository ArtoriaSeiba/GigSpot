"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: "/login" })} 
      className="p-2 text-zinc-500 hover:text-red-400 transition-colors" 
      title="Logout"
    >
      <LogOut className="w-4 h-4" />
    </button>
  );
}
