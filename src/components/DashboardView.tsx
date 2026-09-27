import React, { useState, useEffect } from "react";
import {
  Layers,
  Calendar,
  MapPin,
  Users,
  Trophy,
  Award,
  Clock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  FileCheck,
  Shield,
  Bell,
  Download,
  Activity,
  UserCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Gavel,
  Radio,
  FileText,
  Sliders,
  CheckSquare,
  CreditCard,
  Building,
  Sparkles,
} from "lucide-react";
import {
  EventItem,
  VenueItem,
  TeamItem,
  ParticipantItem,
  ProgrammeItem,
  ProgrammeCriterionItem,
  RegistrationItem,
  ScheduleItem,
  JudgeAssignmentItem,
  JudgeScoreItem,
  ResultItem,
  CertificateItem,
  IdCardItem,
  AnnouncementItem,
  DownloadItem,
  MediaAssetItem,
  AuditLogItem,
  UserSessionItem,
  SubscriptionPlanItem,
  OrganizationSubscriptionItem,
  TenantUsageItem,
} from "../types";
import { api } from "../api";

interface DashboardViewProps {
  events: EventItem[];
  selectedEvent: EventItem | null;
  onSelectEvent: (event: EventItem) => void;
  onRefreshEvents: () => Promise<void>;
  user: UserSessionItem | null;
  onOpenAuth: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  events,
  selectedEvent,
  onSelectEvent,
  onRefreshEvents,
  user,
  onOpenAuth,
}) => {
  // Navigation section
  const [section, setSection] = useState<string>("overview");

  // Local state for event-scoped data
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeItem[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [judgeAssignments, setJudgeAssignments] = useState<JudgeAssignmentItem[]>([]);
  const [judgeScores, setJudgeScores] = useState<JudgeScoreItem[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [idCards, setIdCards] = useState<IdCardItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // Subscriptions & Multi-Tenant Architecture
  const [subscription, setSubscription] = useState<OrganizationSubscriptionItem | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlanItem | null>(null);
  const [tenantUsage, setTenantUsage] = useState<TenantUsageItem | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [adminOrgList, setAdminOrgList] = useState<any[]>([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Forms
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    name: "",
    description: "",
    tagline: "",
    location: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    primaryColor: "#d7ff3f",
    isPublic: true,
    registrationOpen: true,
  });

  const [showVenueModal, setShowVenueModal] = useState(false);
  const [venueForm, setVenueForm] = useState({ name: "", location: "", capacity: "" });

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: "", code: "" });

  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [participantForm, setParticipantForm] = useState({ name: "", email: "", phone: "", teamId: "", chestNumber: "" });

  const [showProgrammeModal, setShowProgrammeModal] = useState(false);
  const [programmeForm, setProgrammeForm] = useState({
    name: "",
    category: "Dance",
    type: "team",
    maxParticipants: "10",
    durationMinutes: "30",
    description: "",
  });

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    programmeId: "",
    venueId: "",
    startsAt: "",
    endsAt: "",
    notes: "",
  });

  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [criteriaProgrammeId, setCriteriaProgrammeId] = useState("");
  const [programmeCriteriaList, setProgrammeCriteriaList] = useState<ProgrammeCriterionItem[]>([]);
  const [criterionForm, setCriterionForm] = useState({ name: "", maxScore: "30", weight: "1.0", description: "" });

  // Judge scoring state
  const [selectedScoreProg, setSelectedScoreProg] = useState("");
  const [scoreEntryType, setScoreEntryType] = useState<"participant" | "team">("team");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [judgeScoreInputs, setJudgeScoreInputs] = useState<Record<string, number>>({});

  // Correction state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<ResultItem | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionScore, setCorrectionScore] = useState("");
  const [correctionPosition, setCorrectionPosition] = useState("");

  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annForm, setAnnForm] = useState({ title: "", body: "" });

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadForm, setDownloadForm] = useState({ title: "", description: "", fileType: "PDF", fileUrl: "#" });

  const [judgeAssignEmail, setJudgeAssignEmail] = useState("");
  const [judgeAssignProgId, setJudgeAssignProgId] = useState("");

  // Load active event data
  const loadEventData = async () => {
    if (!selectedEvent) return;
    setLoading(true);
    try {
      const [v, t, p, pr, reg, sch, ja, js, res, certs, idc, ann, dl, logs, h] = await Promise.all([
        api.getVenues(selectedEvent.id),
        api.getTeams(selectedEvent.id),
        api.getParticipants(selectedEvent.id),
        api.getProgrammes(selectedEvent.id),
        api.getRegistrations(selectedEvent.id),
        api.getSchedules(selectedEvent.id),
        api.getJudgeAssignments(selectedEvent.id),
        api.getJudgeScores(selectedEvent.id),
        api.getResults(selectedEvent.id, false),
        api.getCertificates(selectedEvent.id),
        api.getIdCards(selectedEvent.id),
        api.getAnnouncements(selectedEvent.id),
        api.getDownloads(selectedEvent.id),
        api.getAuditLogs(selectedEvent.id),
        api.getHealth(),
      ]);

      setVenues(v.venues || []);
      setTeams(t.teams || []);
      setParticipants(p.participants || []);
      setProgrammes(pr.programmes || []);
      setRegistrations(reg.registrations || []);
      setSchedules(sch.schedules || []);
      setJudgeAssignments(ja.assignments || []);
      setJudgeScores(js.scores || []);
      setResults(res.results || []);
      setCertificates(certs.certificates || []);
      setIdCards(idc.idCards || []);
      setAnnouncements(ann.announcements || []);
      setDownloads(dl.downloads || []);
      setAuditLogs(logs.logs || []);
      setHealthStatus(h);

      if (pr.programmes?.length > 0 && !selectedScoreProg) {
        setSelectedScoreProg(pr.programmes[0].id);
      }

      await loadSubscriptionData();
    } catch (err: any) {
      console.error("Failed to load event data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionData = async () => {
    try {
      const activeOrgId = user?.activeOrgId || selectedEvent?.organization_id;
      if (activeOrgId) {
        const subRes = await api.getOrgSubscription(activeOrgId);
        setSubscription(subRes.subscription);
        setCurrentPlan(subRes.plan);
        setTenantUsage(subRes.usage);
      }
      const plansRes = await api.getPlans();
      setPlans(plansRes.plans || []);

      if (user?.isSuperAdmin) {
        const adminRes = await api.getAdminSubscriptions();
        setAdminOrgList(adminRes.organizations || []);
      }
    } catch (err) {
      console.warn("Could not load subscription details:", err);
    }
  };

  const handleUpgradePlan = async (planCode: string) => {
    const orgId = user?.activeOrgId || selectedEvent?.organization_id;
    if (!orgId) return;
    setSubscriptionLoading(true);
    try {
      const res = await api.updateOrgSubscription(orgId, planCode);
      setActionSuccess(res.message);
      await loadSubscriptionData();
    } catch (err: any) {
      setActionError(err.message || "Failed to update subscription");
    } finally {
      setSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    loadEventData();
  }, [selectedEvent?.id]);

  // Load criteria when scoring programme changes
  useEffect(() => {
    if (!selectedScoreProg) return;
    api.getProgrammeCriteria(selectedScoreProg)
      .then((res) => {
        setProgrammeCriteriaList(res.criteria || []);
      })
      .catch(() => {});
  }, [selectedScoreProg]);

  // Message timer
  useEffect(() => {
    if (actionSuccess || actionError) {
      const timer = setTimeout(() => {
        setActionSuccess(null);
        setActionError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess, actionError]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createEvent(eventForm);
      setShowEventModal(false);
      await onRefreshEvents();
      onSelectEvent(res.event);
      setActionSuccess(`Festival "${res.event.name}" created successfully!`);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    try {
      await api.createVenue({
        eventId: selectedEvent.id,
        name: venueForm.name,
        location: venueForm.location,
        capacity: venueForm.capacity ? Number(venueForm.capacity) : undefined,
      });
      setShowVenueModal(false);
      setVenueForm({ name: "", location: "", capacity: "" });
      loadEventData();
      setActionSuccess("Venue added successfully.");
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    try {
      await api.createTeam({
        eventId: selectedEvent.id,
        name: teamForm.name,
        code: teamForm.code,
      });
      setShowTeamModal(false);
      setTeamForm({ name: "", code: "" });
      loadEventData();
      setActionSuccess("Team registered successfully.");
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCreateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    try {
      await api.createParticipant({
        eventId: selectedEvent.id,
        teamId: participantForm.teamId || null,
        name: participantForm.name,
        email: participantForm.email || undefined,
        phone: participantForm.phone || undefined,
        chestNumber: participantForm.chestNumber ? Number(participantForm.chestNumber) : undefined,
      });
      setShowParticipantModal(false);
      setParticipantForm({ name: "", email: "", phone: "", teamId: "", chestNumber: "" });
      loadEventData();
      setActionSuccess("Participant registered with official chest number.");
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCreateProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    try {
      await api.createProgramme({
        eventId: selectedEvent.id,
        name: programmeForm.name,
        category: programmeForm.category,
        type: programmeForm.type,
        maxParticipants: Number(programmeForm.maxParticipants),
        durationMinutes: Number(programmeForm.durationMinutes),
        description: programmeForm.description,
      });
      setShowProgrammeModal(false);
      setProgrammeForm({ name: "", category: "Dance", type: "team", maxParticipants: "10", durationMinutes: "30", description: "" });
      loadEventData();
      setActionSuccess("Programme added to the festival lineup.");
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSchedule({
        programmeId: scheduleForm.programmeId,
        venueId: scheduleForm.venueId,
        startsAt: scheduleForm.startsAt,
        endsAt: scheduleForm.endsAt || undefined,
        notes: scheduleForm.notes || undefined,
      });
      setShowScheduleModal(false);
      setScheduleForm({ programmeId: "", venueId: "", startsAt: "", endsAt: "", notes: "" });
      loadEventData();
      setActionSuccess("Schedule allocated with conflict detection cleared.");
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleAddCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!criteriaProgrammeId) return;
    try {
      await api.createProgrammeCriterion({
        programmeId: criteriaProgrammeId,
        name: criterionForm.name,
        maxScore: Number(criterionForm.maxScore),
        weight: Number(criterionForm.weight),
        description: criterionForm.description,
      });
      setCriterionForm({ name: "", maxScore: "30", weight: "1.0", description: "" });
      const res = await api.getProgrammeCriteria(criteriaProgrammeId);
      setProgrammeCriteriaList(res.criteria || []);
      setActionSuccess("Judging criterion added.");
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleSubmitJudgeScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !selectedScoreProg || !selectedEntryId) {
      setActionError("Select both a programme and contestant entry.");
      return;
    }
    try {
      const isTeam = scoreEntryType === "team";
      await api.submitJudgeScore({
        eventId: selectedEvent.id,
        programmeId: selectedScoreProg,
        teamId: isTeam ? selectedEntryId : null,
        participantId: isTeam ? null : selectedEntryId,
        criteriaScores: judgeScoreInputs,
      });
      setJudgeScoreInputs({});
      setSelectedEntryId("");
      loadEventData();
      setActionSuccess("Judge marks successfully submitted and logged.");
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleVerifyResult = async (programmeId: string, participantId: string | null, teamId: string | null) => {
    if (!selectedEvent) return;
    try {
      const res = await api.verifyResult({
        eventId: selectedEvent.id,
        programmeId,
        participantId,
        teamId,
      });
      loadEventData();
      setActionSuccess(`Result verified! Average score: ${res.averageScore.toFixed(2)} (Assigned Rank: #${res.result.position})`);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handlePublishResult = async (resultId: string) => {
    if (!selectedEvent) return;
    try {
      await api.publishResult(selectedEvent.id, resultId);
      loadEventData();
      setActionSuccess("Result published live! Team standings and digital certificates generated.");
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCorrectResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !correctionTarget || !correctionReason.trim()) {
      setActionError("Audit correction reason is mandatory.");
      return;
    }
    try {
      await api.correctResult({
        eventId: selectedEvent.id,
        resultId: correctionTarget.id,
        reason: correctionReason.trim(),
        totalScore: correctionScore ? Number(correctionScore) : undefined,
        position: correctionPosition ? Number(correctionPosition) : undefined,
      });
      setShowCorrectionModal(false);
      setCorrectionTarget(null);
      setCorrectionReason("");
      loadEventData();
      setActionSuccess("Result corrected and audited in permanent security log.");
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleAssignJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !judgeAssignEmail || !judgeAssignProgId) return;
    try {
      await api.createJudgeAssignment({
        eventId: selectedEvent.id,
        programmeId: judgeAssignProgId,
        email: judgeAssignEmail,
      });
      setJudgeAssignEmail("");
      loadEventData();
      setActionSuccess("Judge assigned to programme.");
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleGenerateIdCard = async (participantId: string) => {
    if (!selectedEvent) return;
    try {
      await api.createIdCard(selectedEvent.id, participantId);
      loadEventData();
      setActionSuccess("Participant ID card generated.");
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    try {
      await api.createAnnouncement({
        eventId: selectedEvent.id,
        title: annForm.title,
        body: annForm.body,
      });
      setShowAnnModal(false);
      setAnnForm({ title: "", body: "" });
      loadEventData();
      setActionSuccess("Announcement broadcasted live to festival desk.");
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCreateDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    try {
      await api.createDownload({
        eventId: selectedEvent.id,
        title: downloadForm.title,
        description: downloadForm.description,
        fileType: downloadForm.fileType,
        fileUrl: downloadForm.fileUrl,
      });
      setShowDownloadModal(false);
      setDownloadForm({ title: "", description: "", fileType: "PDF", fileUrl: "#" });
      loadEventData();
      setActionSuccess("Download document published.");
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  if (!selectedEvent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <Layers className="w-12 h-12 text-[#d7ff3f] mx-auto" />
          <h2 className="text-2xl font-black text-white">No Festival Selected</h2>
          <p className="text-xs text-neutral-400">
            Please choose or create an event to access the organizer command center.
          </p>
          <button
            onClick={() => setShowEventModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[#d7ff3f] text-black font-bold text-xs"
          >
            Create New Festival
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090b0e] text-neutral-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#0e1117] border-r border-white/10 p-4 shrink-0 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Active Event Card */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-[#d7ff3f] tracking-widest block mb-0.5">
              ACTIVE FESTIVAL
            </span>
            <div className="flex items-center justify-between">
              <strong className="text-sm font-extrabold text-white truncate block">
                {selectedEvent.name}
              </strong>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                {selectedEvent.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-2 truncate">
              <MapPin className="w-3 h-3 text-[#d7ff3f] shrink-0" />
              <span className="truncate">{selectedEvent.location}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs">
            <span className="px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">
              Command Suite
            </span>

            {[
              { id: "overview", label: "Control Center", icon: Activity },
              { id: "events", label: "Festival Setup", icon: Sliders },
              { id: "venues", label: "Venues & Stages", icon: MapPin },
              { id: "teams", label: "Teams & Colleges", icon: Users },
              { id: "participants", label: "Participants & Chests", icon: UserCheck },
              { id: "programmes", label: "Programmes Lineup", icon: Layers },
              { id: "schedules", label: "Timetable & Conflicts", icon: Clock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSection(tab.id)}
                className={`w-full px-3 py-2 rounded-xl font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  section === tab.id
                    ? "bg-[#d7ff3f] text-black font-bold shadow-sm"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}

            <span className="px-3 pt-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">
              Scoring & Results
            </span>

            {[
              { id: "criteria", label: "Judging Criteria", icon: Sliders },
              { id: "scoring", label: "Judge Scoring Portal", icon: Gavel },
              { id: "verification", label: "Coordinator Verification", icon: CheckSquare },
              { id: "publish", label: "Publish Results Desk", icon: Trophy },
              { id: "corrections", label: "Result Corrections", icon: Edit2 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSection(tab.id)}
                className={`w-full px-3 py-2 rounded-xl font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  section === tab.id
                    ? "bg-[#d7ff3f] text-black font-bold shadow-sm"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}

            <span className="px-3 pt-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">
              Operations
            </span>

            {[
              { id: "certificates", label: "Certificates & IDs", icon: Award },
              { id: "broadcast", label: "Notices & Broadcast", icon: Radio },
              { id: "access", label: "Roles & Judge Assign", icon: Shield },
              { id: "subscriptions", label: "Subscriptions & Quotas", icon: CreditCard },
              { id: "audit", label: "Audit Trails", icon: FileText },
              { id: "diagnostics", label: "System Health", icon: AlertCircle },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSection(tab.id)}
                className={`w-full px-3 py-2 rounded-xl font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  section === tab.id
                    ? "bg-[#d7ff3f] text-black font-bold shadow-sm"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* User Info & Refresh */}
        <div className="pt-4 border-t border-white/10 mt-6 space-y-3">
          <button
            onClick={loadEventData}
            disabled={loading}
            className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-neutral-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Live Data</span>
          </button>

          <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
            <span className="truncate">{user?.name || "Guest Organiser"}</span>
            <span className="px-1.5 py-0.5 rounded bg-white/10 font-bold uppercase text-[9px] text-[#d7ff3f]">
              {user?.globalRole || "Admin"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Command Workspace */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl overflow-y-auto">
        {/* Banner feedback */}
        {actionSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* SECTION: OVERVIEW */}
        {section === "overview" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-[#d7ff3f] uppercase tracking-wider block">
                  COMMAND CENTER
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white">{selectedEvent.name}</h1>
                <p className="text-xs text-neutral-400 mt-0.5">{selectedEvent.tagline}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowProgrammeModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#d7ff3f] text-black font-bold text-xs flex items-center gap-1.5 hover:bg-[#cbf530] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Programme</span>
                </button>
                <button
                  onClick={() => setShowParticipantModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Participant</span>
                </button>
                <button
                  onClick={() => setSection("scoring")}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                >
                  <Gavel className="w-3.5 h-3.5 text-[#d7ff3f]" />
                  <span>Enter Scores</span>
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-neutral-900 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Programmes</span>
                <strong className="text-2xl font-black text-white block">{programmes.length}</strong>
                <span className="text-[11px] text-neutral-400">Total in lineup</span>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-900 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Participants</span>
                <strong className="text-2xl font-black text-[#d7ff3f] block">{participants.length}</strong>
                <span className="text-[11px] text-neutral-400">Chests allocated</span>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-900 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Teams / Guilds</span>
                <strong className="text-2xl font-black text-white block">{teams.length}</strong>
                <span className="text-[11px] text-neutral-400">Institutions</span>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-900 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Published Results</span>
                <strong className="text-2xl font-black text-emerald-400 block">
                  {results.filter((r) => r.published).length}
                </strong>
                <span className="text-[11px] text-neutral-400">Live on public wall</span>
              </div>
            </div>

            {/* Organization Subscription & Quotas Widget */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-neutral-900 to-[#12161f] border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#d7ff3f]/10 text-[#d7ff3f] flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">
                        {currentPlan?.name || "14-Day Free Trial Workspace"}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                          subscription?.status === "active"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : subscription?.status === "trialing"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-white/10 text-neutral-300"
                        }`}
                      >
                        {subscription?.status || "trialing"}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {subscription?.trial_ends_at
                        ? `Trial active — renewal review on ${new Date(subscription.trial_ends_at).toLocaleDateString()}`
                        : `SaaS plan active — payment gateway pending integration`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSection("subscriptions")}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <span>Manage Quotas & Tiers</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#d7ff3f]" />
                </button>
              </div>

              {/* Quota Progress Gauges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/5">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-neutral-400">Festival Events</span>
                    <span className="text-white font-semibold">
                      {tenantUsage?.eventsCount || 0} / {tenantUsage?.eventsMax || 1}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#d7ff3f] h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          ((tenantUsage?.eventsCount || 0) / (tenantUsage?.eventsMax || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-neutral-400">Programmes</span>
                    <span className="text-white font-semibold">
                      {tenantUsage?.programmesCount || 0} / {tenantUsage?.programmesMax || 10}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-sky-400 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          ((tenantUsage?.programmesCount || 0) / (tenantUsage?.programmesMax || 10)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-neutral-400">Contestants</span>
                    <span className="text-white font-semibold">
                      {tenantUsage?.participantsCount || 0} / {tenantUsage?.participantsMax || 100}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-400 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          ((tenantUsage?.participantsCount || 0) / (tenantUsage?.participantsMax || 100)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-neutral-400">Judges</span>
                    <span className="text-white font-semibold">
                      {tenantUsage?.judgesCount || 0} / {tenantUsage?.judgesMax || 5}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          ((tenantUsage?.judgesCount || 0) / (tenantUsage?.judgesMax || 5)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Activity Stream & Upcoming */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Upcoming Schedules */}
              <div className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#d7ff3f]" />
                    <span>Running Timetable</span>
                  </h3>
                  <button onClick={() => setSection("schedules")} className="text-xs text-[#d7ff3f] hover:underline cursor-pointer">
                    Manage →
                  </button>
                </div>

                <div className="space-y-2.5">
                  {schedules.slice(0, 4).map((s) => (
                    <div key={s.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-white block">{s.programme_name}</strong>
                        <span className="text-neutral-400">{s.venue_name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-white/10 text-neutral-300 font-mono">
                        {new Date(s.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                  {schedules.length === 0 && (
                    <p className="text-xs text-neutral-500">No schedules configured yet.</p>
                  )}
                </div>
              </div>

              {/* Recent Audit Logs */}
              <div className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#d7ff3f]" />
                    <span>Recent Audit Activity</span>
                  </h3>
                  <button onClick={() => setSection("audit")} className="text-xs text-[#d7ff3f] hover:underline cursor-pointer">
                    Full Log →
                  </button>
                </div>

                <div className="space-y-2.5">
                  {auditLogs.slice(0, 4).map((l) => (
                    <div key={l.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-white block font-mono">{l.action}</strong>
                        <span className="text-neutral-400 text-[10px]">Entity: {l.entity_type || "System"}</span>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {new Date(l.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <p className="text-xs text-neutral-500">No activity logged yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION: PROGRAMMES */}
        {section === "programmes" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Programmes Lineup</h2>
                <p className="text-xs text-neutral-400">Manage festival competitions, rules, and capacities</p>
              </div>
              <button
                onClick={() => setShowProgrammeModal(true)}
                className="px-4 py-2 rounded-xl bg-[#d7ff3f] text-black font-bold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Programme</span>
              </button>
            </div>

            <div className="bg-neutral-900 rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
              {programmes.map((p) => (
                <div key={p.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-neutral-300 text-[10px] font-bold uppercase">
                        {p.category}
                      </span>
                      <span className="text-xs text-[#d7ff3f] font-mono">
                        {p.type} {p.max_participants > 1 ? `(max ${p.max_participants})` : ""}
                      </span>
                    </div>
                    <strong className="text-base font-bold text-white block mt-1">{p.name}</strong>
                    <p className="text-xs text-neutral-400 mt-0.5">{p.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCriteriaProgrammeId(p.id);
                        setShowCriteriaModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[#d7ff3f]" />
                      <span>Criteria</span>
                    </button>
                    <button
                      onClick={async () => {
                        await api.deleteProgramme(p.id);
                        loadEventData();
                      }}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: PARTICIPANTS */}
        {section === "participants" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Participants Directory</h2>
                <p className="text-xs text-neutral-400">Chest numbers and registration credentials</p>
              </div>
              <button
                onClick={() => setShowParticipantModal(true)}
                className="px-4 py-2 rounded-xl bg-[#d7ff3f] text-black font-bold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Contestant</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {participants.map((p) => {
                const hasCard = idCards.some((c) => c.participant_id === p.id);
                return (
                  <div key={p.id} className="p-4 rounded-xl bg-neutral-900 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-[#d7ff3f]/10 text-[#d7ff3f] font-black text-base flex items-center justify-center border border-[#d7ff3f]/30">
                        #{p.chest_number}
                      </div>
                      <span className="font-mono text-xs text-neutral-400">{p.participant_code}</span>
                    </div>
                    <div>
                      <strong className="text-sm font-bold text-white block">{p.name}</strong>
                      <span className="text-xs text-neutral-400 block">{p.team_name || "Independent"}</span>
                      {p.email && <span className="text-[11px] text-neutral-500 block truncate">{p.email}</span>}
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                      {!hasCard ? (
                        <button
                          onClick={() => handleGenerateIdCard(p.id)}
                          className="text-xs text-[#d7ff3f] hover:underline"
                        >
                          Generate ID Card
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-bold uppercase">ID Issued</span>
                      )}
                      <button
                        onClick={async () => {
                          await api.deleteParticipant(p.id);
                          loadEventData();
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION: VENUES */}
        {section === "venues" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Venues & Stages</h2>
                <p className="text-xs text-neutral-400">Campus stages, halls and seating capacity</p>
              </div>
              <button
                onClick={() => setShowVenueModal(true)}
                className="px-4 py-2 rounded-xl bg-[#d7ff3f] text-black font-bold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Venue</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {venues.map((v) => (
                <div key={v.id} className="p-4 rounded-xl bg-neutral-900 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-sm font-bold text-white">{v.name}</strong>
                    <button
                      onClick={async () => {
                        await api.deleteVenue(v.id);
                        loadEventData();
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-neutral-400">{v.location || "Location not specified"}</p>
                  <span className="text-[11px] text-[#d7ff3f] block">
                    Capacity: {v.capacity ? `${v.capacity} seats` : "Open air"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: TEAMS */}
        {section === "teams" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Colleges & Teams</h2>
                <p className="text-xs text-neutral-400">Institutional teams and total championship points</p>
              </div>
              <button
                onClick={() => setShowTeamModal(true)}
                className="px-4 py-2 rounded-xl bg-[#d7ff3f] text-black font-bold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Team</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {teams.map((t) => (
                <div key={t.id} className="p-4 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-between">
                  <div>
                    <strong className="text-sm font-bold text-white block">{t.name}</strong>
                    <span className="font-mono text-xs text-neutral-400">Code: {t.code}</span>
                    <span className="text-xs font-bold text-[#d7ff3f] block mt-1">
                      {t.points || 0} Points
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      await api.deleteTeam(t.id);
                      loadEventData();
                    }}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: TIMETABLE & CONFLICTS */}
        {section === "schedules" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Timetable Planner</h2>
                <p className="text-xs text-neutral-400">Stage running orders with automated conflict check</p>
              </div>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="px-4 py-2 rounded-xl bg-[#d7ff3f] text-black font-bold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Slot</span>
              </button>
            </div>

            <div className="bg-neutral-900 rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
              {schedules.map((s) => (
                <div key={s.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#d7ff3f]">
                        {new Date(s.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <strong className="text-sm text-white">{s.programme_name}</strong>
                    </div>
                    <span className="text-neutral-400 mt-0.5 block">{s.venue_name}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-neutral-300 uppercase text-[10px]">
                      {s.status}
                    </span>
                    <button
                      onClick={async () => {
                        await api.deleteSchedule(s.id);
                        loadEventData();
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: JUDGING CRITERIA */}
        {section === "criteria" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Competition Judging Criteria</h2>
                <p className="text-xs text-neutral-400">Configure weighting and maximum scores per criterion</p>
              </div>
            </div>

            {/* Select Programme */}
            <div className="p-4 rounded-xl bg-neutral-900 border border-white/10 flex items-center gap-4">
              <label className="text-xs font-bold text-neutral-300">Select Programme:</label>
              <select
                value={selectedScoreProg}
                onChange={(e) => setSelectedScoreProg(e.target.value)}
                className="bg-neutral-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                {programmes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                ))}
              </select>
            </div>

            {/* Criteria List */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {programmeCriteriaList.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl bg-neutral-900 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <strong className="text-sm font-bold text-white">{c.name}</strong>
                      <button
                        onClick={async () => {
                          await api.deleteProgrammeCriterion(c.id);
                          const res = await api.getProgrammeCriteria(selectedScoreProg);
                          setProgrammeCriteriaList(res.criteria || []);
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-neutral-400">{c.description || "General performance metric"}</p>
                    <div className="flex items-center justify-between text-xs text-neutral-300 pt-2 border-t border-white/10">
                      <span>Max Marks: <strong className="text-[#d7ff3f]">{c.max_score}</strong></span>
                      <span>Weight: <strong className="text-white">{c.weight}x</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Criterion Inline Form */}
              <form onSubmit={handleAddCriterion} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  Add Criterion to {programmes.find((p) => p.id === selectedScoreProg)?.name}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={criterionForm.name}
                    onChange={(e) => setCriterionForm({ ...criterionForm, name: e.target.value })}
                    placeholder="Criterion Name (e.g. Stage Presence)"
                    className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    required
                  />
                  <input
                    type="number"
                    value={criterionForm.maxScore}
                    onChange={(e) => setCriterionForm({ ...criterionForm, maxScore: e.target.value })}
                    placeholder="Max Marks (e.g. 30)"
                    className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    required
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={criterionForm.weight}
                    onChange={(e) => setCriterionForm({ ...criterionForm, weight: e.target.value })}
                    placeholder="Weight (e.g. 1.0)"
                    className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <button
                  type="submit"
                  onClick={() => setCriteriaProgrammeId(selectedScoreProg)}
                  className="px-4 py-2 rounded-lg bg-[#d7ff3f] text-black font-bold text-xs"
                >
                  Save Criterion
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SECTION: SCORING (JUDGE WORKSPACE) */}
        {section === "scoring" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Judge Scoring Workspace</h2>
                <p className="text-xs text-neutral-400">Enter marks for assigned contestants on verified criteria</p>
              </div>
              <span className="text-xs text-[#d7ff3f] font-mono">
                Juror: {user?.email || "judge.priya@eventra.org"}
              </span>
            </div>

            <form onSubmit={handleSubmitJudgeScore} className="p-6 rounded-2xl bg-neutral-900 border border-white/10 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Select Programme</label>
                  <select
                    value={selectedScoreProg}
                    onChange={(e) => setSelectedScoreProg(e.target.value)}
                    className="w-full bg-neutral-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  >
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Entry Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setScoreEntryType("team")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border cursor-pointer ${
                        scoreEntryType === "team"
                          ? "bg-[#d7ff3f] text-black border-[#d7ff3f]"
                          : "bg-white/5 text-neutral-400 border-white/10"
                      }`}
                    >
                      Team
                    </button>
                    <button
                      type="button"
                      onClick={() => setScoreEntryType("participant")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border cursor-pointer ${
                        scoreEntryType === "participant"
                          ? "bg-[#d7ff3f] text-black border-[#d7ff3f]"
                          : "bg-white/5 text-neutral-400 border-white/10"
                      }`}
                    >
                      Individual Participant
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Select {scoreEntryType === "team" ? "Team" : "Participant"}
                </label>
                <select
                  value={selectedEntryId}
                  onChange={(e) => setSelectedEntryId(e.target.value)}
                  className="w-full bg-neutral-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  required
                >
                  <option value="">-- Choose Entry --</option>
                  {scoreEntryType === "team"
                    ? teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)
                    : participants.map((p) => <option key={p.id} value={p.id}>{p.name} (Chest #{p.chest_number})</option>)}
                </select>
              </div>

              {/* Dynamic Criteria Scoring Form */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Scoring Breakdown
                </h4>

                {programmeCriteriaList.length > 0 ? (
                  <div className="space-y-3">
                    {programmeCriteriaList.map((crit) => (
                      <div key={crit.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <strong className="text-sm font-bold text-white block">{crit.name}</strong>
                          <span className="text-xs text-neutral-400">Max: {crit.max_score} marks · Weight: {crit.weight}x</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={crit.max_score}
                            value={judgeScoreInputs[crit.id] ?? ""}
                            onChange={(e) =>
                              setJudgeScoreInputs({ ...judgeScoreInputs, [crit.id]: Number(e.target.value) })
                            }
                            placeholder={`0 — ${crit.max_score}`}
                            className="w-28 bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-bold text-[#d7ff3f] text-center"
                            required
                          />
                          <span className="text-xs text-neutral-400">/ {crit.max_score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white/5 text-xs text-neutral-400 text-center">
                    No criteria defined yet. Enter total marks directly:
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Total Score (0-100)"
                      className="mt-2 block mx-auto bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-center font-bold text-[#d7ff3f]"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#d7ff3f] text-black font-extrabold text-xs hover:bg-[#cbf530] transition-colors shadow-lg cursor-pointer"
              >
                Submit Score to Coordinator Desk
              </button>
            </form>
          </div>
        )}

        {/* SECTION: COORDINATOR VERIFICATION */}
        {section === "verification" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Coordinator Verification Desk</h2>
                <p className="text-xs text-neutral-400">Audit submitted judge marks, calculate averages and assign ranks</p>
              </div>
            </div>

            <div className="space-y-4">
              {judgeScores.map((js) => (
                <div key={js.id} className="p-5 rounded-2xl bg-neutral-900 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase">
                        {js.status}
                      </span>
                      <span className="text-xs text-neutral-400 font-mono">Juror: {js.judge_email}</span>
                    </div>
                    <strong className="text-base font-bold text-white block mt-1">
                      {js.team_id ? teams.find((t) => t.id === js.team_id)?.name : participants.find((p) => p.id === js.participant_id)?.name}
                    </strong>
                    <span className="text-xs text-[#d7ff3f]">
                      Programme: {programmes.find((p) => p.id === js.programme_id)?.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xl font-black text-[#d7ff3f] block">{js.total_score}</span>
                      <span className="text-[10px] text-neutral-500 uppercase font-bold">Total Marks</span>
                    </div>

                    <button
                      onClick={() => handleVerifyResult(js.programme_id, js.participant_id, js.team_id)}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Verify & Rank</span>
                    </button>
                  </div>
                </div>
              ))}

              {judgeScores.length === 0 && (
                <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-neutral-400">
                  No submitted judge scores pending review.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: PUBLISH RESULTS */}
        {section === "publish" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Publish Results Desk</h2>
                <p className="text-xs text-neutral-400">Push verified results live to the official festival website</p>
              </div>
            </div>

            <div className="bg-neutral-900 rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
              {results.map((r) => (
                <div key={r.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 text-neutral-300 font-black text-base flex items-center justify-center">
                      #{r.position}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.published ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-300"
                        }`}>
                          {r.published ? "● LIVE" : "VERIFIED (UNPUBLISHED)"}
                        </span>
                        <span className="text-xs text-neutral-400">{r.category} · {r.programme_name}</span>
                      </div>
                      <strong className="text-base font-bold text-white block mt-0.5">{r.recipient_name}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-lg font-black text-[#d7ff3f] block">{r.total_score}</span>
                      <span className="text-[10px] text-neutral-500 uppercase">{r.points} Team Pts</span>
                    </div>

                    {!r.published ? (
                      <button
                        onClick={() => handlePublishResult(r.id)}
                        className="px-4 py-2 rounded-xl bg-[#d7ff3f] text-black font-extrabold text-xs hover:bg-[#cbf530] transition-colors cursor-pointer"
                      >
                        Publish Live ↗
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setCorrectionTarget(r);
                          setCorrectionScore(String(r.total_score));
                          setCorrectionPosition(String(r.position));
                          setShowCorrectionModal(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold"
                      >
                        Audited Correction
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: CORRECTIONS */}
        {section === "corrections" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">Result Corrections & Audit</h2>
              <p className="text-xs text-neutral-400">Audited modifications to published scores with mandatory rationale</p>
            </div>

            <div className="space-y-3">
              {results.filter((r) => r.correction_reason).map((r) => (
                <div key={r.id} className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-sm">{r.recipient_name} — {r.programme_name}</strong>
                    <span className="font-mono text-neutral-400 text-[10px]">
                      {new Date(r.corrected_at || "").toLocaleString()}
                    </span>
                  </div>
                  <p className="text-amber-300 font-medium">Audit Reason: {r.correction_reason}</p>
                </div>
              ))}
              {results.filter((r) => r.correction_reason).length === 0 && (
                <p className="text-xs text-neutral-500">No corrections made yet. All published marks are original.</p>
              )}
            </div>
          </div>
        )}

        {/* SECTION: CERTIFICATES & ID CARDS */}
        {section === "certificates" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-black text-white">Certificates & ID Cards</h2>
              <p className="text-xs text-neutral-400">Verifiable credentials, auto-generated upon publishing</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div key={cert.id} className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                      {cert.certificate_type}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#d7ff3f]">
                      {cert.verification_code}
                    </span>
                  </div>
                  <div>
                    <strong className="text-base font-bold text-white block">{cert.title}</strong>
                    <span className="text-xs text-neutral-300">Awarded to: {cert.recipient_name}</span>
                    <span className="text-[11px] text-neutral-500 font-mono block mt-1">{cert.certificate_number}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: BROADCAST */}
        {section === "broadcast" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Broadcast & Downloads</h2>
                <p className="text-xs text-neutral-400">Manage live announcements ticker and public PDF downloads</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAnnModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#d7ff3f] text-black font-bold text-xs"
                >
                  + Announcement
                </button>
                <button
                  onClick={() => setShowDownloadModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
                >
                  + Download Doc
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Live Announcements</h3>
              <div className="space-y-2">
                {announcements.map((a) => (
                  <div key={a.id} className="p-4 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-white block text-sm">{a.title}</strong>
                      <p className="text-neutral-400 mt-0.5">{a.body}</p>
                    </div>
                    <button
                      onClick={async () => {
                        await api.deleteAnnouncement(a.id);
                        loadEventData();
                      }}
                      className="text-red-400 hover:text-red-300 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECTION: ACCESS & JUDGE ASSIGN */}
        {section === "access" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Judge Assignments & RBAC</h2>
                <p className="text-xs text-neutral-400">Assign judges to specific competition programmes</p>
              </div>
            </div>

            <form onSubmit={handleAssignJudge} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center gap-3">
              <input
                type="email"
                value={judgeAssignEmail}
                onChange={(e) => setJudgeAssignEmail(e.target.value)}
                placeholder="Judge Email (e.g. judge.priya@eventra.org)"
                className="flex-1 bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                required
              />
              <select
                value={judgeAssignProgId}
                onChange={(e) => setJudgeAssignProgId(e.target.value)}
                className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                required
              >
                <option value="">-- Assign Programme --</option>
                {programmes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#d7ff3f] text-black font-bold text-xs"
              >
                Assign Judge
              </button>
            </form>

            <div className="space-y-2">
              {judgeAssignments.map((ja) => (
                <div key={ja.id} className="p-3.5 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-white block">{ja.email}</strong>
                    <span className="text-neutral-400">
                      Assigned to: {programmes.find((p) => p.id === ja.programme_id)?.name}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      await api.deleteJudgeAssignment(ja.id);
                      loadEventData();
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: SUBSCRIPTIONS & QUOTAS */}
        {section === "subscriptions" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#d7ff3f] uppercase tracking-wider block">
                  MULTI-TENANT ARCHITECTURE
                </span>
                <h2 className="text-2xl font-black text-white">Subscription & Tenant Quotas</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Manage organization workspace plans, resource limits, and billing status
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Payment Gateway: Pending Integration</span>
                </span>
              </div>
            </div>

            {/* Current Organization Workspace Card */}
            <div className="p-6 rounded-2xl bg-neutral-900 border border-white/10 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#d7ff3f]/10 text-[#d7ff3f] flex items-center justify-center text-xl font-black">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{user?.organizations?.find((o) => o.orgId === user.activeOrgId)?.orgName || selectedEvent.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                          subscription?.status === "active"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : subscription?.status === "trialing"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-white/10 text-neutral-300"
                        }`}
                      >
                        {subscription?.status || "trialing"}
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Workspace ID: <span className="font-mono text-neutral-300">{user?.activeOrgId || selectedEvent.organization_id || "org-workspace"}</span>
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs font-bold text-white block">
                    Current Tier: <span className="text-[#d7ff3f] uppercase">{currentPlan?.name || "Trial"}</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 block mt-0.5">
                    {subscription?.trial_ends_at
                      ? `Trial expires: ${new Date(subscription.trial_ends_at).toLocaleDateString()}`
                      : `Cycle ends: ${subscription?.current_period_ends_at ? new Date(subscription.current_period_ends_at).toLocaleDateString() : "Next month"}`}
                  </span>
                </div>
              </div>

              {/* Real Usage vs Plan Quotas */}
              <div>
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-3">
                  Resource Usage & Plan Enforcements
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400">Festival Events</span>
                      <span className="font-bold text-white">
                        {tenantUsage?.eventsCount || 0} / {tenantUsage?.eventsMax || 1}
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#d7ff3f] h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            ((tenantUsage?.eventsCount || 0) / (tenantUsage?.eventsMax || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-neutral-500 block">
                      Max {tenantUsage?.eventsMax || 1} concurrent festivals
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400">Programmes Lineup</span>
                      <span className="font-bold text-white">
                        {tenantUsage?.programmesCount || 0} / {tenantUsage?.programmesMax || 10}
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-sky-400 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            ((tenantUsage?.programmesCount || 0) / (tenantUsage?.programmesMax || 10)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-neutral-500 block">
                      Max {tenantUsage?.programmesMax || 10} event categories
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400">Contestants / Chests</span>
                      <span className="font-bold text-white">
                        {tenantUsage?.participantsCount || 0} / {tenantUsage?.participantsMax || 100}
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-400 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            ((tenantUsage?.participantsCount || 0) / (tenantUsage?.participantsMax || 100)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-neutral-500 block">
                      Max {tenantUsage?.participantsMax || 100} registered participants
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400">Jurors & Judges</span>
                      <span className="font-bold text-white">
                        {tenantUsage?.judgesCount || 0} / {tenantUsage?.judgesMax || 5}
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            ((tenantUsage?.judgesCount || 0) / (tenantUsage?.judgesMax || 5)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-neutral-500 block">
                      Max {tenantUsage?.judgesMax || 5} judge scoring accounts
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Tiers Selection */}
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">Available SaaS Subscription Tiers</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Select a plan to test tier changes. Customer data is never deleted upon plan expiration or downgrade.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map((p) => {
                  const isCurrent = currentPlan?.code === p.code;
                  return (
                    <div
                      key={p.code}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isCurrent
                          ? "bg-[#d7ff3f]/10 border-[#d7ff3f] shadow-[0_0_20px_rgba(215,255,63,0.15)]"
                          : "bg-neutral-900 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">{p.name}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded bg-[#d7ff3f] text-black font-extrabold text-[9px] uppercase">
                              Active
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white">
                              {p.price_monthly === 0 ? "Free" : `$${p.price_monthly}`}
                            </span>
                            <span className="text-xs text-neutral-400">
                              {p.price_monthly === 0 ? "14 days" : "/month"}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-1 leading-snug">{p.description}</p>
                        </div>

                        <div className="space-y-1.5 pt-3 border-t border-white/10 text-xs text-neutral-300">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-[#d7ff3f]" />
                            <span>{p.max_events >= 99 ? "Unlimited" : p.max_events} Festival(s)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-[#d7ff3f]" />
                            <span>Up to {p.max_programmes} Programmes</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-[#d7ff3f]" />
                            <span>Up to {p.max_participants} Contestants</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-[#d7ff3f]" />
                            <span>Up to {p.max_judges} Judges</span>
                          </div>
                          {p.features?.custom_domain && (
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Custom Event Domain</span>
                            </div>
                          )}
                          {p.features?.qr_verification && (
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>QR Certificate Verification</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-5 mt-4 border-t border-white/5">
                        {isCurrent ? (
                          <div className="w-full py-2.5 rounded-xl bg-white/10 text-center text-xs font-bold text-neutral-300 cursor-default">
                            Current Active Plan
                          </div>
                        ) : (
                          <button
                            onClick={() => handleUpgradePlan(p.code)}
                            disabled={subscriptionLoading}
                            className="w-full py-2.5 rounded-xl bg-[#d7ff3f] text-black font-bold text-xs hover:bg-[#cbf530] transition-colors cursor-pointer shadow-sm"
                          >
                            {subscriptionLoading ? "Updating…" : `Switch to ${p.name}`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SUPER ADMIN PLATFORM MULTI-TENANT VIEW (Faris Only) */}
            {user?.isSuperAdmin && (
              <div className="p-6 rounded-2xl bg-neutral-900 border border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Platform Owner Multi-Tenant Administration</h3>
                      <p className="text-xs text-neutral-400">Omni-access across all college workspaces on Eventra</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                    Super Admin View
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-neutral-400">
                        <th className="pb-2 font-semibold">Organization</th>
                        <th className="pb-2 font-semibold">Workspace Slug</th>
                        <th className="pb-2 font-semibold">Plan</th>
                        <th className="pb-2 font-semibold">Status</th>
                        <th className="pb-2 font-semibold">Events</th>
                        <th className="pb-2 font-semibold">Contestants</th>
                        <th className="pb-2 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {adminOrgList.map((org) => (
                        <tr key={org.id} className="hover:bg-white/5">
                          <td className="py-3 font-bold text-white">{org.name}</td>
                          <td className="py-3 font-mono text-neutral-400">{org.slug}</td>
                          <td className="py-3 uppercase text-[11px] font-semibold text-[#d7ff3f]">
                            {org.subscription?.plan_code || "trial"}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                org.status === "active"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {org.status}
                            </span>
                          </td>
                          <td className="py-3 text-neutral-300">
                            {org.usage?.eventsCount || 0} / {org.usage?.eventsMax || 1}
                          </td>
                          <td className="py-3 text-neutral-300">
                            {org.usage?.participantsCount || 0}
                          </td>
                          <td className="py-3 text-right space-x-1.5">
                            <button
                              onClick={async () => {
                                await api.updateOrgSubscription(org.id, "pro");
                                await loadSubscriptionData();
                              }}
                              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-white"
                            >
                              Set Pro
                            </button>
                            <button
                              onClick={async () => {
                                await api.updateOrgSubscription(org.id, "enterprise");
                                await loadSubscriptionData();
                              }}
                              className="px-2 py-1 rounded bg-[#d7ff3f]/20 hover:bg-[#d7ff3f]/30 text-[10px] font-semibold text-[#d7ff3f]"
                            >
                              Set Enterprise
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION: AUDIT */}
        {section === "audit" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">Full Security Audit Logs</h2>
              <p className="text-xs text-neutral-400">All administrative operations and scoring events are logged</p>
            </div>

            <div className="bg-neutral-900 rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden text-xs">
              {auditLogs.map((l) => (
                <div key={l.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#d7ff3f]">{l.action}</span>
                      <span className="text-neutral-500 font-mono text-[10px]">[{l.entity_type}]</span>
                    </div>
                    <span className="text-neutral-400 text-[11px] block mt-0.5">
                      Actor: {l.actor_user_id || "System"} · IP: {l.ip_address || "127.0.0.1"}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-500">
                    {new Date(l.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: DIAGNOSTICS */}
        {section === "diagnostics" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">System Diagnostics & Health</h2>
              <p className="text-xs text-neutral-400">Database connection state, migration flags, and integrity audit</p>
            </div>

            {healthStatus && (
              <div className="p-6 rounded-2xl bg-neutral-900 border border-white/10 space-y-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <strong className="text-sm font-bold text-white">Status: OK / CONNECTED</strong>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  <div className="p-3 rounded-xl bg-white/5">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase block">Database Engine</span>
                    <strong className="text-xs text-white">{healthStatus.database}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase block">Total Events</span>
                    <strong className="text-xs text-white">{healthStatus.events}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase block">Total Programmes</span>
                    <strong className="text-xs text-white">{healthStatus.programmes}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase block">Users & Roles</span>
                    <strong className="text-xs text-white">{healthStatus.users}</strong>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase block mb-2">
                    Verified Schema Migrations
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(healthStatus.schema?.migrations || {}).map(([mig, val]) => (
                      <span
                        key={mig}
                        className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px]"
                      >
                        ✓ {mig}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE EVENT MODAL */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#12161f] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Create Festival</h3>
            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-300 font-medium block mb-1">Festival Name *</label>
                <input
                  type="text"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  placeholder="e.g. Verve '26"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-neutral-300 font-medium block mb-1">Tagline</label>
                <input
                  type="text"
                  value={eventForm.tagline}
                  onChange={(e) => setEventForm({ ...eventForm, tagline: e.target.value })}
                  placeholder="e.g. Cultural & Arts Gala"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-neutral-300 font-medium block mb-1">Main Location / Venue</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder="Central Amphitheatre"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/5 text-neutral-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#d7ff3f] text-black font-bold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PROGRAMME MODAL */}
      {showProgrammeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#12161f] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Programme to Lineup</h3>
            <form onSubmit={handleCreateProgramme} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-300 font-medium block mb-1">Programme Title *</label>
                <input
                  type="text"
                  value={programmeForm.name}
                  onChange={(e) => setProgrammeForm({ ...programmeForm, name: e.target.value })}
                  placeholder="e.g. Western Acoustic Solo"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 font-medium block mb-1">Category</label>
                  <select
                    value={programmeForm.category}
                    onChange={(e) => setProgrammeForm({ ...programmeForm, category: e.target.value })}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Dance">Dance</option>
                    <option value="Music">Music</option>
                    <option value="Theatre">Theatre</option>
                    <option value="Fine Arts">Fine Arts</option>
                    <option value="Literary">Literary</option>
                    <option value="Tech">Tech</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-300 font-medium block mb-1">Type</label>
                  <select
                    value={programmeForm.type}
                    onChange={(e) => setProgrammeForm({ ...programmeForm, type: e.target.value })}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="individual">Individual</option>
                    <option value="team">Team</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProgrammeModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/5 text-neutral-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#d7ff3f] text-black font-bold"
                >
                  Add Programme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE VENUE MODAL */}
      {showVenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#12161f] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Venue / Stage</h3>
            <form onSubmit={handleCreateVenue} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-300 font-medium block mb-1">Stage / Venue Name *</label>
                <input
                  type="text"
                  value={venueForm.name}
                  onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
                  placeholder="e.g. Main Auditorium"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-neutral-300 font-medium block mb-1">Location Details</label>
                <input
                  type="text"
                  value={venueForm.location}
                  onChange={(e) => setVenueForm({ ...venueForm, location: e.target.value })}
                  placeholder="Arts Block 2nd Floor"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowVenueModal(false)} className="flex-1 py-2 rounded-xl bg-white/5 text-neutral-400 font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-[#d7ff3f] text-black font-bold">Save Venue</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TEAM MODAL */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#12161f] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Team / Guild</h3>
            <form onSubmit={handleCreateTeam} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-300 font-medium block mb-1">Team Name *</label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  placeholder="e.g. Falcons Arts Troupe"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-neutral-300 font-medium block mb-1">Team Code</label>
                <input
                  type="text"
                  value={teamForm.code}
                  onChange={(e) => setTeamForm({ ...teamForm, code: e.target.value.toUpperCase() })}
                  placeholder="FAT-01"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowTeamModal(false)} className="flex-1 py-2 rounded-xl bg-white/5 text-neutral-400 font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-[#d7ff3f] text-black font-bold">Save Team</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PARTICIPANT MODAL */}
      {showParticipantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#12161f] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Register Contestant</h3>
            <form onSubmit={handleCreateParticipant} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-300 font-medium block mb-1">Full Name *</label>
                <input
                  type="text"
                  value={participantForm.name}
                  onChange={(e) => setParticipantForm({ ...participantForm, name: e.target.value })}
                  placeholder="e.g. Sreya Verma"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 font-medium block mb-1">Team</label>
                  <select
                    value={participantForm.teamId}
                    onChange={(e) => setParticipantForm({ ...participantForm, teamId: e.target.value })}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="">Independent</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-neutral-300 font-medium block mb-1">Custom Chest No.</label>
                  <input
                    type="number"
                    value={participantForm.chestNumber}
                    onChange={(e) => setParticipantForm({ ...participantForm, chestNumber: e.target.value })}
                    placeholder="Auto (e.g. 105)"
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowParticipantModal(false)} className="flex-1 py-2 rounded-xl bg-white/5 text-neutral-400 font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-[#d7ff3f] text-black font-bold">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#12161f] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Allocate Running Order Slot</h3>
            <form onSubmit={handleCreateSchedule} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-300 font-medium block mb-1">Programme *</label>
                <select
                  value={scheduleForm.programmeId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, programmeId: e.target.value })}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                  required
                >
                  <option value="">-- Select Programme --</option>
                  {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-neutral-300 font-medium block mb-1">Venue / Stage *</label>
                <select
                  value={scheduleForm.venueId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, venueId: e.target.value })}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                  required
                >
                  <option value="">-- Select Venue --</option>
                  {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 font-medium block mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.startsAt}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, startsAt: e.target.value })}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-300 font-medium block mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.endsAt}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, endsAt: e.target.value })}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="flex-1 py-2 rounded-xl bg-white/5 text-neutral-400 font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-[#d7ff3f] text-black font-bold">Allocate Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDITED CORRECTION MODAL */}
      {showCorrectionModal && correctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#12161f] border border-amber-500/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Audited Result Correction</h3>
            <p className="text-xs text-neutral-400">
              Editing published results requires a mandatory justification in the permanent audit trail.
            </p>
            <form onSubmit={handleCorrectResultSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 font-medium block mb-1">New Total Score</label>
                  <input
                    type="number"
                    step="0.01"
                    value={correctionScore}
                    onChange={(e) => setCorrectionScore(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-neutral-300 font-medium block mb-1">New Position / Rank</label>
                  <input
                    type="number"
                    min="1"
                    value={correctionPosition}
                    onChange={(e) => setCorrectionPosition(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-300 font-semibold block mb-1">
                  Mandatory Audit Reason *
                </label>
                <textarea
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Scrutiny committee tie-break resolution after jury re-deliberation"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/5 text-neutral-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-400 text-black font-bold"
                >
                  Confirm & Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENT MODAL */}
      {showAnnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#12161f] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Broadcast Announcement</h3>
            <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-300 font-medium block mb-1">Headline *</label>
                <input
                  type="text"
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  placeholder="e.g. Classical Vocal Results Published"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-neutral-300 font-medium block mb-1">Message Body *</label>
                <textarea
                  rows={3}
                  value={annForm.body}
                  onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })}
                  placeholder="Full notice text..."
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAnnModal(false)} className="flex-1 py-2 rounded-xl bg-white/5 text-neutral-400 font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-[#d7ff3f] text-black font-bold">Broadcast</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOWNLOAD MODAL */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#12161f] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Publish Download Document</h3>
            <form onSubmit={handleCreateDownload} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-300 font-medium block mb-1">Document Title *</label>
                <input
                  type="text"
                  value={downloadForm.title}
                  onChange={(e) => setDownloadForm({ ...downloadForm, title: e.target.value })}
                  placeholder="Official Rules & Stage Map"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-neutral-300 font-medium block mb-1">Description</label>
                <input
                  type="text"
                  value={downloadForm.description}
                  onChange={(e) => setDownloadForm({ ...downloadForm, description: e.target.value })}
                  placeholder="Complete schedule brochure in PDF"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowDownloadModal(false)} className="flex-1 py-2 rounded-xl bg-white/5 text-neutral-400 font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-[#d7ff3f] text-black font-bold">Publish Document</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
