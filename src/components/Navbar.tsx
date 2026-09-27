import React from "react";
import { Sparkles, Shield, Award, LayoutDashboard, Compass, LogIn, LogOut, Search } from "lucide-react";
import { EventItem, UserSessionItem } from "../types";

interface NavbarProps {
  currentView: "landing" | "event" | "dashboard";
  onSelectView: (view: "landing" | "event" | "dashboard") => void;
  events: EventItem[];
  selectedEvent: EventItem | null;
  onSelectEvent: (event: EventItem) => void;
  user: UserSessionItem | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenVerify: () => void;
  onOpenSearch: () => void;
  onSwitchOrg?: (orgId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  events,
  selectedEvent,
  onSelectEvent,
  user,
  onOpenAuth,
  onLogout,
  onOpenVerify,
  onOpenSearch,
  onSwitchOrg,
}) => {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0b0d11]/85 border-b border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onSelectView("landing")}
            className="flex items-center gap-2 group text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[#d7ff3f] text-black font-black text-xl flex items-center justify-center shadow-[0_0_20px_rgba(215,255,63,0.35)] group-hover:scale-105 transition-transform">
              e
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1">
                eventra<span className="text-[#d7ff3f]">.</span>
              </span>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-neutral-400 block -mt-1">
                Festival Platform
              </span>
            </div>
          </button>

          {/* Quick festival selector when browsing public event or dashboard */}
          {events.length > 0 && (
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-white/10">
              <span className="text-xs text-neutral-400">Festival:</span>
              <select
                value={selectedEvent?.id || ""}
                onChange={(e) => {
                  const ev = events.find((item) => item.id === e.target.value);
                  if (ev) onSelectEvent(ev);
                }}
                className="bg-white/5 border border-white/10 text-xs text-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#d7ff3f] cursor-pointer"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-neutral-900 text-white">
                    {ev.name} ({ev.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Center Nav Views */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onSelectView("landing")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentView === "landing"
                ? "bg-white/15 text-white shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Discovery</span>
          </button>

          <button
            onClick={() => onSelectView("event")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentView === "event"
                ? "bg-[#d7ff3f] text-black font-bold shadow-[0_0_15px_rgba(215,255,63,0.3)]"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Festival Site</span>
          </button>

          <button
            onClick={() => onSelectView("dashboard")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentView === "dashboard"
                ? "bg-white text-black font-bold shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Command Center</span>
            <span className="sm:hidden">Admin</span>
          </button>
        </nav>

        {/* Right Tools & User */}
        <div className="flex items-center gap-2">
          {/* Candidate Search by Chest Number */}
          <button
            onClick={onOpenSearch}
            title="Search Result by Chest Number"
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Certificate Verify Button */}
          <button
            onClick={onOpenVerify}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 hover:border-[#d7ff3f]/50 text-neutral-300 hover:text-white bg-white/5 transition-all cursor-pointer"
          >
            <Award className="w-3.5 h-3.5 text-[#d7ff3f]" />
            <span>Verify Cert</span>
          </button>

          {/* Auth State */}
          {user ? (
            <div className="flex items-center gap-2 pl-2">
              {user.organizations && user.organizations.length > 1 && onSwitchOrg && (
                <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase">Org:</span>
                  <select
                    value={user.activeOrgId}
                    onChange={(e) => onSwitchOrg(e.target.value)}
                    className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
                  >
                    {user.organizations.map((org) => (
                      <option key={org.orgId} value={org.orgId} className="bg-neutral-900 text-white">
                        {org.orgName} ({org.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="hidden lg:block text-right">
                <span className="text-xs font-bold text-white block leading-tight">{user.name}</span>
                <span className="text-[10px] text-[#d7ff3f] uppercase tracking-wider font-semibold">
                  {user.isSuperAdmin ? "Super Admin" : user.activeRole || user.globalRole || "Member"}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-black hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
