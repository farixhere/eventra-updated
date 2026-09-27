import React, { useState } from "react";
import { Sparkles, Calendar, MapPin, ArrowRight, Trophy, Users, ShieldCheck, FileCheck, Layers, Clock, Zap } from "lucide-react";
import { EventItem } from "../types";

interface LandingViewProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
  onOpenDashboard: () => void;
  onOpenVerify: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  events,
  onSelectEvent,
  onOpenDashboard,
  onOpenVerify,
}) => {
  const [search, setSearch] = useState("");

  const filteredEvents = events.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-20 pb-24">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#d7ff3f]/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="text-center max-w-3xl mx-auto space-y-6 relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#d7ff3f] backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#d7ff3f] animate-ping" />
            <span>EVENTRA 2026 PRODUCTION SUITE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.08]">
            Where festivals <br />
            <span className="bg-gradient-to-r from-[#d7ff3f] via-white to-[#38bdf8] bg-clip-text text-transparent">
              come alive.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-neutral-400 font-normal leading-relaxed">
            The complete operating system for campus arts galas, inter-collegiate tournaments, and cultural fests.
            Real-time schedules, multi-criteria judging, verified results, and digital certificates.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenDashboard}
              className="px-6 py-3.5 rounded-xl bg-[#d7ff3f] text-black font-extrabold text-sm hover:bg-[#cbf530] transition-all flex items-center gap-2 shadow-[0_0_25px_rgba(215,255,63,0.3)] hover:scale-[1.02] cursor-pointer"
            >
              <span>Open Command Center</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenVerify}
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#d7ff3f]" />
              <span>Verify Certificate</span>
            </button>
          </div>
        </div>

        {/* Marquee Banner */}
        <div className="mt-16 overflow-hidden rounded-2xl bg-neutral-900/60 border border-white/10 py-3.5">
          <div className="animate-marquee whitespace-nowrap text-xs font-bold uppercase tracking-widest text-neutral-400 flex gap-8">
            <span className="flex items-center gap-2">✦ REAL-TIME RUNNING ORDER</span>
            <span className="text-[#d7ff3f]">★</span>
            <span className="flex items-center gap-2">✦ MULTI-CRITERIA SCORING</span>
            <span className="text-[#d7ff3f]">★</span>
            <span className="flex items-center gap-2">✦ OFFICIAL PODIUM RESULTS</span>
            <span className="text-[#d7ff3f]">★</span>
            <span className="flex items-center gap-2">✦ CHEST NUMBER LOOKUP</span>
            <span className="text-[#d7ff3f]">★</span>
            <span className="flex items-center gap-2">✦ TAMPER-PROOF CERTIFICATES</span>
            <span className="text-[#d7ff3f]">★</span>
            <span className="flex items-center gap-2">✦ AUDITED CORRECTIONS</span>
          </div>
        </div>
      </section>

      {/* Featured Festivals Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <span className="text-xs font-bold text-[#d7ff3f] uppercase tracking-wider block mb-1">
              Active Festivals
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Explore Current Events</h2>
          </div>
          <div className="w-full md:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search festival or venue…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f] placeholder-neutral-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEvents.map((event) => (
            <article
              key={event.id}
              onClick={() => onSelectEvent(event)}
              className="group relative rounded-2xl bg-neutral-900/80 border border-white/10 hover:border-[#d7ff3f]/50 p-6 transition-all duration-300 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between cursor-pointer overflow-hidden"
            >
              <div
                className="absolute inset-0 opacity-15 group-hover:opacity-25 transition-opacity bg-cover bg-center pointer-events-none"
                style={{ backgroundImage: `url(${event.banner_url})` }}
              />

              <div className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      event.status === "live"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    }`}
                  >
                    ● {event.status}
                  </span>

                  <span className="text-xs font-mono text-neutral-400 group-hover:text-white transition-colors">
                    /{event.slug}
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-white group-hover:text-[#d7ff3f] transition-colors">
                    {event.name}
                  </h3>
                  <p className="text-xs text-[#d7ff3f] font-semibold mt-0.5">{event.tagline}</p>
                  <p className="text-xs text-neutral-400 line-clamp-2 mt-2 leading-relaxed">
                    {event.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-neutral-300">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#d7ff3f]" />
                    <span>
                      {new Date(event.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {event.end_date ? ` — ${new Date(event.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#d7ff3f] shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>
              </div>

              <div className="relative pt-6 mt-6 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 group-hover:text-white flex items-center gap-1">
                  Explore Festival Portal
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-[#d7ff3f]" />
                </span>
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">
                  Official Site ↗
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* The Eventra Toolkit Feature Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-[#d7ff3f] uppercase tracking-wider">The Toolkit</span>
          <h2 className="text-3xl font-black text-white">Everything moves. Nothing gets lost.</h2>
          <p className="text-sm text-neutral-400">
            Designed around the real rhythm of festivals: prepare → run → verify → publish.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#d7ff3f]/10 text-[#d7ff3f] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Live Command Center</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Events, venues, programmes, teams and participants managed in one unified live workspace.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Real-Time Schedule</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Conflict detection, automated stage allocation, and instant public timetable broadcasting.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Multi-Criteria Judging</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Judges score entries on assigned criteria, coordinators verify averages, and approved results go live instantly.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Cryptographic Certificates</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Auto-generate verifiable merit and participation certificates with unique QR codes and fraud prevention.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Public Festival Portal</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Every festival gets an immersive public home with schedules, live result wall, downloads, and photo mosaic.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Audited Corrections</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Every score adjustment or status change requires a mandatory audit explanation, preserved in the tamper-proof log.
            </p>
          </div>
        </div>
      </section>

      {/* The Rhythm Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-neutral-900/60 border border-white/10 relative overflow-hidden">
          <div className="max-w-2xl space-y-6">
            <span className="text-xs font-bold text-[#d7ff3f] uppercase tracking-wider">THE RHYTHM</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              From first setup to <em className="not-italic text-[#d7ff3f]">final result.</em>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 text-xs">
              <div className="space-y-1">
                <strong className="text-white font-bold block text-sm">01 / Setup</strong>
                <p className="text-neutral-400">Configure venues, programmes, criteria rules, teams, and registrations.</p>
              </div>
              <div className="space-y-1">
                <strong className="text-white font-bold block text-sm">02 / Operate</strong>
                <p className="text-neutral-400">Live timetable updates, stage calls, announcements, and candidate chest assignments.</p>
              </div>
              <div className="space-y-1">
                <strong className="text-white font-bold block text-sm">03 / Results</strong>
                <p className="text-neutral-400">Judge criteria scoring, coordinator review, tie-breaking, and official publishing.</p>
              </div>
              <div className="space-y-1">
                <strong className="text-white font-bold block text-sm">04 / Celebrate</strong>
                <p className="text-neutral-400">Instant certificates, team points leaderboard, and online credential verification.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
