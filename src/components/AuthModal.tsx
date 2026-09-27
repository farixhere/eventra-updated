import React, { useState } from "react";
import { X, Shield, UserCheck, Key, CheckCircle, ArrowRight } from "lucide-react";
import { UserSessionItem } from "../types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password?: string) => Promise<void>;
  currentUser: UserSessionItem | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  currentUser,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onLogin(email.trim(), password || "Eventra2026!");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (presetEmail: string) => {
    setLoading(true);
    setError("");
    try {
      await onLogin(presetEmail, "Eventra2026!");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to switch role.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#12161f] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#d7ff3f]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#d7ff3f] text-black font-extrabold flex items-center justify-center text-lg">
              e
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Access Control</h2>
              <p className="text-xs text-neutral-400">Sign in to your Eventra role</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Quick Role Switcher */}
        <div className="mt-6">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
            Instant Persona Testing
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin("owner@eventra.local")}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#d7ff3f]/50 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-[#d7ff3f]">Super Admin</span>
                <Shield className="w-3.5 h-3.5 text-[#d7ff3f]" />
              </div>
              <span className="text-[10px] text-neutral-400 block truncate">owner@eventra.local</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin("coordinator@verve.org")}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/50 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-blue-400">Coordinator</span>
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <span className="text-[10px] text-neutral-400 block truncate">coordinator@verve.org</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin("judge.priya@eventra.org")}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-amber-400">Senior Judge</span>
                <Key className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-[10px] text-neutral-400 block truncate">judge.priya@eventra.org</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin("judge.marcus@eventra.org")}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/50 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-purple-400">Dance Juror</span>
                <Key className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <span className="text-[10px] text-neutral-400 block truncate">judge.marcus@eventra.org</span>
            </button>
          </div>
        </div>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <span className="relative px-3 bg-[#12161f] text-[11px] text-neutral-500 uppercase tracking-widest">
            or manual login
          </span>
        </div>

        {/* Custom Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. organiser@festival.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f] placeholder-neutral-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              aria-label="Admin password"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f] placeholder-neutral-500"
            />
            <span className="text-[10px] text-neutral-500 mt-1 block">Default bootstrap: Eventra2026!</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#d7ff3f] text-black font-bold text-sm hover:bg-[#cbf530] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(215,255,63,0.25)]"
          >
            <span>{loading ? "Authenticating…" : "Enter Workspace"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {currentUser && (
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-neutral-400">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>
              Currently signed in as: <strong className="text-white">{currentUser.name}</strong> ({currentUser.globalRole})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
