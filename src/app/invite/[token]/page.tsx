"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [message, setMessage] = useState("Joining band...");

  useEffect(() => {
    const joinBand = async () => {
      try {
        const res = await fetch("/api/band/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: params.token })
        });
        
        const data = await res.json();
        
        if (res.ok) {
          setStatus("success");
          setMessage("Successfully joined the band! Redirecting...");
          // Set the active band to the new one
          document.cookie = `activeBandId=${data.bandId}; path=/; max-age=31536000`;
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        } else {
          setStatus("error");
          if (res.status === 401) {
            setMessage("Please log in or create an account first to join the band.");
            setTimeout(() => {
              // Store token in session storage or cookie so we can redirect back after login
              sessionStorage.setItem("pendingInvite", params.token);
              router.push("/auth/signin");
            }, 3000);
          } else {
            setMessage(data.error || "Failed to join band.");
          }
        }
      } catch (err) {
        setStatus("error");
        setMessage("An unexpected error occurred.");
      }
    };

    if (params.token) {
      joinBand();
    }
  }, [params.token, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl max-w-md w-full p-8 text-center"
      >
        {status === "loading" && (
          <div className="space-y-4 flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            <h2 className="text-xl font-bold text-white">Joining Band</h2>
            <p className="text-zinc-400">{message}</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 flex flex-col items-center">
            <ShieldAlert className="w-16 h-16 text-red-500" />
            <h2 className="text-xl font-bold text-white">Error Joining Band</h2>
            <p className="text-zinc-400">{message}</p>
            <button 
              onClick={() => router.push("/")}
              className="mt-4 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-medium"
            >
              Go to Homepage
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 flex flex-col items-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            <h2 className="text-xl font-bold text-white">Success!</h2>
            <p className="text-zinc-400">{message}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
