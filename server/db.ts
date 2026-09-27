import { neon } from "@neondatabase/serverless";

export interface Organization {
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

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  role: "owner" | "admin" | "coordinator" | "judge" | "team-mgr" | "member";
  status: "active" | "invited" | "deactivated";
  created_at: string;
}

export interface OrganizationInvitation {
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

export interface SubscriptionPlan {
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

export interface OrganizationSubscription {
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

export interface UserVerificationToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  verified_at: string | null;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
}

export interface EventraDbState {
  organizations: Organization[];
  organizationMembers: OrganizationMember[];
  organizationInvitations: OrganizationInvitation[];
  subscriptionPlans: SubscriptionPlan[];
  organizationSubscriptions: OrganizationSubscription[];
  userVerifications: UserVerificationToken[];
  passwordResets: PasswordResetToken[];
  events: any[];
  venues: any[];
  teams: any[];
  programmes: any[];
  programmeCriteria: any[];
  participants: any[];
  registrations: any[];
  schedules: any[];
  judgeAssignments: any[];
  judgeScores: any[];
  results: any[];
  resultCorrections: any[];
  appeals: any[];
  certificates: any[];
  certificateVerifications: any[];
  idCards: any[];
  announcements: any[];
  downloads: any[];
  mediaAssets: any[];
  contactMessages: any[];
  auditLogs: any[];
  users: any[];
  roles: any[];
  userRoles: any[];
  eventRoles: any[];
  sessions: any[];
  eventraRateLimits: any[];
}

function createInitialSeedData(): EventraDbState {
  // Organizations
  const org1Id = "org-1000-0000-0000-000000000001"; // Faris / Platform HQ
  const org2Id = "org-2000-0000-0000-000000000002"; // St. Xavier's Arts Council (College A)
  const org3Id = "org-3000-0000-0000-000000000003"; // National Institute of Tech (College B)

  // Users
  const farisUserId = "u1000000-0000-0000-0000-000000000001"; // Super Admin
  const collegeAOwnerId = "u2000000-0000-0000-0000-000000000002"; // Organizer College A
  const collegeBOwnerId = "u5000000-0000-0000-0000-000000000005"; // Organizer College B
  const judge1UserId = "u3000000-0000-0000-0000-000000000003";
  const judge2UserId = "u4000000-0000-0000-0000-000000000004";
  const participantUserId = "u6000000-0000-0000-0000-000000000006";

  // Events
  const event1Id = "e1000000-0000-0000-0000-000000000001"; // Verve '26 (belongs to Org 2 - College A)
  const event2Id = "e2000000-0000-0000-0000-000000000002"; // TechFest Arena 2026 (belongs to Org 3 - College B)

  const v1 = "v1000000-0000-0000-0000-000000000001";
  const v2 = "v2000000-0000-0000-0000-000000000002";
  const v3 = "v3000000-0000-0000-0000-000000000003";

  const t1 = "t1000000-0000-0000-0000-000000000001";
  const t2 = "t2000000-0000-0000-0000-000000000002";
  const t3 = "t3000000-0000-0000-0000-000000000003";

  const p1 = "p1000000-0000-0000-0000-000000000001"; // Folk Dance
  const p2 = "p2000000-0000-0000-0000-000000000002"; // Acoustic Solo
  const p3 = "p3000000-0000-0000-0000-000000000003"; // Classical Vocal
  const p4 = "p4000000-0000-0000-0000-000000000004"; // Street Art

  const part1 = "pt100000-0000-0000-0000-000000000001";
  const part2 = "pt200000-0000-0000-0000-000000000002";
  const part3 = "pt300000-0000-0000-0000-000000000003";
  const part4 = "pt400000-0000-0000-0000-000000000004";

  const crit1 = "c1000000-0000-0000-0000-000000000001";
  const crit2 = "c2000000-0000-0000-0000-000000000002";
  const crit3 = "c3000000-0000-0000-0000-000000000003";

  return {
    organizations: [
      {
        id: org1Id,
        name: "Eventra Global Operations",
        slug: "eventra-hq",
        owner_user_id: farisUserId,
        logo_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=160&auto=format&fit=crop&q=80",
        website: "https://eventra-ruddy.vercel.app",
        billing_email: "billing@eventra.local",
        status: "active",
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      },
      {
        id: org2Id,
        name: "St. Xavier's Cultural Council",
        slug: "st-xaviers",
        owner_user_id: collegeAOwnerId,
        logo_url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=160&auto=format&fit=crop&q=80",
        website: "https://xaviers.edu/cultural",
        billing_email: "accounts@xaviers.edu",
        status: "active",
        created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
      },
      {
        id: org3Id,
        name: "National Tech Arena League",
        slug: "tech-league",
        owner_user_id: collegeBOwnerId,
        logo_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=160&auto=format&fit=crop&q=80",
        website: "https://techleague.org",
        billing_email: "finance@techleague.org",
        status: "active",
        created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
      },
    ],
    organizationMembers: [
      {
        id: "om-1",
        organization_id: org1Id,
        user_id: farisUserId,
        role: "owner",
        status: "active",
        created_at: new Date().toISOString(),
      },
      {
        id: "om-2",
        organization_id: org2Id,
        user_id: collegeAOwnerId,
        role: "owner",
        status: "active",
        created_at: new Date().toISOString(),
      },
      {
        id: "om-3",
        organization_id: org2Id,
        user_id: judge1UserId,
        role: "judge",
        status: "active",
        created_at: new Date().toISOString(),
      },
      {
        id: "om-4",
        organization_id: org2Id,
        user_id: judge2UserId,
        role: "judge",
        status: "active",
        created_at: new Date().toISOString(),
      },
      {
        id: "om-5",
        organization_id: org3Id,
        user_id: collegeBOwnerId,
        role: "owner",
        status: "active",
        created_at: new Date().toISOString(),
      },
    ],
    organizationInvitations: [
      {
        id: "inv-1",
        organization_id: org2Id,
        email: "stage.manager@xaviers.edu",
        role: "coordinator",
        token: "INV-XAV-991",
        invited_by: collegeAOwnerId,
        status: "pending",
        expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        created_at: new Date().toISOString(),
      },
    ],
    subscriptionPlans: [
      {
        code: "trial",
        name: "14-Day Free Trial",
        description: "Essential festival operating features for new organizers",
        price_monthly: 0,
        price_per_event: 0,
        max_events: 1,
        max_participants: 100,
        max_programmes: 10,
        max_judges: 5,
        features: { custom_domain: false, certificates: true, qr_verification: true, leaderboard: true },
      },
      {
        code: "campus",
        name: "Campus Festival Plan",
        description: "Designed for collegiate arts, music, and campus tournaments",
        price_monthly: 49,
        price_per_event: 49,
        max_events: 3,
        max_participants: 600,
        max_programmes: 35,
        max_judges: 15,
        features: { custom_domain: false, certificates: true, qr_verification: true, leaderboard: true, multiple_venues: true },
      },
      {
        code: "pro",
        name: "Pro Tournament & Gala",
        description: "For multi-university championships and high-capacity festivals",
        price_monthly: 149,
        price_per_event: 149,
        max_events: 10,
        max_participants: 3000,
        max_programmes: 120,
        max_judges: 60,
        features: { custom_domain: true, certificates: true, qr_verification: true, leaderboard: true, priority_support: true, custom_branding: true },
      },
      {
        code: "enterprise",
        name: "National Federation",
        description: "Unlimited scale, dedicated hosting, SLA, and enterprise onboarding",
        price_monthly: 399,
        price_per_event: 399,
        max_events: 999,
        max_participants: 50000,
        max_programmes: 999,
        max_judges: 999,
        features: { custom_domain: true, certificates: true, qr_verification: true, leaderboard: true, priority_support: true, dedicated_instance: true },
      },
    ],
    organizationSubscriptions: [
      {
        id: "sub-1",
        organization_id: org1Id,
        plan_code: "enterprise",
        status: "active",
        trial_ends_at: null,
        current_period_ends_at: new Date(Date.now() + 86400000 * 365).toISOString(),
        payment_provider: "internal_master",
        created_at: new Date().toISOString(),
      },
      {
        id: "sub-2",
        organization_id: org2Id,
        plan_code: "pro",
        status: "active",
        trial_ends_at: null,
        current_period_ends_at: new Date(Date.now() + 86400000 * 45).toISOString(),
        payment_provider: "pending_gateway",
        created_at: new Date().toISOString(),
      },
      {
        id: "sub-3",
        organization_id: org3Id,
        plan_code: "trial",
        status: "trialing",
        trial_ends_at: new Date(Date.now() + 86400000 * 12).toISOString(),
        current_period_ends_at: new Date(Date.now() + 86400000 * 12).toISOString(),
        payment_provider: "pending_gateway",
        created_at: new Date().toISOString(),
      },
    ],
    userVerifications: [
      {
        id: "uv-1",
        user_id: farisUserId,
        token: "tok-faris-verified",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        verified_at: new Date().toISOString(),
      },
      {
        id: "uv-2",
        user_id: collegeAOwnerId,
        token: "tok-xavier-verified",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        verified_at: new Date().toISOString(),
      },
    ],
    passwordResets: [],
    events: [
      {
        id: event1Id,
        organization_id: org2Id, // St. Xavier's Cultural Council
        name: "Verve '26",
        slug: "verve-26",
        description: "The flagship inter-collegiate festival celebrating music, dance, theatrical arts, and creative expressions.",
        tagline: "Unleash The Rhythm Of The Campus",
        start_date: "2026-10-14T09:00:00Z",
        end_date: "2026-10-18T22:00:00Z",
        location: "Grand Cultural Amphitheatre & Central Campus Grounds",
        status: "live",
        logo_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=160&auto=format&fit=crop&q=80",
        banner_url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&auto=format&fit=crop&q=80",
        website_theme: "eventra",
        primary_color: "#d7ff3f",
        secondary_color: "#0a0a0a",
        is_public: true,
        registration_open: true,
        registration_deadline: "2026-10-10T23:59:59Z",
        website_sections: {
          programmes: true,
          schedule: true,
          results: true,
          gallery: true,
          announcements: true,
          downloads: true,
          participants: true,
          contact: true,
        },
        timezone: "Asia/Kolkata",
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      },
      {
        id: event2Id,
        organization_id: org3Id, // National Tech Arena League
        name: "TechFest Arena 2026",
        slug: "tech-arena-26",
        description: "Autonomous robotics, high-octane 24hr hackathon, and design sprint battleground.",
        tagline: "Build The Future Today",
        start_date: "2026-11-05T09:00:00Z",
        end_date: "2026-11-07T20:00:00Z",
        location: "Innovation Hub & Engineering Complex",
        status: "upcoming",
        logo_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=160&auto=format&fit=crop&q=80",
        banner_url: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1600&auto=format&fit=crop&q=80",
        website_theme: "cyber",
        primary_color: "#38bdf8",
        secondary_color: "#0f172a",
        is_public: true,
        registration_open: true,
        registration_deadline: "2026-11-01T23:59:59Z",
        website_sections: {
          programmes: true,
          schedule: true,
          results: true,
          gallery: true,
          announcements: true,
          downloads: true,
          participants: true,
          contact: true,
        },
        timezone: "Asia/Kolkata",
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ],
    venues: [
      { id: v1, event_id: event1Id, name: "Main Stage Alpha", location: "Central Campus Plaza", capacity: 2500, created_at: new Date().toISOString() },
      { id: v2, event_id: event1Id, name: "Auditorium Hall 1", location: "Arts & Humanities Block", capacity: 800, created_at: new Date().toISOString() },
      { id: v3, event_id: event1Id, name: "Open Amphitheatre", location: "Lakeview Ground", capacity: 1200, created_at: new Date().toISOString() },
    ],
    teams: [
      { id: t1, event_id: event1Id, name: "Falcons Arts Troupe", code: "FAT-01", points: 8, created_at: new Date().toISOString() },
      { id: t2, event_id: event1Id, name: "Cosmic Wave Collective", code: "CWC-02", points: 3, created_at: new Date().toISOString() },
      { id: t3, event_id: event1Id, name: "Apex Heritage Guild", code: "AHG-03", points: 1, created_at: new Date().toISOString() },
    ],
    programmes: [
      {
        id: p1,
        event_id: event1Id,
        name: "Folk Dance Ensemble",
        category: "Dance",
        type: "team",
        max_participants: 12,
        description: "Traditional regional folk dance presentation honoring authentic costumes and synchronization.",
        status: "completed",
        duration_minutes: 45,
        reporting_minutes: 20,
        judge_count: 2,
        created_at: new Date().toISOString(),
      },
      {
        id: p2,
        event_id: event1Id,
        name: "Acoustic Unplugged Solo",
        category: "Music",
        type: "individual",
        max_participants: 1,
        description: "Original or vocal covers accompanied exclusively by non-electric acoustic instruments.",
        status: "ongoing",
        duration_minutes: 15,
        reporting_minutes: 10,
        judge_count: 2,
        created_at: new Date().toISOString(),
      },
      {
        id: p3,
        event_id: event1Id,
        name: "Classical Carnatic Vocal",
        category: "Music",
        type: "individual",
        max_participants: 1,
        description: "Traditional raga presentation with alapana, kriti, and swaraprastara.",
        status: "scheduled",
        duration_minutes: 20,
        reporting_minutes: 15,
        judge_count: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: p4,
        event_id: event1Id,
        name: "Street Art & Live Mural Battle",
        category: "Fine Arts",
        type: "team",
        max_participants: 4,
        description: "Live wall canvas painting interpreting festival themes within 3 hours.",
        status: "scheduled",
        duration_minutes: 180,
        reporting_minutes: 30,
        judge_count: 2,
        created_at: new Date().toISOString(),
      },
    ],
    programmeCriteria: [
      { id: crit1, programme_id: p1, name: "Rhythm & Synchronization", max_score: 30, weight: 1.0, sort_order: 1, active: true },
      { id: crit2, programme_id: p1, name: "Costume & Authenticity", max_score: 30, weight: 1.0, sort_order: 2, active: true },
      { id: crit3, programme_id: p1, name: "Stage Presence & Expression", max_score: 40, weight: 1.0, sort_order: 3, active: true },
    ],
    participants: [
      { id: part1, event_id: event1Id, team_id: t1, name: "Aarav Sharma", email: "aarav.s@campus.edu", phone: "+91 98765 43210", participant_code: "P-101", chest_number: 101, created_at: new Date().toISOString() },
      { id: part2, event_id: event1Id, team_id: t2, name: "Meera Nair", email: "meera.nair@campus.edu", phone: "+91 98765 43211", participant_code: "P-102", chest_number: 102, created_at: new Date().toISOString() },
      { id: part3, event_id: event1Id, team_id: t3, name: "Rohan Varma", email: "rohan.v@campus.edu", phone: "+91 98765 43212", participant_code: "P-103", chest_number: 103, created_at: new Date().toISOString() },
      { id: part4, event_id: event1Id, team_id: t1, name: "Ananya Deshmukh", email: "ananya.d@campus.edu", phone: "+91 98765 43213", participant_code: "P-104", chest_number: 104, created_at: new Date().toISOString() },
    ],
    registrations: [
      { id: "reg-1", programme_id: p1, team_id: t1, participant_id: null, created_at: new Date().toISOString() },
      { id: "reg-2", programme_id: p1, team_id: t2, participant_id: null, created_at: new Date().toISOString() },
      { id: "reg-3", programme_id: p2, team_id: t1, participant_id: part1, created_at: new Date().toISOString() },
      { id: "reg-4", programme_id: p2, team_id: t2, participant_id: part2, created_at: new Date().toISOString() },
      { id: "reg-5", programme_id: p3, team_id: t3, participant_id: part3, created_at: new Date().toISOString() },
    ],
    schedules: [
      {
        id: "sch-1",
        programme_id: p1,
        venue_id: v1,
        starts_at: "2026-10-15T10:00:00Z",
        ends_at: "2026-10-15T11:30:00Z",
        reporting_at: "2026-10-15T09:30:00Z",
        status: "completed",
        notes: "Sound and floor check verified",
        public_visible: true,
      },
      {
        id: "sch-2",
        programme_id: p2,
        venue_id: v2,
        starts_at: "2026-10-15T14:00:00Z",
        ends_at: "2026-10-15T16:00:00Z",
        reporting_at: "2026-10-15T13:45:00Z",
        status: "ongoing",
        notes: "Direct acoustic DI feeds",
        public_visible: true,
      },
      {
        id: "sch-3",
        programme_id: p3,
        venue_id: v2,
        starts_at: "2026-10-16T11:00:00Z",
        ends_at: "2026-10-16T13:00:00Z",
        reporting_at: "2026-10-16T10:30:00Z",
        status: "scheduled",
        notes: "Shruti box and acoustic setup",
        public_visible: true,
      },
      {
        id: "sch-4",
        programme_id: p4,
        venue_id: v3,
        starts_at: "2026-10-16T15:00:00Z",
        ends_at: "2026-10-16T18:00:00Z",
        reporting_at: "2026-10-16T14:30:00Z",
        status: "scheduled",
        notes: "Weather check cleared",
        public_visible: true,
      },
    ],
    judgeAssignments: [
      { id: "ja-1", event_id: event1Id, programme_id: p1, email: "judge.priya@eventra.org", active: true, created_at: new Date().toISOString() },
      { id: "ja-2", event_id: event1Id, programme_id: p2, email: "judge.priya@eventra.org", active: true, created_at: new Date().toISOString() },
      { id: "ja-3", event_id: event1Id, programme_id: p1, email: "judge.marcus@eventra.org", active: true, created_at: new Date().toISOString() },
    ],
    judgeScores: [
      {
        id: "js-1",
        event_id: event1Id,
        programme_id: p1,
        team_id: t1,
        participant_id: null,
        judge_email: "judge.priya@eventra.org",
        criteria_scores: { [crit1]: 28, [crit2]: 29, [crit3]: 38 },
        total_score: 95,
        status: "submitted",
        submitted_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: "js-2",
        event_id: event1Id,
        programme_id: p1,
        team_id: t2,
        participant_id: null,
        judge_email: "judge.priya@eventra.org",
        criteria_scores: { [crit1]: 26, [crit2]: 25, [crit3]: 36 },
        total_score: 87,
        status: "submitted",
        submitted_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        created_at: new Date().toISOString(),
      },
    ],
    results: [
      {
        id: "res-1",
        programme_id: p1,
        team_id: t1,
        participant_id: null,
        position: 1,
        total_score: 95.0,
        points: 5,
        notes: "Exceptional synchronization and energetic choreography.",
        published: true,
        published_at: new Date().toISOString(),
        published_by: "owner@eventra.local",
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        verified_by: "owner@eventra.local",
        created_at: new Date().toISOString(),
      },
      {
        id: "res-2",
        programme_id: p1,
        team_id: t2,
        participant_id: null,
        position: 2,
        total_score: 87.0,
        points: 3,
        notes: "Vibrant performance and authentic attire.",
        published: true,
        published_at: new Date().toISOString(),
        published_by: "owner@eventra.local",
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        verified_by: "owner@eventra.local",
        created_at: new Date().toISOString(),
      },
    ],
    resultCorrections: [],
    appeals: [],
    certificates: [
      {
        id: "cert-1",
        event_id: event1Id,
        result_id: "res-1",
        team_id: t1,
        participant_id: null,
        title: "First Place — Folk Dance Ensemble",
        certificate_type: "merit",
        certificate_number: "EVT-26-FD-001",
        file_url: null,
        issued_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: "cert-2",
        event_id: event1Id,
        result_id: "res-2",
        team_id: t2,
        participant_id: null,
        title: "Second Place — Folk Dance Ensemble",
        certificate_type: "merit",
        certificate_number: "EVT-26-FD-002",
        file_url: null,
        issued_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ],
    certificateVerifications: [
      {
        id: "cv-1",
        certificate_id: "cert-1",
        verification_code: "VRF-9824-A7",
        last_verified_at: new Date().toISOString(),
        verification_count: 3,
      },
      {
        id: "cv-2",
        certificate_id: "cert-2",
        verification_code: "VRF-3142-B9",
        last_verified_at: new Date().toISOString(),
        verification_count: 1,
      },
    ],
    idCards: [
      { id: "id-1", event_id: event1Id, participant_id: part1, card_number: "IDC-VRV-101", file_url: null, created_at: new Date().toISOString() },
      { id: "id-2", event_id: event1Id, participant_id: part2, card_number: "IDC-VRV-102", file_url: null, created_at: new Date().toISOString() },
    ],
    announcements: [
      {
        id: "ann-1",
        event_id: event1Id,
        title: "Official Folk Dance Ensemble Results Published",
        body: "Judges have concluded scoring. First place awarded to Falcons Arts Troupe with 95 points.",
        published: true,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "ann-2",
        event_id: event1Id,
        title: "Acoustic Unplugged Reporting Time Shift",
        body: "All contestants for Stage 2 Acoustic Solo must report to Green Room B by 13:45 IST.",
        published: true,
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
    ],
    downloads: [
      {
        id: "dl-1",
        event_id: event1Id,
        title: "Official Rulebook & General Guidelines",
        description: "Code of conduct, time limits, judging scales, and eligibility criteria.",
        file_url: "#",
        file_type: "PDF",
        published: true,
        created_at: new Date().toISOString(),
      },
      {
        id: "dl-2",
        event_id: event1Id,
        title: "Master Event Schedule & Stage Map",
        description: "Full running order across all 3 festival venues with parking guide.",
        file_url: "#",
        file_type: "PDF",
        published: true,
        created_at: new Date().toISOString(),
      },
    ],
    mediaAssets: [
      {
        id: "med-1",
        event_id: event1Id,
        file_name: "amphitheatre-opening.jpg",
        file_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
        file_type: "image",
        category: "gallery",
        caption: "Opening ceremony illumination at Main Stage Alpha",
        published: true,
        created_at: new Date().toISOString(),
      },
      {
        id: "med-2",
        event_id: event1Id,
        file_name: "folk-dance-troupe.jpg",
        file_url: "https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&auto=format&fit=crop&q=80",
        file_type: "image",
        category: "gallery",
        caption: "Falcons Arts Troupe performing during Folk Dance Ensemble",
        published: true,
        created_at: new Date().toISOString(),
      },
      {
        id: "med-3",
        event_id: event1Id,
        file_name: "acoustic-solo.jpg",
        file_url: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80",
        file_type: "image",
        category: "gallery",
        caption: "Intimate acoustic performance at Auditorium Hall 1",
        published: true,
        created_at: new Date().toISOString(),
      },
    ],
    contactMessages: [
      {
        id: "msg-1",
        event_id: event1Id,
        name: "Devika Rao",
        email: "devika@campus.edu",
        subject: "Stage prop dimensions inquiry",
        message: "Can our team bring a 6-foot wooden backdrop for the theatrical drama event?",
        status: "unread",
        created_at: new Date().toISOString(),
      },
    ],
    auditLogs: [
      {
        id: "log-1",
        event_id: event1Id,
        action: "result.published",
        entity_type: "result",
        entity_id: "res-1",
        actor_user_id: farisUserId,
        changes: { position: 1, total_score: 95, points: 5 },
        created_at: new Date().toISOString(),
      },
    ],
    users: [
      {
        id: farisUserId,
        email: "owner@eventra.local",
        display_name: "Faris (Platform Owner)",
        password_hash: "scrypt$6dK7c...$bootstrap",
        active: true,
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: collegeAOwnerId,
        email: "coordinator@xaviers.edu",
        display_name: "Fr. Thomas (Xavier's Dean)",
        password_hash: "scrypt$6dK7c...$bootstrap",
        active: true,
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: collegeBOwnerId,
        email: "dean@techleague.org",
        display_name: "Dr. Arvind Rao (Tech League)",
        password_hash: "scrypt$6dK7c...$bootstrap",
        active: true,
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: judge1UserId,
        email: "judge.priya@eventra.org",
        display_name: "Dr. Priya Menon (Senior Juror)",
        password_hash: "scrypt$6dK7c...$bootstrap",
        active: true,
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: judge2UserId,
        email: "judge.marcus@eventra.org",
        display_name: "Marcus Vance (Dance Juror)",
        password_hash: "scrypt$6dK7c...$bootstrap",
        active: true,
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: participantUserId,
        email: "aarav.s@campus.edu",
        display_name: "Aarav Sharma (Contestant)",
        password_hash: "scrypt$6dK7c...$bootstrap",
        active: true,
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    roles: [
      { id: "r-admin", name: "super_admin", description: "Platform Owner - Faris" },
      { id: "r-org-owner", name: "org_owner", description: "Organization Owner" },
      { id: "r-org-admin", name: "org_admin", description: "Organization Admin" },
      { id: "r-coordinator", name: "coordinator", description: "Festival Coordinator" },
      { id: "r-judge", name: "judge", description: "Jury / Judge" },
      { id: "r-team-mgr", name: "team_mgr", description: "Team Manager" },
      { id: "r-participant", name: "participant", description: "Participant" },
    ],
    userRoles: [
      { user_id: farisUserId, role_id: "r-admin" },
      { user_id: collegeAOwnerId, role_id: "r-org-owner" },
      { user_id: collegeBOwnerId, role_id: "r-org-owner" },
      { user_id: judge1UserId, role_id: "r-judge" },
      { user_id: judge2UserId, role_id: "r-judge" },
      { user_id: participantUserId, role_id: "r-participant" },
    ],
    eventRoles: [
      { id: "er-1", event_id: event1Id, email: "owner@eventra.local", role: "admin", active: true },
      { id: "er-2", event_id: event1Id, email: "coordinator@xaviers.edu", role: "organizer", active: true },
      { id: "er-3", event_id: event1Id, email: "judge.priya@eventra.org", role: "judge", active: true },
      { id: "er-4", event_id: event1Id, email: "judge.marcus@eventra.org", role: "judge", active: true },
    ],
    sessions: [],
    eventraRateLimits: [],
  };
}

export const db: EventraDbState = createInitialSeedData();

export function getNeonSql() {
  if (!process.env.DATABASE_URL) return null;
  try {
    return neon(process.env.DATABASE_URL);
  } catch (err) {
    console.warn("Neon initialization warning:", err);
    return null;
  }
}
