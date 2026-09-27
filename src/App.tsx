/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { LandingView } from "./components/LandingView";
import { PublicEventView } from "./components/PublicEventView";
import { DashboardView } from "./components/DashboardView";
import { AuthModal } from "./components/AuthModal";
import { CertificateVerifyModal } from "./components/CertificateVerifyModal";
import { CandidateSearchModal } from "./components/CandidateSearchModal";
import { api } from "./api";
import {
  EventItem,
  ProgrammeItem,
  ScheduleItem,
  ResultItem,
  AnnouncementItem,
  DownloadItem,
  MediaAssetItem,
  LeaderboardItem,
  ParticipantItem,
  CertificateItem,
  UserSessionItem,
} from "./types";

export default function App() {
  const [currentView, setCurrentView] = useState<"landing" | "event" | "dashboard">("landing");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Active event public data
  const [programmes, setProgrammes] = useState<ProgrammeItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [media, setMedia] = useState<MediaAssetItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);

  // Auth & Modals
  const [user, setUser] = useState<UserSessionItem | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Load initial events and check auth session
  const refreshEvents = async () => {
    try {
      const res = await api.getEvents(false);
      setEvents(res.events || []);
      if (!selectedEvent && res.events && res.events.length > 0) {
        setSelectedEvent(res.events[0]);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  };

  const checkAuth = async () => {
    try {
      const res = await api.getMe();
      if (res.ok && res.user) {
        setUser(res.user);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshEvents();
    checkAuth();
  }, []);

  // Whenever selectedEvent changes, load its public and operational data
  useEffect(() => {
    if (!selectedEvent) return;

    Promise.all([
      api.getProgrammes(selectedEvent.id),
      api.getSchedules(selectedEvent.id),
      api.getResults(selectedEvent.id, true),
      api.getAnnouncements(selectedEvent.id),
      api.getDownloads(selectedEvent.id),
      api.getMedia(selectedEvent.id),
      api.getLeaderboard(selectedEvent.id),
      api.getParticipants(selectedEvent.id),
      api.getCertificates(selectedEvent.id),
    ])
      .then(([pr, sch, res, ann, dl, med, lb, part, cert]) => {
        setProgrammes(pr.programmes || []);
        setSchedules(sch.schedules || []);
        setResults(res.results || []);
        setAnnouncements(ann.announcements || []);
        setDownloads(dl.downloads || []);
        setMedia(med.media || []);
        setLeaderboard(lb.leaderboard || []);
        setParticipants(part.participants || []);
        setCertificates(cert.certificates || []);
      })
      .catch((err) => console.error("Error loading event items:", err));
  }, [selectedEvent?.id]);

  const handleLogin = async (email: string, password?: string) => {
    const res = await api.login(email, password);
    if (res.ok && res.user) {
      setUser(res.user);
      await refreshEvents();
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
  };

  const handleSwitchOrg = async (orgId: string) => {
    try {
      const res = await api.switchOrg(orgId);
      if (res.ok && res.user) {
        setUser(res.user);
        await refreshEvents();
      }
    } catch (err) {
      console.error("Failed to switch organization:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d11] text-neutral-100 flex flex-col font-sans selection:bg-[#d7ff3f] selection:text-black">
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        events={events}
        selectedEvent={selectedEvent}
        onSelectEvent={(ev) => {
          setSelectedEvent(ev);
          setCurrentView("event");
        }}
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenVerify={() => setVerifyModalOpen(true)}
        onOpenSearch={() => setSearchModalOpen(true)}
        onSwitchOrg={handleSwitchOrg}
      />

      <div className="flex-1">
        {currentView === "landing" && (
          <LandingView
            events={events}
            onSelectEvent={(ev) => {
              setSelectedEvent(ev);
              setCurrentView("event");
            }}
            onOpenDashboard={() => setCurrentView("dashboard")}
            onOpenVerify={() => setVerifyModalOpen(true)}
          />
        )}

        {currentView === "event" && selectedEvent && (
          <PublicEventView
            event={selectedEvent}
            programmes={programmes}
            schedules={schedules}
            results={results}
            announcements={announcements}
            downloads={downloads}
            media={media}
            leaderboard={leaderboard}
            onOpenCandidateSearch={() => setSearchModalOpen(true)}
            onOpenVerify={() => setVerifyModalOpen(true)}
          />
        )}

        {currentView === "dashboard" && (
          <DashboardView
            events={events}
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
            onRefreshEvents={refreshEvents}
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}
      </div>

      {/* Shared Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLogin={handleLogin}
        currentUser={user}
      />

      <CertificateVerifyModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
      />

      <CandidateSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        event={selectedEvent}
        participants={participants}
        results={results}
        certificates={certificates}
      />
    </div>
  );
}
