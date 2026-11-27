import Link from "next/link";
import { AudioLines } from "lucide-react";

export function GigSpotBrand({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl text-xl font-bold tracking-tight text-white transition-colors hover:text-violet-200 ${className}`}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-violet-300/30 bg-violet-400/15 text-violet-200">
        <AudioLines aria-hidden="true" className="size-4" />
      </span>
      GigSpot
    </Link>
  );
}
