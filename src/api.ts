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
  ContactMessageItem,
  AuditLogItem,
  LeaderboardItem,
  UserSessionItem,
  SubscriptionPlanItem,
  OrganizationSubscriptionItem,
  TenantUsageItem,
  OrganizationItem,
  OrganizationMemberItem,
  OrganizationInvitationItem,
} from "./types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Health
  getHealth: () => request<{ ok: boolean; database: string; database_time: string; events: number; programmes: number; results: number; users: number; schema: any }>("/api/health"),

  // Auth & Onboarding
  getAuthStatus: () => request<{ ok: boolean; auth: { configured: boolean; configuredEmail: string; users: number } }>("/api/auth/status"),
  login: (email: string, password?: string) =>
    request<{ ok: boolean; user: UserSessionItem }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: password || "Eventra2026!" }),
    }),
  signup: (data: {
    name: string;
    email: string;
    password?: string;
    organizationName?: string;
    planCode?: string;
    festivalName?: string;
    festivalLocation?: string;
    festivalStartDate?: string;
    festivalDescription?: string;
    inviteToken?: string;
    teamInvites?: Array<{ email: string; role: string }>;
  }) =>
    request<{ ok: boolean; user: UserSessionItem; message: string }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  getMe: () => request<{ ok: boolean; user: UserSessionItem }>("/api/auth/me"),
  switchOrg: (orgId: string) =>
    request<{ ok: boolean; user: UserSessionItem }>("/api/auth/switch-org", {
      method: "POST",
      body: JSON.stringify({ orgId }),
    }),
  verifyEmail: (token: string) =>
    request<{ ok: boolean; message: string }>("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  forgotPassword: (email: string) =>
    request<{ ok: boolean; message: string; resetToken?: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, newPassword: string) =>
    request<{ ok: boolean; message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),
  updateProfile: (data: { name?: string; currentPassword?: string; newPassword?: string }) =>
    request<{ ok: boolean; user: UserSessionItem; message: string }>("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getAccounts: () => request<{ users: any[] }>("/api/auth/accounts"),
  getEventRoles: (eventId: string) => request<{ roles: any[] }>(`/api/auth/event-roles?eventId=${eventId}`),
  assignEventRole: (eventId: string, email: string, role: string) =>
    request<{ role: any }>("/api/auth/event-roles", {
      method: "POST",
      body: JSON.stringify({ eventId, email, role }),
    }),

  // Organizations & Subscriptions
  getPlans: () => request<{ plans: SubscriptionPlanItem[] }>("/api/plans"),
  getOrgSubscription: (orgId: string) =>
    request<{
      subscription: OrganizationSubscriptionItem;
      plan: SubscriptionPlanItem;
      usage: TenantUsageItem;
      paymentGatewayStatus: string;
    }>(`/api/organizations/${orgId}/subscription`),
  updateOrgSubscription: (orgId: string, planCode: string) =>
    request<{ ok: boolean; subscription: OrganizationSubscriptionItem; message: string }>(
      `/api/organizations/${orgId}/subscription`,
      { method: "POST", body: JSON.stringify({ planCode }) }
    ),
  getAdminSubscriptions: () =>
    request<{ organizations: (OrganizationItem & { subscription: any; plan: any; usage: TenantUsageItem })[] }>(
      "/api/admin/subscriptions"
    ),
  getOrganizations: () => request<{ organizations: OrganizationItem[] }>("/api/organizations"),
  createOrganization: (data: { name: string; website?: string; billingEmail?: string }) =>
    request<{ organization: OrganizationItem }>("/api/organizations", { method: "POST", body: JSON.stringify(data) }),
  getOrgMembers: (orgId: string) =>
    request<{ members: OrganizationMemberItem[]; invitations: OrganizationInvitationItem[] }>(
      `/api/organizations/${orgId}/members`
    ),
  inviteOrgMember: (orgId: string, email: string, role: string) =>
    request<{ ok: boolean; invitation: OrganizationInvitationItem; inviteLink: string }>(
      `/api/organizations/${orgId}/invitations`,
      { method: "POST", body: JSON.stringify({ email, role }) }
    ),
  removeOrgMember: (orgId: string, userId: string) =>
    request<{ ok: boolean }>(`/api/organizations/${orgId}/members/${userId}`, { method: "DELETE" }),

  // Events
  getEvents: (isPublic = false) => request<{ events: EventItem[] }>(`/api/events${isPublic ? "?public=true" : ""}`),
  createEvent: (data: Partial<EventItem>) => request<{ event: EventItem }>("/api/events", { method: "POST", body: JSON.stringify(data) }),
  updateEvent: (data: { id: string } & Partial<EventItem>) => request<{ event: EventItem }>("/api/events", { method: "PATCH", body: JSON.stringify(data) }),
  deleteEvent: (id: string) => request<{ ok: boolean }>(`/api/events?id=${id}`, { method: "DELETE" }),

  // Venues
  getVenues: (eventId: string) => request<{ venues: VenueItem[] }>(`/api/venues?eventId=${eventId}`),
  createVenue: (data: { eventId: string; name: string; location?: string; capacity?: number }) =>
    request<{ venue: VenueItem }>("/api/venues", { method: "POST", body: JSON.stringify(data) }),
  deleteVenue: (id: string) => request<{ ok: boolean }>(`/api/venues?id=${id}`, { method: "DELETE" }),

  // Teams
  getTeams: (eventId: string) => request<{ teams: TeamItem[] }>(`/api/teams?eventId=${eventId}`),
  createTeam: (data: { eventId: string; name: string; code?: string }) =>
    request<{ team: TeamItem }>("/api/teams", { method: "POST", body: JSON.stringify(data) }),
  deleteTeam: (id: string) => request<{ ok: boolean }>(`/api/teams?id=${id}`, { method: "DELETE" }),

  // Participants
  getParticipants: (eventId: string) => request<{ participants: ParticipantItem[] }>(`/api/participants?eventId=${eventId}`),
  createParticipant: (data: { eventId: string; teamId?: string | null; name: string; email?: string; phone?: string; chestNumber?: number }) =>
    request<{ participant: ParticipantItem }>("/api/participants", { method: "POST", body: JSON.stringify(data) }),
  deleteParticipant: (id: string) => request<{ ok: boolean }>(`/api/participants?id=${id}`, { method: "DELETE" }),

  // Programmes
  getProgrammes: (eventId: string) => request<{ programmes: ProgrammeItem[] }>(`/api/programmes?eventId=${eventId}`),
  createProgramme: (data: { eventId: string; name: string; category?: string; type?: string; maxParticipants?: number; description?: string; durationMinutes?: number; reportingMinutes?: number; judgeCount?: number }) =>
    request<{ programme: ProgrammeItem }>("/api/programmes", { method: "POST", body: JSON.stringify(data) }),
  updateProgramme: (id: string, updates: Partial<ProgrammeItem>) =>
    request<{ programme: ProgrammeItem }>("/api/programmes", { method: "PATCH", body: JSON.stringify({ id, ...updates }) }),
  deleteProgramme: (id: string) => request<{ ok: boolean }>(`/api/programmes?id=${id}`, { method: "DELETE" }),

  // Criteria
  getProgrammeCriteria: (programmeId: string) => request<{ criteria: ProgrammeCriterionItem[] }>(`/api/programme-criteria?programmeId=${programmeId}`),
  createProgrammeCriterion: (data: { programmeId: string; name: string; maxScore?: number; weight?: number; description?: string }) =>
    request<{ criterion: ProgrammeCriterionItem }>("/api/programme-criteria", { method: "POST", body: JSON.stringify(data) }),
  deleteProgrammeCriterion: (id: string) => request<{ ok: boolean }>(`/api/programme-criteria?id=${id}`, { method: "DELETE" }),

  // Registrations
  getRegistrations: (eventId?: string, programmeId?: string) =>
    request<{ registrations: RegistrationItem[] }>(`/api/registrations?${eventId ? `eventId=${eventId}` : ""}${programmeId ? `&programmeId=${programmeId}` : ""}`),
  createRegistration: (data: { programmeId: string; participantId?: string | null; teamId?: string | null }) =>
    request<{ registration: RegistrationItem }>("/api/registrations", { method: "POST", body: JSON.stringify(data) }),
  deleteRegistration: (id: string) => request<{ ok: boolean }>(`/api/registrations?id=${id}`, { method: "DELETE" }),

  // Schedules
  getSchedules: (eventId: string) => request<{ schedules: ScheduleItem[] }>(`/api/schedules?eventId=${eventId}`),
  createSchedule: (data: { programmeId: string; venueId: string; startsAt: string; endsAt?: string; reportingAt?: string; notes?: string }) =>
    request<{ schedule: ScheduleItem }>("/api/schedules", { method: "POST", body: JSON.stringify(data) }),
  deleteSchedule: (id: string) => request<{ ok: boolean }>(`/api/schedules?id=${id}`, { method: "DELETE" }),

  // Judge Assignments
  getJudgeAssignments: (eventId?: string, programmeId?: string) =>
    request<{ assignments: JudgeAssignmentItem[] }>(`/api/judge-assignments?${eventId ? `eventId=${eventId}` : ""}${programmeId ? `&programmeId=${programmeId}` : ""}`),
  createJudgeAssignment: (data: { eventId: string; programmeId: string; email: string }) =>
    request<{ assignment: JudgeAssignmentItem }>("/api/judge-assignments", { method: "POST", body: JSON.stringify(data) }),
  deleteJudgeAssignment: (id: string) => request<{ ok: boolean }>(`/api/judge-assignments?id=${id}`, { method: "DELETE" }),

  // Judge Scores
  getJudgeScores: (eventId: string, programmeId?: string) =>
    request<{ scores: JudgeScoreItem[] }>(`/api/judge-scores?eventId=${eventId}${programmeId ? `&programmeId=${programmeId}` : ""}`),
  submitJudgeScore: (data: { eventId: string; programmeId: string; participantId?: string | null; teamId?: string | null; criteriaScores: Record<string, number>; totalScore?: number }) =>
    request<{ score: JudgeScoreItem }>("/api/judge-scores", { method: "POST", body: JSON.stringify(data) }),

  // Results
  getResults: (eventId: string, isPublic = false) => request<{ results: ResultItem[] }>(`/api/results?eventId=${eventId}${isPublic ? "&public=true" : ""}`),
  verifyResult: (data: { eventId: string; programmeId: string; participantId?: string | null; teamId?: string | null }) =>
    request<{ result: ResultItem; judgeCount: number; averageScore: number }>("/api/results/verify", { method: "POST", body: JSON.stringify(data) }),
  publishResult: (eventId: string, resultId: string) =>
    request<{ result: ResultItem }>("/api/results/publish", { method: "POST", body: JSON.stringify({ eventId, resultId }) }),
  correctResult: (data: { eventId: string; resultId: string; reason: string; totalScore?: number; position?: number; points?: number }) =>
    request<{ result: ResultItem; correction: any }>("/api/result-corrections", { method: "POST", body: JSON.stringify(data) }),

  // Certificates & ID Cards
  getCertificates: (eventId: string) => request<{ certificates: CertificateItem[] }>(`/api/certificates?eventId=${eventId}`),
  createCertificate: (data: { eventId: string; title: string; participantId?: string; teamId?: string; certificateType?: string }) =>
    request<{ certificate: CertificateItem }>("/api/certificates", { method: "POST", body: JSON.stringify(data) }),
  verifyCertificate: (code: string) => request<{ verified: boolean; certificate: any }>(`/api/certificates/verify?code=${encodeURIComponent(code)}`),
  getIdCards: (eventId: string) => request<{ idCards: IdCardItem[] }>(`/api/id-cards?eventId=${eventId}`),
  createIdCard: (eventId: string, participantId: string) =>
    request<{ idCard: IdCardItem }>("/api/id-cards", { method: "POST", body: JSON.stringify({ eventId, participantId }) }),

  // Announcements & Broadcast
  getAnnouncements: (eventId: string) => request<{ announcements: AnnouncementItem[] }>(`/api/announcements?eventId=${eventId}`),
  createAnnouncement: (data: { eventId: string; title: string; body: string }) =>
    request<{ announcement: AnnouncementItem }>("/api/announcements", { method: "POST", body: JSON.stringify(data) }),
  deleteAnnouncement: (id: string) => request<{ ok: boolean }>(`/api/announcements?id=${id}`, { method: "DELETE" }),

  // Downloads & Media
  getDownloads: (eventId: string) => request<{ downloads: DownloadItem[] }>(`/api/downloads?eventId=${eventId}`),
  createDownload: (data: { eventId: string; title: string; description?: string; fileUrl?: string; fileType?: string }) =>
    request<{ download: DownloadItem }>("/api/downloads", { method: "POST", body: JSON.stringify(data) }),
  getMedia: (eventId: string) => request<{ media: MediaAssetItem[] }>(`/api/media?eventId=${eventId}`),
  createMedia: (data: { eventId: string; fileName?: string; fileUrl: string; caption?: string }) =>
    request<{ media: MediaAssetItem }>("/api/media", { method: "POST", body: JSON.stringify(data) }),

  // Public Interaction
  sendContactMessage: (data: { eventId: string; name: string; email: string; subject?: string; message: string }) =>
    request<{ ok: boolean; message: string }>("/api/contact", { method: "POST", body: JSON.stringify(data) }),
  getContactMessages: (eventId: string) => request<{ messages: ContactMessageItem[] }>(`/api/contact?eventId=${eventId}`),
  publicRegister: (data: { eventId: string; programmeId?: string; teamName?: string; participantName: string; email?: string; phone?: string }) =>
    request<{ ok: boolean; participant: ParticipantItem; message: string }>("/api/public-registration", { method: "POST", body: JSON.stringify(data) }),

  // Leaderboard & Audit
  getLeaderboard: (eventId: string) => request<{ leaderboard: LeaderboardItem[] }>(`/api/leaderboard?eventId=${eventId}`),
  getAuditLogs: (eventId?: string) => request<{ logs: AuditLogItem[] }>(`/api/audit-logs${eventId ? `?eventId=${eventId}` : ""}`),
};
