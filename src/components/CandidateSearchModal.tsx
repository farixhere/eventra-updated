import React, { useState } from "react";
import { X, Search, Trophy, User, Users, Award, CheckCircle2 } from "lucide-react";
import { EventItem, ParticipantItem, ResultItem, CertificateItem } from "../types";

interface CandidateSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
  participants: ParticipantItem[];
  results: ResultItem[];
  certificates: CertificateItem[];
}

export const CandidateSearchModal: React.FC<CandidateSearchModalProps> = ({
  isOpen,
  onClose,
  event,
  participants,
  results,
  certificates,
}) => {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  if (!isOpen) return null;

  const cleanQuery = query.trim().toLowerCase();

  const matchedParticipant = participants.find((p) => {
    if (!cleanQuery) return false;
    return (
      String(p.chest_number) === cleanQuery ||
      p.participant_code.toLowerCase() === cleanQuery ||
      p.name.toLowerCase().includes(cleanQuery)
    );
  });

  const participantResults = matchedParticipant
    ? results.filter((r) => r.participant_id === matchedParticipant.id && r.published)
    : [];

  const participantCertificates = matchedParticipant
    ? certificates.filter((c) => c.participant_id === matchedParticipant.id)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#12161f] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#d7ff3f] text-black font-extrabold flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Candidate Result Lookup</h2>
              <p className="text-xs text-neutral-400">Search by Chest Number, Participant Code, or Name</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearched(true);
          }}
          className="mt-6"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearched(false);
              }}
              placeholder="e.g. 101, P-101, or Aarav"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#d7ff3f] placeholder-neutral-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#d7ff3f] text-black font-bold text-sm hover:bg-[#cbf530] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Search</span>
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400">
            <span>Quick tests:</span>
            {participants.slice(0, 4).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setQuery(String(p.chest_number));
                  setSearched(true);
                }}
                className="text-[#d7ff3f] hover:underline cursor-pointer"
              >
                #{p.chest_number} ({p.name.split(" ")[0]})
              </button>
            ))}
          </div>
        </form>

        {/* Results Box */}
        {matchedParticipant ? (
          <div className="mt-6 space-y-4">
            {/* Contestant Card */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#d7ff3f]/10 border border-[#d7ff3f]/30 text-[#d7ff3f] font-black text-xl flex items-center justify-center">
                  #{matchedParticipant.chest_number}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{matchedParticipant.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                    <span className="font-mono">{matchedParticipant.participant_code}</span>
                    {matchedParticipant.team_name && (
                      <span className="flex items-center gap-1 text-neutral-300">
                        <Users className="w-3 h-3 text-[#d7ff3f]" />
                        {matchedParticipant.team_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                Verified Contestant
              </span>
            </div>

            {/* Performance & Results */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#d7ff3f]" />
                <span>Published Event Results</span>
              </h4>

              {participantResults.length > 0 ? (
                <div className="space-y-2">
                  {participantResults.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                          {r.category} · {r.programme_name}
                        </span>
                        <strong className="text-sm text-white">
                          {r.position === 1 ? "🥇 1st Place Champion" : r.position === 2 ? "🥈 2nd Place Runner-Up" : r.position === 3 ? "🥉 3rd Place Finish" : `Rank #${r.position}`}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-[#d7ff3f] block">{r.total_score}</span>
                        <span className="text-[10px] text-neutral-400">{r.points} team pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/5 text-center text-xs text-neutral-400 border border-white/5">
                  No published results yet for this contestant. Results will appear here once verified and published by the organisers.
                </div>
              )}
            </div>

            {/* Certificates */}
            {participantCertificates.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#d7ff3f]" />
                  <span>Issued Certificates</span>
                </h4>
                <div className="space-y-2">
                  {participantCertificates.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between text-xs"
                    >
                      <div>
                        <strong className="text-white block">{c.title}</strong>
                        <span className="text-neutral-400 font-mono text-[11px]">{c.certificate_number}</span>
                      </div>
                      <span className="text-[#d7ff3f] font-mono font-bold">{c.verification_code}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : searched ? (
          <div className="mt-6 p-6 rounded-xl bg-white/5 border border-white/10 text-center text-sm text-neutral-400">
            No participant found matching "{query}". Check the chest number and try again.
          </div>
        ) : null}
      </div>
    </div>
  );
};
