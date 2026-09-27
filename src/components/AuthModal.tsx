import React, { useState } from "react";
import {
  X,
  Shield,
  UserCheck,
  Key,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Building,
  Calendar,
  Mail,
  Lock,
  UserPlus,
  CreditCard,
  Check,
  RotateCcw,
} from "lucide-react";
import { UserSessionItem, SubscriptionPlanItem } from "../types";
import { api } from "../api";

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
  const [mode, setMode] = useState<"signin" | "onboarding" | "forgot" | "profile">("signin");

  // Sign In State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Onboarding Wizard State (Steps 1 to 6)
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardForm, setOnboardForm] = useState({
    name: "",
    email: "",
    password: "",
    verificationCode: "749215",
    isEmailVerified: true,
    organizationName: "",
    festivalName: "",
    festivalLocation: "",
    festivalStartDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
    festivalDescription: "",
    planCode: "trial",
    teamInviteEmail: "",
    teamInviteRole: "coordinator",
    teamInvites: [] as Array<{ email: string; role: string }>,
  });

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetStep, setResetStep] = useState<"request" | "reset">("request");

  // Profile Update State
  const [profileName, setProfileName] = useState(currentUser?.name || "");
  const [currentPass, setCurrentPass] = useState("");
  const [changePass, setChangePass] = useState("");

  if (!isOpen) return null;

  // Sign In handler
  const handleSignIn = async (e: React.FormEvent) => {
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

  // Quick Persona Login
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

  // Onboarding Submit
  const handleOnboardingSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.signup({
        name: onboardForm.name.trim(),
        email: onboardForm.email.trim(),
        password: onboardForm.password || "Eventra2026!",
        organizationName: onboardForm.organizationName.trim(),
        planCode: onboardForm.planCode,
        festivalName: onboardForm.festivalName.trim(),
        festivalLocation: onboardForm.festivalLocation.trim(),
        festivalStartDate: onboardForm.festivalStartDate,
        festivalDescription: onboardForm.festivalDescription.trim(),
        teamInvites: onboardForm.teamInvites,
      });

      if (res.ok && res.user) {
        await onLogin(onboardForm.email.trim(), onboardForm.password || "Eventra2026!");
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete onboarding.");
    } finally {
      setLoading(false);
    }
  };

  // Forgot password request
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError("Please enter your registered email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.forgotPassword(forgotEmail.trim());
      setSuccessMsg(res.message);
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setResetStep("reset");
      }
    } catch (err: any) {
      setError(err.message || "Could not generate password reset request.");
    } finally {
      setLoading(false);
    }
  };

  // Reset password execution
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.resetPassword(resetToken, newPassword);
      setSuccessMsg(res.message + " You can now sign in.");
      setTimeout(() => {
        setMode("signin");
        setEmail(forgotEmail);
        setPassword(newPassword);
        setResetStep("request");
        setSuccessMsg("");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  // Profile update handler
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await api.updateProfile({
        name: profileName.trim(),
        currentPassword: currentPass || undefined,
        newPassword: changePass || undefined,
      });
      setSuccessMsg(res.message);
      setCurrentPass("");
      setChangePass("");
    } catch (err: any) {
      setError(err.message || "Profile update failed.");
    } finally {
      setLoading(false);
    }
  };

  const addTeamInvite = () => {
    if (!onboardForm.teamInviteEmail.trim()) return;
    setOnboardForm((prev) => ({
      ...prev,
      teamInvites: [
        ...prev.teamInvites,
        { email: prev.teamInviteEmail.trim().toLowerCase(), role: prev.teamInviteRole },
      ],
      teamInviteEmail: "",
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#12161f] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-2xl overflow-hidden my-auto">
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-[#d7ff3f]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#d7ff3f] text-black font-extrabold flex items-center justify-center text-lg shadow-sm">
              e
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {mode === "signin" && "Sign In to Eventra"}
                {mode === "onboarding" && "Create Festival Workspace"}
                {mode === "forgot" && "Reset Your Password"}
                {mode === "profile" && "Account & Profile Settings"}
              </h2>
              <p className="text-xs text-neutral-400">
                {mode === "signin" && "Access your organization, festival, or judging portal"}
                {mode === "onboarding" && `Step ${onboardingStep} of 6 — Customer Onboarding`}
                {mode === "forgot" && "Recover your account credentials securely"}
                {mode === "profile" && "Manage your identity, password, and active roles"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 mt-4 p-1 rounded-xl bg-white/5 border border-white/5 text-xs font-semibold">
          <button
            onClick={() => {
              setMode("signin");
              setError("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === "signin" ? "bg-[#d7ff3f] text-black shadow-sm" : "text-neutral-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setMode("onboarding");
              setOnboardingStep(1);
              setError("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === "onboarding" ? "bg-[#d7ff3f] text-black shadow-sm" : "text-neutral-400 hover:text-white"
            }`}
          >
            New Workspace
          </button>
          {currentUser ? (
            <button
              onClick={() => {
                setMode("profile");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === "profile" ? "bg-[#d7ff3f] text-black shadow-sm" : "text-neutral-400 hover:text-white"
              }`}
            >
              My Account
            </button>
          ) : (
            <button
              onClick={() => {
                setMode("forgot");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === "forgot" ? "bg-[#d7ff3f] text-black shadow-sm" : "text-neutral-400 hover:text-white"
              }`}
            >
              Forgot Pass
            </button>
          )}
        </div>

        {/* Alert banners */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ----------------- MODE 1: SIGN IN ----------------- */}
        {mode === "signin" && (
          <div className="mt-4 space-y-4">
            {/* Quick Personas */}
            <div>
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                Instant Multi-Tenant Role Switcher
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin("owner@eventra.local")}
                  disabled={loading}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#d7ff3f]/50 text-left transition-all group"
                >
                  <span className="text-[11px] font-bold text-white group-hover:text-[#d7ff3f] block">
                    Faris (Owner)
                  </span>
                  <span className="text-[10px] text-amber-400 font-semibold uppercase">Super Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin("coordinator@xaviers.edu")}
                  disabled={loading}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-sky-400/50 text-left transition-all group"
                >
                  <span className="text-[11px] font-bold text-white group-hover:text-sky-300 block">
                    College A Dean
                  </span>
                  <span className="text-[10px] text-sky-400 font-semibold uppercase">St. Xavier's</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin("dean@techleague.org")}
                  disabled={loading}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/50 text-left transition-all group"
                >
                  <span className="text-[11px] font-bold text-white group-hover:text-purple-300 block">
                    College B Lead
                  </span>
                  <span className="text-[10px] text-purple-400 font-semibold uppercase">Tech League</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin("judge.priya@eventra.org")}
                  disabled={loading}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-400/50 text-left transition-all group"
                >
                  <span className="text-[11px] font-bold text-white group-hover:text-emerald-300 block">
                    Dr. Priya Menon
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase">Judge (Folk/Solo)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin("judge.marcus@eventra.org")}
                  disabled={loading}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-rose-400/50 text-left transition-all group"
                >
                  <span className="text-[11px] font-bold text-white group-hover:text-rose-300 block">
                    Marcus Vance
                  </span>
                  <span className="text-[10px] text-rose-400 font-semibold uppercase">Judge (Dance)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin("aarav.s@campus.edu")}
                  disabled={loading}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 text-left transition-all group"
                >
                  <span className="text-[11px] font-bold text-white group-hover:text-amber-300 block">
                    Aarav Sharma
                  </span>
                  <span className="text-[10px] text-neutral-400 font-semibold uppercase">Participant</span>
                </button>
              </div>
            </div>

            <div className="relative my-2 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <span className="relative px-3 bg-[#12161f] text-[11px] text-neutral-500 uppercase tracking-widest">
                or sign in with credentials
              </span>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. organizer@college.edu"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f] placeholder-neutral-500"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-neutral-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-[11px] text-[#d7ff3f] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f] placeholder-neutral-500"
                  />
                </div>
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Password check active. Default demo: Eventra2026!
                </span>
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

            <div className="pt-2 text-center">
              <span className="text-xs text-neutral-400">
                New organizer or festival team?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("onboarding");
                    setOnboardingStep(1);
                  }}
                  className="text-[#d7ff3f] font-semibold hover:underline"
                >
                  Start 14-Day Free Onboarding →
                </button>
              </span>
            </div>
          </div>
        )}

        {/* ----------------- MODE 2: CUSTOMER ONBOARDING (STEPS 1 to 6) ----------------- */}
        {mode === "onboarding" && (
          <div className="mt-4 space-y-4">
            {/* Step Progress Indicator */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
              {[
                { step: 1, label: "Account" },
                { step: 2, label: "Verify" },
                { step: 3, label: "Organization" },
                { step: 4, label: "Festival" },
                { step: 5, label: "Plan" },
                { step: 6, label: "Team" },
              ].map((s) => (
                <div
                  key={s.step}
                  onClick={() => s.step <= onboardingStep && setOnboardingStep(s.step)}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                    onboardingStep === s.step
                      ? "text-[#d7ff3f] font-bold"
                      : onboardingStep > s.step
                      ? "text-emerald-400"
                      : "text-neutral-500"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      onboardingStep === s.step
                        ? "bg-[#d7ff3f] text-black shadow-sm"
                        : onboardingStep > s.step
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-white/5 text-neutral-400"
                    }`}
                  >
                    {onboardingStep > s.step ? <Check className="w-3.5 h-3.5" /> : s.step}
                  </div>
                  <span className="hidden sm:inline text-[10px]">{s.label}</span>
                </div>
              ))}
            </div>

            {/* STEP 1: ACCOUNT CREATION */}
            {onboardingStep === 1 && (
              <div className="space-y-3.5">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-[#d7ff3f]" />
                    <span>Organizer Account Credentials</span>
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Create the primary administrator account for your festival organization.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    value={onboardForm.name}
                    onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
                    placeholder="e.g. Dr. Jennifer Adams"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f] placeholder-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Work / College Email</label>
                  <input
                    type="email"
                    value={onboardForm.email}
                    onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                    placeholder="e.g. dean@stanfordarts.edu"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f] placeholder-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Secure Password</label>
                  <input
                    type="password"
                    value={onboardForm.password}
                    onChange={(e) => setOnboardForm({ ...onboardForm, password: e.target.value })}
                    placeholder="At least 6 characters"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f] placeholder-neutral-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!onboardForm.name.trim() || !onboardForm.email.trim()) {
                      setError("Please provide your name and email.");
                      return;
                    }
                    setError("");
                    setOnboardingStep(2);
                  }}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-[#d7ff3f] text-black font-bold text-sm hover:bg-[#cbf530] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue to Email Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2: EMAIL VERIFICATION */}
            {onboardingStep === 2 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#d7ff3f]/10 text-[#d7ff3f] flex items-center justify-center mx-auto mb-2">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Verify Your Email Address</h4>
                  <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                    We sent a 6-digit verification code to{" "}
                    <strong className="text-white">{onboardForm.email}</strong>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    value={onboardForm.verificationCode}
                    onChange={(e) => setOnboardForm({ ...onboardForm, verificationCode: e.target.value })}
                    placeholder="749215"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center tracking-widest text-lg font-mono text-[#d7ff3f] focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle className="w-3.5 h-3.5" /> Token auto-generated & verified
                    </span>
                    <button
                      type="button"
                      onClick={() => setOnboardForm({ ...onboardForm, verificationCode: "882194" })}
                      className="text-[#d7ff3f] hover:underline"
                    >
                      Resend Code
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(1)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 text-neutral-300 text-xs font-bold hover:bg-white/10 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setOnboardingStep(3);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#d7ff3f] text-black font-bold text-sm hover:bg-[#cbf530] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Confirm & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: ORGANIZATION DETAILS */}
            {onboardingStep === 3 && (
              <div className="space-y-3.5">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-[#d7ff3f]" />
                    <span>Organization & Campus Details</span>
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Every organization operates in complete data isolation from other colleges.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Organization / School / College Name
                  </label>
                  <input
                    type="text"
                    value={onboardForm.organizationName}
                    onChange={(e) => setOnboardForm({ ...onboardForm, organizationName: e.target.value })}
                    placeholder="e.g. Oxford Cultural Arts Society"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f] placeholder-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Billing & Invoicing Email</label>
                  <input
                    type="email"
                    value={onboardForm.email}
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-neutral-400 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    Linked to your primary organizer account.
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(2)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 text-neutral-300 text-xs font-bold hover:bg-white/10 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!onboardForm.organizationName.trim()) {
                        setError("Please enter your organization or college name.");
                        return;
                      }
                      setError("");
                      setOnboardingStep(4);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#d7ff3f] text-black font-bold text-sm hover:bg-[#cbf530] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Enter Festival Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: FESTIVAL WORKSPACE DETAILS */}
            {onboardingStep === 4 && (
              <div className="space-y-3.5">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#d7ff3f]" />
                    <span>First Festival Workspace</span>
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Initialize the public festival page, schedule engine, and scoring portal.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Festival Name</label>
                  <input
                    type="text"
                    value={onboardForm.festivalName}
                    onChange={(e) => setOnboardForm({ ...onboardForm, festivalName: e.target.value })}
                    placeholder="e.g. Zenith Festival 2026"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f] placeholder-neutral-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={onboardForm.festivalStartDate}
                      onChange={(e) => setOnboardForm({ ...onboardForm, festivalStartDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Main Venue / Campus</label>
                    <input
                      type="text"
                      value={onboardForm.festivalLocation}
                      onChange={(e) => setOnboardForm({ ...onboardForm, festivalLocation: e.target.value })}
                      placeholder="e.g. Main Auditorium"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f] placeholder-neutral-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Brief Description</label>
                  <textarea
                    rows={2}
                    value={onboardForm.festivalDescription}
                    onChange={(e) => setOnboardForm({ ...onboardForm, festivalDescription: e.target.value })}
                    placeholder="Inter-collegiate cultural festival featuring drama, music, dance and arts..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f] placeholder-neutral-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(3)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 text-neutral-300 text-xs font-bold hover:bg-white/10 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!onboardForm.festivalName.trim()) {
                        setError("Please enter your festival name.");
                        return;
                      }
                      setError("");
                      setOnboardingStep(5);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#d7ff3f] text-black font-bold text-sm hover:bg-[#cbf530] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Choose Plan or Trial</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: PLAN SELECTION & BILLING */}
            {onboardingStep === 5 && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-[#d7ff3f]" />
                    <span>Select Subscription Tier</span>
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    No payment charged today. 14-day full feature trial included. Payment gateway integration pending.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      code: "trial",
                      name: "14-Day Free Trial",
                      price: "$0",
                      period: "for 14 days",
                      highlight: "Full feature preview",
                      events: "1 Festival",
                      participants: "100 contestants",
                    },
                    {
                      code: "starter",
                      name: "Starter Campus",
                      price: "$49",
                      period: "/month",
                      highlight: "Small Colleges",
                      events: "2 Festivals",
                      participants: "500 contestants",
                    },
                    {
                      code: "pro",
                      name: "Pro Tournament",
                      price: "$149",
                      period: "/month",
                      highlight: "Most Popular",
                      events: "10 Festivals",
                      participants: "3,000 contestants",
                    },
                    {
                      code: "enterprise",
                      name: "Enterprise Consortium",
                      price: "$399",
                      period: "/month",
                      highlight: "Statewide Leagues",
                      events: "Unlimited",
                      participants: "25,000 contestants",
                    },
                  ].map((p) => (
                    <div
                      key={p.code}
                      onClick={() => setOnboardForm({ ...onboardForm, planCode: p.code })}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        onboardForm.planCode === p.code
                          ? "bg-[#d7ff3f]/10 border-[#d7ff3f] shadow-[0_0_12px_rgba(215,255,63,0.15)]"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-white/10 text-[#d7ff3f]">
                          {p.highlight}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 my-1">
                        <span className="text-lg font-black text-white">{p.price}</span>
                        <span className="text-[10px] text-neutral-400">{p.period}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 space-y-0.5 pt-1 border-t border-white/5">
                        <div>• {p.events}</div>
                        <div>• {p.participants}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(4)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 text-neutral-300 text-xs font-bold hover:bg-white/10 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setOnboardingStep(6);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#d7ff3f] text-black font-bold text-sm hover:bg-[#cbf530] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Invite Team Members</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: INVITE TEAM MEMBERS */}
            {onboardingStep === 6 && (
              <div className="space-y-3.5">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-[#d7ff3f]" />
                    <span>Invite Coordinators & Judges</span>
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Add team members now or invite them later from the dashboard.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={onboardForm.teamInviteEmail}
                    onChange={(e) => setOnboardForm({ ...onboardForm, teamInviteEmail: e.target.value })}
                    placeholder="colleague@college.edu"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
                  />
                  <select
                    value={onboardForm.teamInviteRole}
                    onChange={(e) => setOnboardForm({ ...onboardForm, teamInviteRole: e.target.value })}
                    className="bg-[#1a202c] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white"
                  >
                    <option value="coordinator">Coordinator</option>
                    <option value="judge">Judge</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="button"
                    onClick={addTeamInvite}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
                  >
                    Add
                  </button>
                </div>

                {onboardForm.teamInvites.length > 0 && (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {onboardForm.teamInvites.map((inv, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-xs"
                      >
                        <span className="text-neutral-200">{inv.email}</span>
                        <span className="px-2 py-0.5 rounded bg-[#d7ff3f]/10 text-[#d7ff3f] uppercase text-[10px] font-bold">
                          {inv.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(5)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 text-neutral-300 text-xs font-bold hover:bg-white/10 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleOnboardingSubmit}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#d7ff3f] text-black font-extrabold text-sm hover:bg-[#cbf530] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(215,255,63,0.3)]"
                  >
                    <span>{loading ? "Creating Workspace…" : "Launch Workspace & Dashboard"}</span>
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- MODE 3: FORGOT PASSWORD ----------------- */}
        {mode === "forgot" && (
          <div className="mt-4 space-y-4">
            {resetStep === "request" ? (
              <form onSubmit={handleForgotRequest} className="space-y-3.5">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Enter your account's registered email address. We will generate a secure one-time password
                    reset token for instant access recovery.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Account Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. coordinator@xaviers.edu"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-[#d7ff3f] text-black font-bold text-sm hover:bg-[#cbf530] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loading ? "Generating Link…" : "Send Reset Token"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-3.5">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                  Reset token verified. Set your new password below.
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-[#d7ff3f] text-black font-bold text-sm hover:bg-[#cbf530] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loading ? "Updating Password…" : "Save New Password"}</span>
                  <Check className="w-4 h-4" />
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-xs text-neutral-400 hover:text-white"
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ----------------- MODE 4: ACCOUNT PROFILE ----------------- */}
        {mode === "profile" && currentUser && (
          <div className="mt-4 space-y-4">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white block">{currentUser.name}</span>
                <span className="text-xs text-neutral-400 block">{currentUser.email}</span>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded bg-[#d7ff3f]/10 text-[#d7ff3f] text-[10px] font-bold uppercase tracking-wider block">
                  {currentUser.isSuperAdmin ? "Super Admin (Owner)" : currentUser.activeRole}
                </span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 justify-end">
                  <CheckCircle className="w-3 h-3" /> Email Verified
                </span>
              </div>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
                />
              </div>

              <div className="pt-2 border-t border-white/10">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                  Update Password (Optional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">New Password</label>
                    <input
                      type="password"
                      value={changePass}
                      onChange={(e) => setChangePass(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#d7ff3f] text-black font-bold text-xs hover:bg-[#cbf530] transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <span>{loading ? "Saving…" : "Update Profile"}</span>
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
