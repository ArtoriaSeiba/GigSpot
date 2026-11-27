"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus, Loader2, Music2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { GigSpotBrand } from "@/components/gigspot-brand";
import { GoogleMark } from "@/components/google-mark";
import { StageParticles } from "@/components/stage-particles";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { inviteAuthCallback, inviteAuthHref } from "@/lib/band-link-invites";

export default function RegisterPage() {
  return <Suspense fallback={<div className="workspace-shell min-h-dvh" />}><RegisterForm /></Suspense>;
}

function RegisterForm() {
  const router = useRouter();
  const callback = inviteAuthCallback(useSearchParams().get("callbackUrl"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Registration failed");
      }

      router.push(inviteAuthHref("/login", callback));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
      exit={{ opacity: 0, filter: "blur(10px)", scale: 1.02 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="workspace-shell relative flex min-h-dvh w-full flex-col overflow-hidden lg:flex-row"
    >
      
      {/* LEFT SIDE: Cinematic Stage / Headstock */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden lg:flex">
        {/* The Headstock Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
          style={{ backgroundImage: `url('/headstock-bg.png')` }}
        />
        
        {/* Glows and Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/40 via-transparent to-indigo-900/20 mix-blend-overlay" />

        <StageParticles />

        {/* Branding */}
        <div className="relative z-10 p-12">
          <div className="flex items-center gap-3">
            <GigSpotBrand />
          </div>
        </div>

        <div className="relative z-10 p-12 pb-24 max-w-xl">
          <h2 className="text-5xl font-bold text-white leading-tight drop-shadow-2xl mb-6">
            Join The Stage.<br/>Amplify Your Gig.
          </h2>
          <p className="text-lg text-zinc-300 drop-shadow-md">
            The ultimate command center for gigging musicians and bands. Manage schedules, finances, and live AR rehearsals all in one place.
          </p>
        </div>
      </div>

      {/* Account form */}
      <div className="workspace-rail relative z-20 flex min-h-dvh w-full items-center justify-center lg:w-1/2 lg:border-l">
        
        {/* Inner subtle glow */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-violet-500/10 to-transparent" />

        <div className="relative z-10 mx-4 my-7 w-full max-w-md sm:mx-6">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <GigSpotBrand />
          </div>

          <div className="mb-7 text-center lg:text-left">
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">Create Account</h1>
            <p className="text-sm text-zinc-400">Join GigSpot as an independent musician.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-xl flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 ml-1">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="workspace-input"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 ml-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="workspace-input"
                placeholder="musician@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="workspace-input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 ml-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="workspace-input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="workspace-primary mt-4 w-full sm:w-full"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
              {isLoading ? "Creating..." : "Sign Up"}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="h-px bg-zinc-800/80 flex-1" />
            <span className="text-xs text-zinc-500 font-semibold">Or Continue With</span>
            <div className="h-px bg-zinc-800/80 flex-1" />
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl: callback ?? "/dashboard" })}
            className="workspace-secondary mt-6 w-full gap-3"
          >
            <GoogleMark />
            Google
          </button>

          <p className="mt-8 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href={inviteAuthHref("/login", callback)} className="text-cyan-400 hover:text-cyan-300 transition-colors font-semibold">
              Sign In Here
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
