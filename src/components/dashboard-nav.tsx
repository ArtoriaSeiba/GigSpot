"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Calendar, CheckSquare, DollarSign, Guitar, LayoutDashboard, PlayCircle, Settings, User, Users } from "lucide-react";

const groups = [
  {
    label: null,
    links: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/rehearse", label: "Rehearse", icon: PlayCircle },
    ],
  },
  {
    label: "Band Workspace",
    links: [
      { href: "/dashboard/gigs", label: "Gigs & Schedules", icon: Calendar },
      { href: "/dashboard/repertoire", label: "Repertoire", icon: Guitar },
      { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/dashboard/band", label: "Band Members", icon: Users },
      { href: "/dashboard/band-profile", label: "Band Profile", icon: Settings },
      { href: "/dashboard/gear", label: "Gear Inventory", icon: Briefcase },
      { href: "/dashboard/finances", label: "Finances", icon: DollarSign },
    ],
  },
  {
    label: "Personal",
    links: [
      { href: "/dashboard/profile", label: "My Profile", icon: User },
    ],
  },
];

export function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="workspace-nav min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
      {groups.map(({ label, links }) => (
        <div key={label ?? "overview"} className="space-y-1">
          {label && <p className="px-3 pb-0.5 text-[11px] font-semibold text-zinc-400">{label}</p>}
          {links.map(({ href, label, icon: Icon }) => {
            const isCurrent = pathname === href;
            const isActive = isCurrent || (href !== "/dashboard" && pathname.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                aria-current={isCurrent ? "page" : isActive ? "location" : undefined}
                onNavigate={onNavigate}
                className="workspace-nav-link"
              >
                <Icon aria-hidden="true" className={`size-[18px] shrink-0 ${isActive ? "text-violet-200" : "text-zinc-400"}`} />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
