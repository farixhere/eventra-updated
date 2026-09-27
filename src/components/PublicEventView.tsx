import React, { useState } from "react";
import {
  Calendar,
  MapPin,
  Clock,
  Trophy,
  Award,
  Search,
  Download,
  Send,
  CheckCircle,
  Users,
  ChevronRight,
  Flame,
  Radio,
  FileText,
} from "lucide-react";
import {
  EventItem,
  ProgrammeItem,
  ScheduleItem,
  ResultItem,
  AnnouncementItem,
  DownloadItem,
  MediaAssetItem,
  LeaderboardItem,
} from "../types";
import { api } from "../api";

interface PublicEventViewProps {
  event: EventItem;
  programmes: ProgrammeItem[];
  schedules: ScheduleItem[];
  results: ResultItem[];
  announcements: AnnouncementItem[];
  downloads: DownloadItem[];
  media: MediaAssetItem[];
  leaderboard: LeaderboardItem[];
  onOpenCandidateSearch: () => void;
  onOpenVerify: () => void;
}

export const PublicEventView: React.FC<PublicEventViewProps> = ({
  event,
  programmes,
  schedules,
  results,
  announcements,
  downloads,
  media,
  leaderboard,
  onOpenCandidateSearch,
  onOpenVerify,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [regForm, setRegForm] = useState({
    participantName: "",
    email: "",
    phone: "",
    teamName: "",
    programmeId: "",
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState("");

  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  // Extract categories
  const categories = ["all", ...new Set(programmes.map((p) => p.category))];

  const filteredProgrammes =
    selectedCategory === "all"
      ? programmes
      : programmes.filter((p) => p.category === selectedCategory);

  const publishedResults = results.filter((r) => r.published);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.participantName.trim()) {
      setRegError("Participant name is required.");
      return;
    }
    setRegLoading(true);
    setRegError("");
    try {
      const res = await api.publicRegister({
        eventId: event.id,
        participantName: regForm.participantName.trim(),
        email: regForm.email.trim() || undefined,
        phone: regForm.phone.trim() || undefined,
        teamName: regForm.teamName.trim() || undefined,
        programmeId: regForm.programmeId || undefined,
      });
      setRegSuccess(res.message);
      setRegForm({ participantName: "", email: "", phone: "", teamName: "", programmeId: "" });
    } catch (err: any) {
      setRegError(err.message || "Registration failed.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactLoading(true);
    try {
      await api.sendContactMessage({
        eventId: event.id,
        ...contactForm,
      });
      setContactSuccess(true);
      setContactForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      console.error(err);
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-neutral-100 bg-[#0a0c10] pb-24 space-y-16">
      {/* Topline Banner */}
      <div className="bg-[#12161f] border-b border-white/10 px-4 py-2 text-xs font-semibold flex flex-wrap items-center justify-between gap-3 text-neutral-300">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d7ff3f] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d7ff3f]"></span>
          </span>
          <span className="uppercase tracking-widest text-[#d7ff3f] font-bold">
            {event.status.toUpperCase()} EVENT
          </span>
          <span className="text-neutral-500">|</span>
          <span>
            {new Date(event.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>

        <div className="flex items-center gap-4 text-neutral-400">
          <span className="flex items-center gap-1 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#d7ff3f]" />
            {event.location}
          </span>
          <button
            onClick={onOpenVerify}
            className="text-xs text-[#d7ff3f] hover:underline cursor-pointer"
          >
            Verify Certificate
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden border border-white/10 p-8 sm:p-14 bg-neutral-900/90 shadow-2xl">
          {/* Hero background image */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none scale-105"
            style={{ backgroundImage: `url(${event.banner_url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-[#0a0c10] via-[#0a0c10]/85 to-transparent pointer-events-none" />

          <div className="relative max-w-2xl space-y-6">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#d7ff3f]/10 border border-[#d7ff3f]/30 text-[#d7ff3f] text-xs font-bold uppercase tracking-wider">
                {event.slug}
              </span>
              {event.registration_open && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  Registration Open
                </span>
              )}
            </div>

            <div>
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.08]">
                {event.name}
              </h1>
              <p className="text-lg sm:text-xl text-[#d7ff3f] font-semibold mt-2">{event.tagline}</p>
            </div>

            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-xl">
              {event.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {event.registration_open && (
                <button
                  onClick={() => setRegisterModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-[#d7ff3f] text-black font-extrabold text-sm hover:bg-[#cbf530] transition-transform hover:scale-[1.02] shadow-[0_0_20px_rgba(215,255,63,0.3)] cursor-pointer"
                >
                  Register as Contestant ↗
                </button>
              )}

              <button
                onClick={onOpenCandidateSearch}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/15 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Search className="w-4 h-4 text-[#d7ff3f]" />
                <span>Search by Chest Number</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Live Updates & Announcements Ticker */}
      {announcements.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-4 rounded-2xl bg-[#12161f] border border-white/10 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-[#d7ff3f]/10 text-[#d7ff3f] rounded-lg text-xs font-black uppercase tracking-wider shrink-0 w-fit">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>LIVE DESK</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs text-neutral-300">
                <strong className="text-white font-bold mr-2">{announcements[0].title}:</strong>
                <span>{announcements[0].body}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Programme Lineup Grid */}
      <section id="programmes" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold text-[#d7ff3f] uppercase tracking-wider block mb-1">
              01 / THE LINEUP
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Programmes & Competitions</h2>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#d7ff3f] text-black font-bold shadow-sm"
                    : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProgrammes.map((p, idx) => (
            <div
              key={p.id}
              className="p-5 rounded-2xl bg-neutral-900/80 border border-white/10 hover:border-[#d7ff3f]/40 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-neutral-500 font-bold">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/5 text-neutral-300 font-medium text-[11px]">
                    {p.category}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-[#d7ff3f] transition-colors">
                  {p.name}
                </h3>
                <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed">
                  {p.description || "Official competitive event of the festival."}
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
                <span className="uppercase font-semibold tracking-wider text-[10px]">
                  {p.type} {p.max_participants > 1 ? `(Max ${p.max_participants})` : "Solo"}
                </span>
                <span className="flex items-center gap-1 text-neutral-300">
                  <Clock className="w-3.5 h-3.5 text-[#d7ff3f]" />
                  {p.duration_minutes} mins
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Running Order & Schedule */}
      <section id="schedule" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="border-b border-white/10 pb-4">
          <span className="text-xs font-bold text-[#d7ff3f] uppercase tracking-wider block mb-1">
            02 / RUNNING ORDER
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Timetable & Stages</h2>
        </div>

        <div className="bg-neutral-900/90 rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
          {schedules.map((s, idx) => (
            <div
              key={s.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-neutral-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <Clock className="w-3.5 h-3.5 text-[#d7ff3f]" />
                    <span>
                      {new Date(s.starts_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span>—</span>
                    <span>
                      {new Date(s.ends_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <strong className="text-base font-bold text-white block mt-0.5">
                    {s.programme_name}
                  </strong>
                  <span className="text-xs text-neutral-400">{s.category}</span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Stage / Venue</span>
                  <span className="text-neutral-200 font-semibold">{s.venue_name}</span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    s.status === "completed"
                      ? "bg-neutral-800 text-neutral-400"
                      : s.status === "ongoing"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {s.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Official Results Wall */}
      <section id="results" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold text-[#d7ff3f] uppercase tracking-wider block mb-1">
              03 / OFFICIAL RESULTS
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Podium & Rankings</h2>
          </div>
          <button
            onClick={onOpenCandidateSearch}
            className="text-xs text-[#d7ff3f] hover:underline flex items-center gap-1 cursor-pointer"
          >
            Looking for someone specific? Search by chest number →
          </button>
        </div>

        {publishedResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publishedResults.map((r) => (
              <div
                key={r.id}
                className="p-5 rounded-2xl bg-neutral-900/90 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${
                      r.position === 1
                        ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                        : r.position === 2
                        ? "bg-slate-300/20 text-slate-200 border border-slate-300/40"
                        : r.position === 3
                        ? "bg-amber-700/20 text-amber-500 border border-amber-700/40"
                        : "bg-white/5 text-neutral-400"
                    }`}
                  >
                    #{r.position}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      {r.category} · {r.programme_name}
                    </span>
                    <strong className="text-base font-bold text-white block">
                      {r.recipient_name}
                    </strong>
                    {r.team_name && (
                      <span className="text-xs text-neutral-400 flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#d7ff3f]" />
                        {r.team_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xl font-black text-[#d7ff3f] block leading-none">
                    {r.total_score}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 mt-1 block">
                    {r.points} Team Pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
            <Trophy className="w-8 h-8 text-neutral-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">Results are being judged & verified</h3>
            <p className="text-xs text-neutral-400">
              Only results reviewed and published by festival coordinators appear live on this wall.
            </p>
          </div>
        )}
      </section>

      {/* Team Leaderboard */}
      {leaderboard.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="border-b border-white/10 pb-4">
            <span className="text-xs font-bold text-[#d7ff3f] uppercase tracking-wider block mb-1">
              04 / STANDINGS
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Team Championship Leaderboard</h2>
          </div>

          <div className="bg-neutral-900/90 rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
            {leaderboard.map((team, idx) => (
              <div
                key={team.id}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-white/5 font-black text-xs text-neutral-300 flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <div>
                    <strong className="text-base font-bold text-white">{team.name}</strong>
                    <span className="text-xs text-neutral-400 block font-mono">Code: {team.code}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden sm:flex items-center gap-3 text-xs">
                    <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 font-bold">🥇 {team.gold}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-300/10 text-slate-300 font-bold">🥈 {team.silver}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-700/10 text-amber-600 font-bold">🥉 {team.bronze}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-[#d7ff3f]">{team.points}</span>
                    <span className="text-[10px] text-neutral-500 uppercase block font-bold">Points</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Downloads & Resources */}
      {downloads.length > 0 && (
        <section id="downloads" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="border-b border-white/10 pb-4">
            <span className="text-xs font-bold text-[#d7ff3f] uppercase tracking-wider block mb-1">
              05 / OFFICIAL NOTICES
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Downloads & Guidelines</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {downloads.map((d) => (
              <div
                key={d.id}
                className="p-4 rounded-xl bg-neutral-900 border border-white/10 hover:border-[#d7ff3f]/50 transition-all flex items-start justify-between gap-3 group"
              >
                <div>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold uppercase text-[#d7ff3f]">
                    {d.file_type}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-1.5">{d.title}</h4>
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{d.description}</p>
                </div>
                <a
                  href={d.file_url}
                  download
                  className="p-2 rounded-lg bg-white/5 text-neutral-300 hover:text-black hover:bg-[#d7ff3f] transition-colors shrink-0"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gallery Mosaic */}
      {media.length > 0 && (
        <section id="gallery" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="border-b border-white/10 pb-4">
            <span className="text-xs font-bold text-[#d7ff3f] uppercase tracking-wider block mb-1">
              06 / FESTIVAL MEMORIES
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Atmosphere & Energy</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {media.map((m) => (
              <div
                key={m.id}
                className="relative rounded-2xl overflow-hidden aspect-[4/3] group border border-white/10"
              >
                <img
                  src={m.file_url}
                  alt={m.caption || "Festival Moment"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex items-end">
                  <span className="text-xs font-semibold text-white drop-shadow-md">
                    {m.caption || "Festival memory"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contact Organizers Form */}
      <section id="contact" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-[#d7ff3f] uppercase tracking-wider">07 / GET IN TOUCH</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Contact Festival Secretariat</h2>
          <p className="text-xs text-neutral-400">Questions about stage requirements, guidelines, or schedules?</p>
        </div>

        <form onSubmit={handleContactSubmit} className="p-6 rounded-2xl bg-neutral-900 border border-white/10 space-y-4">
          {contactSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Message received! The festival coordinators will get back to you shortly.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Your Name</label>
              <input
                type="text"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Email Address</label>
              <input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Subject</label>
            <input
              type="text"
              value={contactForm.subject}
              onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Message</label>
            <textarea
              rows={3}
              value={contactForm.message}
              onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={contactLoading}
            className="w-full py-3 rounded-xl bg-[#d7ff3f] text-black font-bold text-xs hover:bg-[#cbf530] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{contactLoading ? "Sending…" : "Send Message to Secretariat"}</span>
          </button>
        </form>
      </section>

      {/* Online Registration Modal */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#12161f] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white">Contestant Registration</h3>
                <p className="text-xs text-neutral-400">{event.name}</p>
              </div>
              <button
                onClick={() => setRegisterModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {regSuccess ? (
              <div className="my-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle className="w-5 h-5" />
                  <span>Registration Confirmed!</span>
                </div>
                <p>{regSuccess}</p>
                <button
                  type="button"
                  onClick={() => {
                    setRegisterModalOpen(false);
                    setRegSuccess(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4 mt-6">
                {regError && (
                  <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-xs border border-red-500/20">
                    {regError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Participant Full Name *
                  </label>
                  <input
                    type="text"
                    value={regForm.participantName}
                    onChange={(e) => setRegForm({ ...regForm, participantName: e.target.value })}
                    placeholder="e.g. Sreya Verma"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      placeholder="sreya@campus.edu"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Team / College</label>
                    <input
                      type="text"
                      value={regForm.teamName}
                      onChange={(e) => setRegForm({ ...regForm, teamName: e.target.value })}
                      placeholder="e.g. Falcons Arts Guild"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Programme</label>
                    <select
                      value={regForm.programmeId}
                      onChange={(e) => setRegForm({ ...regForm, programmeId: e.target.value })}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f]"
                    >
                      <option value="">-- Choose Programme --</option>
                      {programmes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.category})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full mt-2 py-3 rounded-xl bg-[#d7ff3f] text-black font-extrabold text-xs hover:bg-[#cbf530] transition-colors cursor-pointer shadow-md"
                >
                  {regLoading ? "Processing Entry…" : "Complete Registration & Get Chest No."}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
