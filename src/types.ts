export interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  logo_url: string;
  website: string;
  billing_email: string;
  status: "active" | "inactive" | "suspended";
  created_at: string;
}

export interface OrganizationMemberItem {
  id: string;
  organization_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  role: "owner" | "admin" | "coordinator" | "judge" | "team-mgr" | "member";
  status: "active" | "invited" | "deactivated";
  created_at: string;
}

export interface OrganizationInvitationItem {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  token: string;
  invited_by: string;
  status: "pending" | "accepted" | "revoked";
  expires_at: string;
  created_at: string;
}

export interface SubscriptionPlanItem {
  code: string;
  name: string;
  description: string;
  price_monthly: number;
  price_per_event: number;
  max_events: number;
  max_participants: number;
  max_programmes: number;
  max_judges: number;
  features: Record<string, boolean>;
}

export interface OrganizationSubscriptionItem {
  id: string;
  organization_id: string;
  plan_code: string;
  status: "trialing" | "active" | "past_due" | "canceled" | "expired";
  trial_ends_at: string | null;
  current_period_ends_at: string;
  payment_provider: string;
  payment_customer_id?: string;
  created_at: string;
}

export interface TenantUsageItem {
  eventsCount: number;
  eventsMax: number;
  programmesCount: number;
  programmesMax: number;
  participantsCount: number;
  participantsMax: number;
  judgesCount: number;
  judgesMax: number;
}

export interface EventItem {
  id: string;
  organization_id?: string;
  name: string;
  slug: string;
  description: string;
  tagline: string;
  start_date: string;
  end_date: string | null;
  location: string;
  status: string;
  logo_url: string;
  banner_url: string;
  website_theme: string;
  primary_color: string;
  secondary_color: string;
  is_public: boolean;
  registration_open: boolean;
  registration_deadline: string | null;
  website_sections: {
    programmes?: boolean;
    schedule?: boolean;
    results?: boolean;
    gallery?: boolean;
    announcements?: boolean;
    downloads?: boolean;
    participants?: boolean;
    contact?: boolean;
  };
  timezone: string;
  created_at: string;
}

export interface VenueItem {
  id: string;
  event_id: string;
  name: string;
  location: string;
  capacity: number | null;
  created_at: string;
}

export interface TeamItem {
  id: string;
  event_id: string;
  name: string;
  code: string;
  points: number;
  created_at: string;
}

export interface ParticipantItem {
  id: string;
  event_id: string;
  team_id: string | null;
  team_name?: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  participant_code: string;
  chest_number: number;
  created_at: string;
}

export interface ProgrammeItem {
  id: string;
  event_id: string;
  name: string;
  category: string;
  type: "individual" | "team";
  max_participants: number;
  description: string;
  status: "scheduled" | "ongoing" | "completed" | "delayed";
  duration_minutes: number;
  reporting_minutes: number;
  judge_count: number;
  created_at: string;
}

export interface ProgrammeCriterionItem {
  id: string;
  programme_id: string;
  name: string;
  description: string;
  max_score: number;
  weight: number;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface RegistrationItem {
  id: string;
  programme_id: string;
  participant_id: string | null;
  team_id: string | null;
  programme_name?: string;
  participant_name?: string;
  chest_number?: number;
  team_name?: string;
  created_at: string;
}

export interface ScheduleItem {
  id: string;
  programme_id: string;
  venue_id: string;
  starts_at: string;
  ends_at: string;
  reporting_at: string;
  status: "scheduled" | "ongoing" | "completed" | "delayed";
  notes: string | null;
  public_visible: boolean;
  programme_name?: string;
  category?: string;
  venue_name?: string;
  venue_location?: string;
}

export interface JudgeAssignmentItem {
  id: string;
  event_id: string;
  programme_id: string;
  email: string;
  active: boolean;
  created_at: string;
}

export interface JudgeScoreItem {
  id: string;
  event_id: string;
  programme_id: string;
  participant_id: string | null;
  team_id: string | null;
  judge_email: string;
  criteria_scores: Record<string, number>;
  total_score: number;
  status: string;
  submitted_at: string;
  created_at: string;
}

export interface ResultItem {
  id: string;
  programme_id: string;
  participant_id: string | null;
  team_id: string | null;
  position: number;
  total_score: number;
  points: number;
  notes: string | null;
  published: boolean;
  published_at: string | null;
  published_by?: string | null;
  verification_status: "draft" | "submitted" | "verified";
  verified_at: string | null;
  verified_by?: string | null;
  programme_name?: string;
  category?: string;
  recipient_name?: string;
  team_name?: string;
  correction_reason?: string | null;
  corrected_at?: string | null;
  created_at: string;
}

export interface CertificateItem {
  id: string;
  event_id: string;
  result_id?: string | null;
  participant_id?: string | null;
  team_id?: string | null;
  title: string;
  certificate_type: "merit" | "participation" | "appreciation";
  certificate_number: string;
  verification_code?: string;
  recipient_name?: string;
  file_url?: string | null;
  issued_at: string;
  created_at: string;
}

export interface IdCardItem {
  id: string;
  event_id: string;
  participant_id: string;
  card_number: string;
  participant_name?: string;
  chest_number?: number;
  team_name?: string;
  file_url?: string | null;
  created_at: string;
}

export interface AnnouncementItem {
  id: string;
  event_id: string;
  title: string;
  body: string;
  published: boolean;
  created_at: string;
}

export interface DownloadItem {
  id: string;
  event_id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  published: boolean;
  created_at: string;
}

export interface MediaAssetItem {
  id: string;
  event_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  category: string;
  caption: string;
  published: boolean;
  created_at: string;
}

export interface ContactMessageItem {
  id: string;
  event_id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export interface UserSessionOrg {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: "owner" | "admin" | "coordinator" | "judge" | "team-mgr" | "member";
  planCode: string;
  subStatus: string;
}

export interface UserSessionItem {
  id: string;
  email: string;
  name: string;
  globalRole?: string;
  isSuperAdmin: boolean;
  emailVerified: boolean;
  organizations: UserSessionOrg[];
  activeOrgId: string;
  activeRole: string;
  token: string;
}

export interface AuditLogItem {
  id: string;
  event_id: string | null;
  organization_id?: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_user_id: string | null;
  changes: any;
  ip_address?: string;
  created_at: string;
}

export interface LeaderboardItem {
  id: string;
  name: string;
  code: string;
  points: number;
  gold: number;
  silver: number;
  bronze: number;
}
