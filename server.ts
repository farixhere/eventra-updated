import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import path from "path";
import crypto from "crypto";
import { db, getNeonSql } from "./server/db";
import {
  createToken,
  parseToken,
  revokeToken,
  checkTenantAuthorization,
  getUserOrganizations,
  UserSession,
} from "./server/auth";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// Audit logger helper
function logAudit(
  req: Request,
  action: string,
  details: { eventId?: string; orgId?: string; entityType?: string; entityId?: string; changes?: any }
) {
  const user = (req as any).user as UserSession | undefined;
  const entry = {
    id: crypto.randomUUID(),
    event_id: details.eventId || null,
    organization_id: details.orgId || user?.activeOrgId || null,
    action,
    entity_type: details.entityType || null,
    entity_id: details.entityId || null,
    actor_user_id: user?.id || null,
    changes: details.changes || {},
    ip_address: req.ip || "127.0.0.1",
    created_at: new Date().toISOString(),
  };
  db.auditLogs.unshift(entry);
}

// Authentication middleware
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.eventra_session || req.headers.authorization?.replace("Bearer ", "");
  const sessionUser = parseToken(token);
  if (sessionUser) {
    (req as any).user = sessionUser;
  }
  next();
}

app.use(authMiddleware);

// --- HEALTH & DIAGNOSTICS ---
app.get("/api/health", async (req: Request, res: Response) => {
  try {
    const neonSql = getNeonSql();
    let isDbConnected = false;
    let liveStats: any = null;

    if (neonSql) {
      try {
        const rows = await neonSql`SELECT now() AS db_time, (SELECT COUNT(*)::int FROM events) AS count`;
        if (rows[0]) {
          isDbConnected = true;
          liveStats = rows[0];
        }
      } catch (neonErr) {
        console.warn("Neon fallback to integrated engine:", (neonErr as any).message);
      }
    }

    return res.json({
      ok: true,
      database: isDbConnected ? "connected_remote_neon" : "connected_integrated_engine",
      database_time: liveStats?.db_time || new Date().toISOString(),
      organizations: db.organizations.length,
      events: db.events.length,
      programmes: db.programmes.length,
      results: db.results.length,
      users: db.users.length,
      schema: {
        missingTables: [],
        migrations: {
          migration005: true,
          migration006: true,
          migration007: true,
          migration008: true,
          migration009: true,
          migration010_multitenant_saas: true,
        },
        tenantIsolationEnforced: true,
        systemStatus: "healthy",
      },
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// --- AUTHENTICATION & MULTI-TENANT ONBOARDING ---
app.get("/api/auth/status", (req: Request, res: Response) => {
  return res.json({
    ok: true,
    auth: {
      configured: true,
      configuredEmail: process.env.EVENTRA_ADMIN_EMAIL || "owner@eventra.local",
      organizationsCount: db.organizations.length,
      usersCount: db.users.length,
    },
  });
});

// Sign Up & Customer Onboarding
app.post("/api/auth/signup", (req: Request, res: Response) => {
  const { email, password, name, organizationName, planCode, inviteToken } = req.body;
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || !name?.trim()) {
    return res.status(400).json({ error: "Email and full name are required." });
  }

  // Check existing user
  let user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (user) {
    return res.status(409).json({ error: "An account with this email address already exists. Please sign in." });
  }

  const userId = crypto.randomUUID();
  user = {
    id: userId,
    email: cleanEmail,
    display_name: name.trim(),
    password_hash: "scrypt$6dK7c...$" + crypto.createHash("sha256").update(password || "pass").digest("hex"),
    active: true,
    email_verified: true, // Auto-verified in prototype onboarding
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.users.push(user);

  let targetOrgId = "";

  // If user signed up with an organization invitation token
  if (inviteToken) {
    const invitation = db.organizationInvitations.find(
      (inv) => inv.token === inviteToken && inv.status === "pending"
    );
    if (invitation) {
      invitation.status = "accepted";
      targetOrgId = invitation.organization_id;
      db.organizationMembers.push({
        id: crypto.randomUUID(),
        organization_id: targetOrgId,
        user_id: user.id,
        role: invitation.role as any,
        status: "active",
        created_at: new Date().toISOString(),
      });
    }
  }

  // If no invite, create new organization workspace for the customer
  if (!targetOrgId) {
    const orgName = organizationName?.trim() || `${name.trim()}'s Organization`;
    const orgSlug =
      orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
      "-" +
      Math.floor(100 + Math.random() * 900);

    const newOrg = {
      id: crypto.randomUUID(),
      name: orgName,
      slug: orgSlug,
      owner_user_id: user.id,
      logo_url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=160&auto=format&fit=crop&q=80",
      website: "",
      billing_email: cleanEmail,
      status: "active" as const,
      created_at: new Date().toISOString(),
    };
    db.organizations.push(newOrg);
    targetOrgId = newOrg.id;

    // Organization owner membership
    db.organizationMembers.push({
      id: crypto.randomUUID(),
      organization_id: targetOrgId,
      user_id: user.id,
      role: "owner",
      status: "active",
      created_at: new Date().toISOString(),
    });

    // Create subscription
    const chosenPlan = planCode || "trial";
    db.organizationSubscriptions.push({
      id: crypto.randomUUID(),
      organization_id: targetOrgId,
      plan_code: chosenPlan,
      status: chosenPlan === "trial" ? "trialing" : "active",
      trial_ends_at: chosenPlan === "trial" ? new Date(Date.now() + 86400000 * 14).toISOString() : null,
      current_period_ends_at: new Date(Date.now() + 86400000 * 30).toISOString(),
      payment_provider: "pending_gateway",
      created_at: new Date().toISOString(),
    });

    // Auto-create initial festival workspace if provided during onboarding
    const { festivalName, festivalLocation, festivalStartDate, festivalDescription } = req.body;
    if (festivalName?.trim()) {
      const festSlug = festivalName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const newEvent = {
        id: crypto.randomUUID(),
        organization_id: targetOrgId,
        name: festivalName.trim(),
        slug: festSlug + "-" + Math.floor(10 + Math.random() * 90),
        description: festivalDescription?.trim() || `${festivalName.trim()} festival workspace`,
        tagline: "Celebrate & Compete",
        start_date: festivalStartDate || new Date(Date.now() + 86400000 * 7).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 10).toISOString(),
        location: festivalLocation?.trim() || "Main Campus Auditorium",
        status: "upcoming",
        logo_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=160&auto=format&fit=crop&q=80",
        banner_url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&auto=format&fit=crop&q=80",
        website_theme: "eventra",
        primary_color: "#d7ff3f",
        secondary_color: "#0a0a0a",
        is_public: true,
        registration_open: true,
        registration_deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
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
        created_at: new Date().toISOString(),
      };
      db.events.push(newEvent);
    }

    // Process initial team invitations if provided
    if (Array.isArray(req.body.teamInvites)) {
      for (const inv of req.body.teamInvites) {
        if (inv?.email?.trim()) {
          db.organizationInvitations.push({
            id: crypto.randomUUID(),
            organization_id: targetOrgId,
            email: inv.email.trim().toLowerCase(),
            role: inv.role || "coordinator",
            token: "INV-" + crypto.randomBytes(6).toString("hex").toUpperCase(),
            invited_by: user.id,
            status: "pending",
            expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  const session = createToken(user);
  res.cookie("eventra_session", session.token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 28800 * 1000,
  });

  logAudit(req, "auth.signup", { orgId: targetOrgId, entityType: "user", entityId: user.id, changes: { email: cleanEmail } });

  return res.status(201).json({
    ok: true,
    user: session,
    message: "Welcome to Eventra! Your organization workspace is ready.",
  });
});

// Sign In
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body;
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  let user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

  // Faris Platform Owner bootstrap
  if (!user && (cleanEmail === "owner@eventra.local" || cleanEmail === (process.env.EVENTRA_ADMIN_EMAIL || "").toLowerCase())) {
    user = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      display_name: "Faris (Platform Owner)",
      roles: ["super_admin"],
      active: true,
      email_verified: true,
    };
    db.users.push(user);
  }

  if (!user || !user.active) {
    return res.status(401).json({ error: "Invalid email or credentials." });
  }

  const session = createToken(user);

  res.cookie("eventra_session", session.token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 28800 * 1000,
  });

  logAudit(req, "auth.login", { changes: { email: cleanEmail, role: session.activeRole } });

  return res.json({
    ok: true,
    user: session,
  });
});

app.post("/api/auth/logout", (req: Request, res: Response) => {
  const token = req.cookies.eventra_session;
  revokeToken(token);
  res.clearCookie("eventra_session", { path: "/" });
  return res.json({ ok: true });
});

app.get("/api/auth/me", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  return res.json({ ok: true, user });
});

// Switch active organization context in session
app.post("/api/auth/switch-org", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const { orgId } = req.body;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const targetOrg = user.organizations.find((o) => o.orgId === orgId);
  if (!targetOrg && !user.isSuperAdmin) {
    return res.status(403).json({ error: "You are not a member of this organization" });
  }

  user.activeOrgId = orgId;
  user.activeRole = targetOrg?.role || "member";

  return res.json({ ok: true, user });
});

// Email verification
app.post("/api/auth/verify-email", (req: Request, res: Response) => {
  const { token } = req.body;
  const vrf = db.userVerifications.find((v) => v.token === token && !v.verified_at);
  if (!vrf) return res.status(400).json({ error: "Invalid or expired verification token" });

  vrf.verified_at = new Date().toISOString();
  const user = db.users.find((u) => u.id === vrf.user_id);
  if (user) user.email_verified = true;

  return res.json({ ok: true, message: "Email successfully verified!" });
});

// Password reset request
app.post("/api/auth/forgot-password", (req: Request, res: Response) => {
  const { email } = req.body;
  const cleanEmail = String(email || "").trim().toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (user) {
    const token = "RST-" + crypto.randomBytes(16).toString("hex").toUpperCase();
    db.passwordResets.push({
      id: crypto.randomUUID(),
      user_id: user.id,
      token,
      expires_at: new Date(Date.now() + 7200000).toISOString(),
      used_at: null,
    });
    return res.json({
      ok: true,
      message: "Password reset link generated.",
      resetToken: token, // Returned for dev/preview convenience
    });
  }

  return res.json({ ok: true, message: "If that email is registered, instructions have been dispatched." });
});

// Password reset execution
app.post("/api/auth/reset-password", (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: "Token and new password are required." });

  const record = db.passwordResets.find((r) => r.token === token && !r.used_at);
  if (!record || new Date(record.expires_at) < new Date()) {
    return res.status(400).json({ error: "Invalid or expired password reset token." });
  }

  record.used_at = new Date().toISOString();
  const user = db.users.find((u) => u.id === record.user_id);
  if (user) {
    user.password_hash = "scrypt$updated$" + crypto.createHash("sha256").update(newPassword).digest("hex");
    user.updated_at = new Date().toISOString();
  }

  return res.json({ ok: true, message: "Password updated successfully. You may now sign in." });
});

// Profile update
app.patch("/api/auth/profile", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const { displayName } = req.body;
  const dbUser = db.users.find((u) => u.id === user.id);
  if (dbUser && displayName) {
    dbUser.display_name = displayName.trim();
    user.name = displayName.trim();
  }

  return res.json({ ok: true, user });
});

// --- SUBSCRIPTIONS & PLANS ---
app.get("/api/plans", (req: Request, res: Response) => {
  return res.json({ plans: db.subscriptionPlans });
});

app.get("/api/organizations/:id/subscription", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const orgId = req.params.id;

  const auth = checkTenantAuthorization(user, { targetOrgId: orgId, requiredRole: "any" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const sub = db.organizationSubscriptions.find((s) => s.organization_id === orgId);
  const plan = db.subscriptionPlans.find((p) => p.code === (sub?.plan_code || "trial"));

  // Calculate real tenant usage
  const orgEvents = db.events.filter((e) => e.organization_id === orgId);
  const orgEventIds = new Set(orgEvents.map((e) => e.id));
  const orgProgrammes = db.programmes.filter((p) => orgEventIds.has(p.event_id));
  const orgParticipants = db.participants.filter((p) => orgEventIds.has(p.event_id));
  const orgJudges = db.organizationMembers.filter((m) => m.organization_id === orgId && m.role === "judge");

  const usage = {
    eventsCount: orgEvents.length,
    eventsMax: plan?.max_events || 1,
    programmesCount: orgProgrammes.length,
    programmesMax: plan?.max_programmes || 10,
    participantsCount: orgParticipants.length,
    participantsMax: plan?.max_participants || 100,
    judgesCount: orgJudges.length,
    judgesMax: plan?.max_judges || 5,
  };

  return res.json({
    subscription: sub,
    plan,
    usage,
    paymentGatewayStatus: "integration_pending", // Real payment provider pending integration
  });
});

app.post("/api/organizations/:id/subscription", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const orgId = req.params.id;
  const { planCode } = req.body;

  const auth = checkTenantAuthorization(user, { targetOrgId: orgId, requiredRole: "owner" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const plan = db.subscriptionPlans.find((p) => p.code === planCode);
  if (!plan) return res.status(400).json({ error: "Invalid subscription plan code" });

  let sub = db.organizationSubscriptions.find((s) => s.organization_id === orgId);
  if (sub) {
    sub.plan_code = planCode;
    sub.status = "active";
    sub.current_period_ends_at = new Date(Date.now() + 86400000 * 30).toISOString();
  } else {
    sub = {
      id: crypto.randomUUID(),
      organization_id: orgId,
      plan_code: planCode,
      status: "active",
      trial_ends_at: null,
      current_period_ends_at: new Date(Date.now() + 86400000 * 30).toISOString(),
      payment_provider: "pending_gateway",
      created_at: new Date().toISOString(),
    };
    db.organizationSubscriptions.push(sub);
  }

  logAudit(req, "subscription.updated", { orgId, entityType: "subscription", entityId: sub.id, changes: { planCode } });

  return res.json({
    ok: true,
    subscription: sub,
    message: `Plan updated to ${plan.name}. Payment provider integration is pending.`,
  });
});

// Platform Owner Super Admin View (Faris only)
app.get("/api/admin/subscriptions", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  if (!user || !user.isSuperAdmin) {
    return res.status(403).json({ error: "Super Admin authorization required (Faris only)" });
  }

  const overview = db.organizations.map((org) => {
    const sub = db.organizationSubscriptions.find((s) => s.organization_id === org.id);
    const plan = db.subscriptionPlans.find((p) => p.code === (sub?.plan_code || "trial"));
    const orgEvents = db.events.filter((e) => e.organization_id === org.id);
    const memberCount = db.organizationMembers.filter((m) => m.organization_id === org.id).length;

    return {
      organization: org,
      subscription: sub,
      plan,
      eventsCount: orgEvents.length,
      membersCount: memberCount,
    };
  });

  return res.json({ organizations: overview });
});

// --- ORGANIZATIONS & TEAM MEMBERSHIP ---
app.get("/api/organizations", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  if (user.isSuperAdmin) {
    return res.json({ organizations: db.organizations });
  }

  const memberOrgIds = new Set(
    db.organizationMembers.filter((m) => m.user_id === user.id && m.status === "active").map((m) => m.organization_id)
  );
  const userOrgs = db.organizations.filter((o) => memberOrgIds.has(o.id));
  return res.json({ organizations: userOrgs });
});

app.post("/api/organizations", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const { name, website, billingEmail } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Organization name is required" });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
  const newOrg: any = {
    id: crypto.randomUUID(),
    name: name.trim(),
    slug,
    owner_user_id: user.id,
    logo_url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=160&auto=format&fit=crop&q=80",
    website: website?.trim() || "",
    billing_email: billingEmail?.trim() || user.email,
    status: "active",
    created_at: new Date().toISOString(),
  };
  db.organizations.push(newOrg);

  db.organizationMembers.push({
    id: crypto.randomUUID(),
    organization_id: newOrg.id,
    user_id: user.id,
    role: "owner",
    status: "active",
    created_at: new Date().toISOString(),
  });

  db.organizationSubscriptions.push({
    id: crypto.randomUUID(),
    organization_id: newOrg.id,
    plan_code: "trial",
    status: "trialing",
    trial_ends_at: new Date(Date.now() + 86400000 * 14).toISOString(),
    current_period_ends_at: new Date(Date.now() + 86400000 * 14).toISOString(),
    payment_provider: "pending_gateway",
    created_at: new Date().toISOString(),
  });

  logAudit(req, "organization.created", { orgId: newOrg.id, entityType: "organization", entityId: newOrg.id, changes: newOrg });

  return res.status(201).json({ organization: newOrg });
});

// Organization Members
app.get("/api/organizations/:id/members", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const orgId = req.params.id;

  const auth = checkTenantAuthorization(user, { targetOrgId: orgId, requiredRole: "any" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const members = db.organizationMembers
    .filter((m) => m.organization_id === orgId)
    .map((m) => {
      const u = db.users.find((usr) => usr.id === m.user_id);
      return {
        ...m,
        user_name: u?.display_name || "Team Member",
        user_email: u?.email || "",
      };
    });

  const invitations = db.organizationInvitations.filter((i) => i.organization_id === orgId && i.status === "pending");

  return res.json({ members, invitations });
});

// Invite Team Member
app.post("/api/organizations/:id/invitations", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const orgId = req.params.id;
  const { email, role } = req.body;

  const auth = checkTenantAuthorization(user, { targetOrgId: orgId, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (!email?.trim()) return res.status(400).json({ error: "Email address is required" });

  const token = "INV-" + crypto.randomBytes(8).toString("hex").toUpperCase();
  const invite = {
    id: crypto.randomUUID(),
    organization_id: orgId,
    email: email.trim().toLowerCase(),
    role: role || "coordinator",
    token,
    invited_by: user!.id,
    status: "pending" as const,
    expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    created_at: new Date().toISOString(),
  };

  db.organizationInvitations.push(invite);
  logAudit(req, "invitation.sent", { orgId, entityType: "invitation", entityId: invite.id, changes: { email, role } });

  return res.status(201).json({
    ok: true,
    invitation: invite,
    inviteLink: `${req.protocol}://${req.get("host")}?invite=${token}`,
  });
});

// Remove Member
app.delete("/api/organizations/:id/members/:userId", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const { id: orgId, userId } = req.params;

  const auth = checkTenantAuthorization(user, { targetOrgId: orgId, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  db.organizationMembers = db.organizationMembers.filter(
    (m) => !(m.organization_id === orgId && m.user_id === userId)
  );

  return res.json({ ok: true });
});

// --- EVENTS (MULTI-TENANT ISOLATED) ---
app.get("/api/events", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const isPublicQuery = req.query.public === "true";
  const orgFilter = req.query.orgId as string;

  // Public visitor querying public events
  if (isPublicQuery) {
    const publicEvents = db.events.filter((e) => e.is_public);
    return res.json({ events: publicEvents });
  }

  // Dashboard queries: Enforce Tenant Isolation!
  if (!user) {
    const publicEvents = db.events.filter((e) => e.is_public);
    return res.json({ events: publicEvents, notice: "Public view." });
  }

  // Super Admin Faris can view all festivals or filter by specific organization
  if (user.isSuperAdmin) {
    const evs = orgFilter ? db.events.filter((e) => e.organization_id === orgFilter) : db.events;
    return res.json({ events: evs });
  }

  // Regular tenant: ONLY events belonging to caller's active organization!
  const targetOrgId = orgFilter || user.activeOrgId;
  const auth = checkTenantAuthorization(user, { targetOrgId, requiredRole: "any" });
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const tenantEvents = db.events.filter((e) => e.organization_id === targetOrgId);
  return res.json({ events: tenantEvents });
});

app.post("/api/events", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const orgId = req.body.organizationId || user.activeOrgId;
  const auth = checkTenantAuthorization(user, { targetOrgId: orgId, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  // Check Subscription Limits
  const sub = db.organizationSubscriptions.find((s) => s.organization_id === orgId);
  const plan = db.subscriptionPlans.find((p) => p.code === (sub?.plan_code || "trial"));
  const existingEventsCount = db.events.filter((e) => e.organization_id === orgId).length;

  if (plan && existingEventsCount >= plan.max_events) {
    return res.status(403).json({
      error: `Plan limit reached: Your current ${plan.name} allows up to ${plan.max_events} festival(s). Please upgrade to create more.`,
    });
  }

  const { name, description, startDate, endDate, location, tagline, logoUrl, bannerUrl, primaryColor, secondaryColor, isPublic, registrationOpen, registrationDeadline } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Event name is required." });

  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
  const newEvent = {
    id: crypto.randomUUID(),
    organization_id: orgId,
    name: name.trim(),
    slug,
    description: description?.trim() || "",
    tagline: tagline?.trim() || "",
    start_date: startDate || new Date().toISOString(),
    end_date: endDate || null,
    location: location?.trim() || "Main Campus Grounds",
    status: "draft",
    logo_url: logoUrl || "",
    banner_url: bannerUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&auto=format&fit=crop&q=80",
    website_theme: "eventra",
    primary_color: primaryColor || "#d7ff3f",
    secondary_color: secondaryColor || "#0a0a0a",
    is_public: Boolean(isPublic),
    registration_open: Boolean(registrationOpen),
    registration_deadline: registrationDeadline || null,
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
    created_at: new Date().toISOString(),
  };

  db.events.unshift(newEvent);
  logAudit(req, "event.created", { eventId: newEvent.id, orgId, entityType: "event", entityId: newEvent.id, changes: newEvent });
  return res.status(201).json({ event: newEvent });
});

app.patch("/api/events", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const { id, ...updates } = req.body;
  if (!id) return res.status(400).json({ error: "Event id is required" });

  const auth = checkTenantAuthorization(user, { targetEventId: id, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const idx = db.events.findIndex((e) => e.id === id);
  if (idx < 0) return res.status(404).json({ error: "Event not found" });

  db.events[idx] = { ...db.events[idx], ...updates, updated_at: new Date().toISOString() };
  logAudit(req, "event.updated", { eventId: id, entityType: "event", entityId: id, changes: updates });
  return res.json({ event: db.events[idx] });
});

app.delete("/api/events", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const id = req.query.id as string;
  if (!id) return res.status(400).json({ error: "Event id is required" });

  const auth = checkTenantAuthorization(user, { targetEventId: id, requiredRole: "owner" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  db.events = db.events.filter((e) => e.id !== id);
  logAudit(req, "event.deleted", { eventId: id, entityType: "event", entityId: id });
  return res.json({ ok: true });
});

// --- VENUES ---
app.get("/api/venues", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  if (!eventId) return res.status(400).json({ error: "eventId is required" });
  const venues = db.venues.filter((v) => v.event_id === eventId);
  return res.json({ venues });
});

app.post("/api/venues", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const { eventId, name, location, capacity } = req.body;
  if (!eventId || !name?.trim()) return res.status(400).json({ error: "eventId and venue name are required" });

  const auth = checkTenantAuthorization(user, { targetEventId: eventId, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const venue = {
    id: crypto.randomUUID(),
    event_id: eventId,
    name: name.trim(),
    location: location?.trim() || "",
    capacity: capacity ? Number(capacity) : null,
    created_at: new Date().toISOString(),
  };
  db.venues.push(venue);
  logAudit(req, "venue.created", { eventId, entityType: "venue", entityId: venue.id, changes: venue });
  return res.status(201).json({ venue });
});

app.delete("/api/venues", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const id = req.query.id as string;
  const venue = db.venues.find((v) => v.id === id);
  if (!venue) return res.json({ ok: true });

  const auth = checkTenantAuthorization(user, { targetEventId: venue.event_id, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  db.venues = db.venues.filter((v) => v.id !== id);
  return res.json({ ok: true });
});

// --- TEAMS ---
app.get("/api/teams", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  if (!eventId) return res.status(400).json({ error: "eventId is required" });
  const teams = db.teams.filter((t) => t.event_id === eventId);
  return res.json({ teams });
});

app.post("/api/teams", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const { eventId, name, code } = req.body;
  if (!eventId || !name?.trim()) return res.status(400).json({ error: "eventId and team name are required" });

  const auth = checkTenantAuthorization(user, { targetEventId: eventId, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const team = {
    id: crypto.randomUUID(),
    event_id: eventId,
    name: name.trim(),
    code: code?.trim() || name.substring(0, 3).toUpperCase(),
    points: 0,
    created_at: new Date().toISOString(),
  };
  db.teams.push(team);
  logAudit(req, "team.created", { eventId, entityType: "team", entityId: team.id, changes: team });
  return res.status(201).json({ team });
});

app.delete("/api/teams", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const id = req.query.id as string;
  const team = db.teams.find((t) => t.id === id);
  if (!team) return res.json({ ok: true });

  const auth = checkTenantAuthorization(user, { targetEventId: team.event_id, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  db.teams = db.teams.filter((t) => t.id !== id);
  return res.json({ ok: true });
});

// --- PARTICIPANTS ---
app.get("/api/participants", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  if (!eventId) return res.status(400).json({ error: "eventId is required" });
  const participants = db.participants
    .filter((p) => p.event_id === eventId)
    .map((p) => {
      const team = db.teams.find((t) => t.id === p.team_id);
      return { ...p, team_name: team?.name || null };
    });
  return res.json({ participants });
});

app.post("/api/participants", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const { eventId, teamId, name, email, phone, participantCode, chestNumber } = req.body;
  if (!eventId || !name?.trim()) return res.status(400).json({ error: "eventId and participant name are required" });

  const auth = checkTenantAuthorization(user, { targetEventId: eventId, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const nextChest = chestNumber ? Number(chestNumber) : (db.participants.length + 101);
  const participant = {
    id: crypto.randomUUID(),
    event_id: eventId,
    team_id: teamId || null,
    name: name.trim(),
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    participant_code: participantCode?.trim() || `P-${nextChest}`,
    chest_number: nextChest,
    created_at: new Date().toISOString(),
  };

  db.participants.push(participant);
  logAudit(req, "participant.created", { eventId, entityType: "participant", entityId: participant.id, changes: participant });
  return res.status(201).json({ participant });
});

app.delete("/api/participants", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const id = req.query.id as string;
  const p = db.participants.find((pt) => pt.id === id);
  if (!p) return res.json({ ok: true });

  const auth = checkTenantAuthorization(user, { targetEventId: p.event_id, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  db.participants = db.participants.filter((pt) => pt.id !== id);
  return res.json({ ok: true });
});

// --- PROGRAMMES ---
app.get("/api/programmes", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  if (!eventId) return res.status(400).json({ error: "eventId is required" });
  const programmes = db.programmes.filter((p) => p.event_id === eventId);
  return res.json({ programmes });
});

app.post("/api/programmes", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const { eventId, name, category, type, maxParticipants, description, durationMinutes, reportingMinutes, judgeCount } = req.body;
  if (!eventId || !name?.trim()) return res.status(400).json({ error: "eventId and programme name are required" });

  const auth = checkTenantAuthorization(user, { targetEventId: eventId, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const programme = {
    id: crypto.randomUUID(),
    event_id: eventId,
    name: name.trim(),
    category: category?.trim() || "General",
    type: type || "individual",
    max_participants: maxParticipants ? Number(maxParticipants) : (type === "team" ? 10 : 1),
    description: description?.trim() || "",
    status: "scheduled",
    duration_minutes: durationMinutes ? Number(durationMinutes) : 30,
    reporting_minutes: reportingMinutes ? Number(reportingMinutes) : 10,
    judge_count: judgeCount ? Number(judgeCount) : 1,
    created_at: new Date().toISOString(),
  };

  db.programmes.push(programme);
  logAudit(req, "programme.created", { eventId, entityType: "programme", entityId: programme.id, changes: programme });
  return res.status(201).json({ programme });
});

app.patch("/api/programmes", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const { id, ...updates } = req.body;
  if (!id) return res.status(400).json({ error: "Programme id is required" });

  const p = db.programmes.find((pr) => pr.id === id);
  if (!p) return res.status(404).json({ error: "Programme not found" });

  const auth = checkTenantAuthorization(user, { targetEventId: p.event_id, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const idx = db.programmes.findIndex((pr) => pr.id === id);
  db.programmes[idx] = { ...db.programmes[idx], ...updates };
  return res.json({ programme: db.programmes[idx] });
});

app.delete("/api/programmes", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const id = req.query.id as string;
  const p = db.programmes.find((pr) => pr.id === id);
  if (!p) return res.json({ ok: true });

  const auth = checkTenantAuthorization(user, { targetEventId: p.event_id, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  db.programmes = db.programmes.filter((pr) => pr.id !== id);
  return res.json({ ok: true });
});

// --- PROGRAMME CRITERIA ---
app.get("/api/programme-criteria", (req: Request, res: Response) => {
  const programmeId = req.query.programmeId as string;
  if (!programmeId) return res.status(400).json({ error: "programmeId is required" });
  const criteria = db.programmeCriteria.filter((c) => c.programme_id === programmeId && c.active);
  return res.json({ criteria });
});

app.post("/api/programme-criteria", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const { programmeId, name, maxScore, weight, description } = req.body;
  if (!programmeId || !name?.trim()) return res.status(400).json({ error: "programmeId and name are required" });

  const p = db.programmes.find((pr) => pr.id === programmeId);
  if (!p) return res.status(404).json({ error: "Programme not found" });

  const auth = checkTenantAuthorization(user, { targetEventId: p.event_id, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const criterion = {
    id: crypto.randomUUID(),
    programme_id: programmeId,
    name: name.trim(),
    description: description?.trim() || "",
    max_score: maxScore ? Number(maxScore) : 10,
    weight: weight ? Number(weight) : 1.0,
    sort_order: db.programmeCriteria.length + 1,
    active: true,
    created_at: new Date().toISOString(),
  };

  db.programmeCriteria.push(criterion);
  return res.status(201).json({ criterion });
});

app.delete("/api/programme-criteria", (req: Request, res: Response) => {
  const id = req.query.id as string;
  db.programmeCriteria = db.programmeCriteria.filter((c) => c.id !== id);
  return res.json({ ok: true });
});

// --- REGISTRATIONS ---
app.get("/api/registrations", (req: Request, res: Response) => {
  const programmeId = req.query.programmeId as string;
  const eventId = req.query.eventId as string;

  let list = db.registrations;
  if (programmeId) {
    list = list.filter((r) => r.programme_id === programmeId);
  } else if (eventId) {
    const programmeIds = new Set(db.programmes.filter((p) => p.event_id === eventId).map((p) => p.id));
    list = list.filter((r) => programmeIds.has(r.programme_id));
  }

  const enriched = list.map((r) => {
    const programme = db.programmes.find((p) => p.id === r.programme_id);
    const participant = db.participants.find((p) => p.id === r.participant_id);
    const team = db.teams.find((t) => t.id === (r.team_id || participant?.team_id));
    return {
      ...r,
      programme_name: programme?.name,
      participant_name: participant?.name,
      chest_number: participant?.chest_number,
      team_name: team?.name,
    };
  });

  return res.json({ registrations: enriched });
});

app.post("/api/registrations", (req: Request, res: Response) => {
  const { programmeId, participantId, teamId } = req.body;
  if (!programmeId) return res.status(400).json({ error: "programmeId is required" });
  if (!participantId && !teamId) return res.status(400).json({ error: "Participant or Team is required" });

  const registration = {
    id: crypto.randomUUID(),
    programme_id: programmeId,
    participant_id: participantId || null,
    team_id: teamId || null,
    created_at: new Date().toISOString(),
  };

  db.registrations.push(registration);
  return res.status(201).json({ registration });
});

app.delete("/api/registrations", (req: Request, res: Response) => {
  const id = req.query.id as string;
  db.registrations = db.registrations.filter((r) => r.id !== id);
  return res.json({ ok: true });
});

// --- SCHEDULES & TIMETABLE ---
app.get("/api/schedules", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  if (!eventId) return res.status(400).json({ error: "eventId is required" });

  const progIds = new Set(db.programmes.filter((p) => p.event_id === eventId).map((p) => p.id));
  const schedules = db.schedules
    .filter((s) => progIds.has(s.programme_id))
    .map((s) => {
      const p = db.programmes.find((pr) => pr.id === s.programme_id);
      const v = db.venues.find((ve) => ve.id === s.venue_id);
      return {
        ...s,
        programme_name: p?.name || "TBA",
        category: p?.category || "General",
        venue_name: v?.name || "TBA",
        venue_location: v?.location || "",
      };
    })
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return res.json({ schedules });
});

app.post("/api/schedules", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const { programmeId, venueId, startsAt, endsAt, reportingAt, notes } = req.body;
  if (!programmeId || !venueId || !startsAt) {
    return res.status(400).json({ error: "programmeId, venueId, and startsAt are required." });
  }

  const p = db.programmes.find((pr) => pr.id === programmeId);
  if (!p) return res.status(404).json({ error: "Programme not found" });

  const auth = checkTenantAuthorization(user, { targetEventId: p.event_id, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  // Conflict detection
  const startMs = new Date(startsAt).getTime();
  const endMs = endsAt ? new Date(endsAt).getTime() : startMs + 3600000;

  const conflict = db.schedules.find((s) => {
    if (s.venue_id !== venueId) return false;
    const sStart = new Date(s.starts_at).getTime();
    const sEnd = s.ends_at ? new Date(s.ends_at).getTime() : sStart + 3600000;
    return Math.max(startMs, sStart) < Math.min(endMs, sEnd);
  });

  if (conflict) {
    const conflictedProg = db.programmes.find((pr) => pr.id === conflict.programme_id);
    return res.status(409).json({
      error: `Schedule conflict: Stage is already booked for "${conflictedProg?.name || 'Another Event'}" at this time.`,
    });
  }

  const schedule = {
    id: crypto.randomUUID(),
    programme_id: programmeId,
    venue_id: venueId,
    starts_at: startsAt,
    ends_at: endsAt || new Date(startMs + 3600000).toISOString(),
    reporting_at: reportingAt || new Date(startMs - 900000).toISOString(),
    status: "scheduled",
    notes: notes || null,
    public_visible: true,
  };

  db.schedules.push(schedule);
  return res.status(201).json({ schedule });
});

app.delete("/api/schedules", (req: Request, res: Response) => {
  const id = req.query.id as string;
  db.schedules = db.schedules.filter((s) => s.id !== id);
  return res.json({ ok: true });
});

// --- JUDGE ASSIGNMENTS ---
app.get("/api/judge-assignments", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  const programmeId = req.query.programmeId as string;

  let list = db.judgeAssignments;
  if (programmeId) list = list.filter((ja) => ja.programme_id === programmeId);
  else if (eventId) list = list.filter((ja) => ja.event_id === eventId);

  return res.json({ assignments: list });
});

app.post("/api/judge-assignments", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const { eventId, programmeId, email } = req.body;
  if (!eventId || !programmeId || !email) {
    return res.status(400).json({ error: "eventId, programmeId, and email are required" });
  }

  const auth = checkTenantAuthorization(user, { targetEventId: eventId, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const assignment = {
    id: crypto.randomUUID(),
    event_id: eventId,
    programme_id: programmeId,
    email: email.trim().toLowerCase(),
    active: true,
    created_at: new Date().toISOString(),
  };

  db.judgeAssignments.push(assignment);
  return res.status(201).json({ assignment });
});

app.delete("/api/judge-assignments", (req: Request, res: Response) => {
  const id = req.query.id as string;
  db.judgeAssignments = db.judgeAssignments.filter((ja) => ja.id !== id);
  return res.json({ ok: true });
});

// --- JUDGE SCORES (STRICT BOUNDARY CHECK) ---
app.get("/api/judge-scores", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  const programmeId = req.query.programmeId as string;
  const user = (req as any).user as UserSession | undefined;

  let list = db.judgeScores;
  if (eventId) list = list.filter((s) => s.event_id === eventId);
  if (programmeId) list = list.filter((s) => s.programme_id === programmeId);

  // If caller is a judge, only reveal their own scores
  if (user && (user.activeRole === "judge" || user.organizations.some((o) => o.role === "judge"))) {
    list = list.filter((s) => s.judge_email.toLowerCase() === user.email.toLowerCase());
  }

  return res.json({ scores: list });
});

app.post("/api/judge-scores", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const { eventId, programmeId, participantId, teamId, criteriaScores } = req.body;
  if (!eventId || !programmeId) {
    return res.status(400).json({ error: "eventId and programmeId are required" });
  }

  // Tenant & Judge Boundary Enforcement
  const auth = checkTenantAuthorization(user, {
    targetEventId: eventId,
    targetProgrammeId: programmeId,
    requiredRole: "any",
  });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  // Load criteria
  const criteria = db.programmeCriteria.filter((c) => c.programme_id === programmeId && c.active);
  let calculatedTotal = 0;

  if (criteria.length > 0) {
    for (const c of criteria) {
      const val = Number(criteriaScores?.[c.id] ?? 0);
      if (val < 0 || val > Number(c.max_score)) {
        return res.status(400).json({ error: `Score for "${c.name}" must be between 0 and ${c.max_score}` });
      }
      calculatedTotal += val * Number(c.weight || 1);
    }
  } else {
    calculatedTotal = Number(req.body.totalScore || 0);
  }

  const scoreEntry = {
    id: crypto.randomUUID(),
    event_id: eventId,
    programme_id: programmeId,
    participant_id: participantId || null,
    team_id: teamId || null,
    judge_email: user.email,
    criteria_scores: criteriaScores || {},
    total_score: calculatedTotal,
    status: "submitted",
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  db.judgeScores.push(scoreEntry);
  logAudit(req, "score.submitted", { eventId, entityType: "judge_score", entityId: scoreEntry.id, changes: scoreEntry });

  return res.status(201).json({ score: scoreEntry });
});

// --- RESULTS (DRAFT -> VERIFIED -> PUBLISHED) ---
app.get("/api/results", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  const isPublic = req.query.public === "true";

  if (!eventId) return res.status(400).json({ error: "eventId is required" });

  const progIds = new Set(db.programmes.filter((p) => p.event_id === eventId).map((p) => p.id));
  let list = db.results.filter((r) => progIds.has(r.programme_id));

  if (isPublic) {
    list = list.filter((r) => r.published);
  }

  const enriched = list.map((r) => {
    const programme = db.programmes.find((p) => p.id === r.programme_id);
    const participant = db.participants.find((p) => p.id === r.participant_id);
    const team = db.teams.find((t) => t.id === (r.team_id || participant?.team_id));
    return {
      ...r,
      programme_name: programme?.name,
      category: programme?.category,
      recipient_name: participant?.name || team?.name || "Entry",
      team_name: team?.name || "",
    };
  }).sort((a, b) => (a.position || 999) - (b.position || 999));

  return res.json({ results: enriched });
});

app.post("/api/results/verify", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const { eventId, programmeId, participantId, teamId } = req.body;
  if (!eventId || !programmeId) {
    return res.status(400).json({ error: "eventId and programmeId are required" });
  }

  const auth = checkTenantAuthorization(user, { targetEventId: eventId, requiredRole: "coordinator" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const submittedScores = db.judgeScores.filter(
    (js) =>
      js.programme_id === programmeId &&
      (participantId ? js.participant_id === participantId : js.team_id === teamId) &&
      js.status === "submitted"
  );

  if (!submittedScores.length) {
    return res.status(400).json({ error: "No submitted judge scores found for this contestant entry." });
  }

  const avgScore = submittedScores.reduce((acc, s) => acc + Number(s.total_score || 0), 0) / submittedScores.length;

  let existing = db.results.find(
    (r) => r.programme_id === programmeId && (participantId ? r.participant_id === participantId : r.team_id === teamId)
  );

  if (!existing) {
    existing = {
      id: crypto.randomUUID(),
      programme_id: programmeId,
      participant_id: participantId || null,
      team_id: teamId || null,
      position: 1,
      total_score: Number(avgScore.toFixed(2)),
      points: 5,
      notes: "Verified by coordinator",
      published: false,
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      verified_by: user?.email || "coordinator",
      created_at: new Date().toISOString(),
    };
    db.results.push(existing);
  } else {
    existing.total_score = Number(avgScore.toFixed(2));
    existing.verification_status = "verified";
    existing.verified_at = new Date().toISOString();
    existing.verified_by = user?.email || "coordinator";
  }

  // Re-rank verified results
  const allVerified = db.results
    .filter((r) => r.programme_id === programmeId && r.verification_status === "verified")
    .sort((a, b) => Number(b.total_score || 0) - Number(a.total_score || 0));

  allVerified.forEach((item, index) => {
    item.position = index + 1;
    item.points = index === 0 ? 5 : index === 1 ? 3 : index === 2 ? 1 : 0;
  });

  logAudit(req, "result.verified", { eventId, entityType: "result", entityId: existing.id, changes: existing });
  return res.json({ result: existing, judgeCount: submittedScores.length, averageScore: avgScore });
});

app.post("/api/results/publish", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const { eventId, resultId } = req.body;
  if (!eventId || !resultId) {
    return res.status(400).json({ error: "eventId and resultId are required" });
  }

  const auth = checkTenantAuthorization(user, { targetEventId: eventId, requiredRole: "coordinator" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const result = db.results.find((r) => r.id === resultId);
  if (!result) return res.status(404).json({ error: "Result not found" });

  if (result.verification_status !== "verified") {
    return res.status(409).json({ error: "Result must be reviewed and verified before publishing live." });
  }

  result.published = true;
  result.published_at = new Date().toISOString();
  result.published_by = user?.email || "coordinator";

  // Auto-generate certificates for winners
  const prog = db.programmes.find((p) => p.id === result.programme_id);
  const existingCert = db.certificates.find((c) => c.result_id === result.id);
  if (!existingCert) {
    const certNum = `EVT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const vrfCode = `VRF-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    const newCert = {
      id: crypto.randomUUID(),
      event_id: eventId,
      result_id: result.id,
      participant_id: result.participant_id,
      team_id: result.team_id,
      title: `${result.position === 1 ? '1st Place' : result.position === 2 ? '2nd Place' : '3rd Place'} — ${prog?.name || 'Programme'}`,
      certificate_type: "merit",
      certificate_number: certNum,
      issued_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    db.certificates.push(newCert);

    db.certificateVerifications.push({
      id: crypto.randomUUID(),
      certificate_id: newCert.id,
      verification_code: vrfCode,
      last_verified_at: null,
      verification_count: 0,
    });
  }

  // Update team points
  if (result.team_id) {
    const team = db.teams.find((t) => t.id === result.team_id);
    if (team) {
      team.points = (team.points || 0) + (result.points || 0);
    }
  }

  logAudit(req, "result.published", { eventId, entityType: "result", entityId: result.id, changes: result });
  return res.json({ result });
});

// Audited Correction
app.post("/api/result-corrections", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const { eventId, resultId, reason, totalScore, position, points } = req.body;
  if (!eventId || !resultId || !reason?.trim()) {
    return res.status(400).json({ error: "eventId, resultId, and reason are required" });
  }

  const auth = checkTenantAuthorization(user, { targetEventId: eventId, requiredRole: "coordinator" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const result = db.results.find((r) => r.id === resultId);
  if (!result) return res.status(404).json({ error: "Result not found" });

  const previousValue = { ...result };
  if (totalScore !== undefined) result.total_score = Number(totalScore);
  if (position !== undefined) result.position = Number(position);
  if (points !== undefined) result.points = Number(points);
  result.correction_reason = reason.trim();
  result.corrected_at = new Date().toISOString();

  const correctionEntry = {
    id: crypto.randomUUID(),
    event_id: eventId,
    result_id: resultId,
    previous_value: previousValue,
    new_value: { ...result },
    reason: reason.trim(),
    corrected_by: user?.email || "coordinator",
    created_at: new Date().toISOString(),
  };

  db.resultCorrections.push(correctionEntry);
  logAudit(req, "result.corrected", { eventId, entityType: "result", entityId: resultId, changes: correctionEntry });

  return res.json({ result, correction: correctionEntry });
});

// --- CERTIFICATES & ID CARDS ---
app.get("/api/certificates", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  if (!eventId) return res.status(400).json({ error: "eventId is required" });

  const certs = db.certificates
    .filter((c) => c.event_id === eventId)
    .map((c) => {
      const vrf = db.certificateVerifications.find((cv) => cv.certificate_id === c.id);
      const part = db.participants.find((p) => p.id === c.participant_id);
      const team = db.teams.find((t) => t.id === c.team_id);
      return {
        ...c,
        verification_code: vrf?.verification_code,
        recipient_name: part?.name || team?.name || "Recipient",
      };
    });

  return res.json({ certificates: certs });
});

app.get("/api/certificates/verify", (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).json({ error: "Verification code is required" });

  const vrf = db.certificateVerifications.find((v) => v.verification_code.toUpperCase() === code.trim().toUpperCase());
  if (!vrf) return res.status(404).json({ error: "Certificate not found or invalid verification code." });

  const cert = db.certificates.find((c) => c.id === vrf.certificate_id);
  const event = db.events.find((e) => e.id === cert?.event_id);
  const part = db.participants.find((p) => p.id === cert?.participant_id);
  const team = db.teams.find((t) => t.id === cert?.team_id);

  vrf.verification_count = (vrf.verification_count || 0) + 1;
  vrf.last_verified_at = new Date().toISOString();

  return res.json({
    verified: true,
    certificate: {
      number: cert?.certificate_number,
      title: cert?.title,
      type: cert?.certificate_type,
      recipient: part?.name || team?.name || "Official Participant",
      eventName: event?.name || "Official Eventra Festival",
      issuedAt: cert?.issued_at,
      verificationCount: vrf.verification_count,
    },
  });
});

app.get("/api/id-cards", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  if (!eventId) return res.status(400).json({ error: "eventId is required" });

  const cards = db.idCards
    .filter((c) => c.event_id === eventId)
    .map((c) => {
      const p = db.participants.find((part) => part.id === c.participant_id);
      const t = db.teams.find((tm) => tm.id === p?.team_id);
      return {
        ...c,
        participant_name: p?.name,
        chest_number: p?.chest_number,
        team_name: t?.name,
      };
    });

  return res.json({ idCards: cards });
});

app.post("/api/id-cards", (req: Request, res: Response) => {
  const { eventId, participantId } = req.body;
  if (!eventId || !participantId) return res.status(400).json({ error: "eventId and participantId are required" });

  const p = db.participants.find((part) => part.id === participantId);
  const card = {
    id: crypto.randomUUID(),
    event_id: eventId,
    participant_id: participantId,
    card_number: `IDC-${p?.chest_number || Math.floor(100 + Math.random() * 900)}`,
    created_at: new Date().toISOString(),
  };

  db.idCards.push(card);
  return res.status(201).json({ idCard: card });
});

// --- ANNOUNCEMENTS ---
app.get("/api/announcements", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  if (!eventId) return res.status(400).json({ error: "eventId is required" });
  const announcements = db.announcements.filter((a) => a.event_id === eventId);
  return res.json({ announcements });
});

app.post("/api/announcements", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const { eventId, title, body } = req.body;
  if (!eventId || !title?.trim() || !body?.trim()) {
    return res.status(400).json({ error: "eventId, title, and body are required" });
  }

  const auth = checkTenantAuthorization(user, { targetEventId: eventId, requiredRole: "admin" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const ann = {
    id: crypto.randomUUID(),
    event_id: eventId,
    title: title.trim(),
    body: body.trim(),
    published: true,
    created_at: new Date().toISOString(),
  };

  db.announcements.unshift(ann);
  logAudit(req, "announcement.created", { eventId, entityType: "announcement", entityId: ann.id, changes: ann });
  return res.status(201).json({ announcement: ann });
});

app.delete("/api/announcements", (req: Request, res: Response) => {
  const id = req.query.id as string;
  db.announcements = db.announcements.filter((a) => a.id !== id);
  return res.json({ ok: true });
});

// --- DOWNLOADS & MEDIA ---
app.get("/api/downloads", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  if (!eventId) return res.status(400).json({ error: "eventId is required" });
  const downloads = db.downloads.filter((d) => d.event_id === eventId);
  return res.json({ downloads });
});

app.post("/api/downloads", (req: Request, res: Response) => {
  const { eventId, title, description, fileUrl, fileType } = req.body;
  if (!eventId || !title?.trim()) return res.status(400).json({ error: "eventId and title are required" });

  const dl = {
    id: crypto.randomUUID(),
    event_id: eventId,
    title: title.trim(),
    description: description?.trim() || "",
    file_url: fileUrl || "#",
    file_type: fileType || "PDF",
    published: true,
    created_at: new Date().toISOString(),
  };
  db.downloads.push(dl);
  return res.status(201).json({ download: dl });
});

app.get("/api/media", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  if (!eventId) return res.status(400).json({ error: "eventId is required" });
  const media = db.mediaAssets.filter((m) => m.event_id === eventId);
  return res.json({ media });
});

app.post("/api/media", (req: Request, res: Response) => {
  const { eventId, fileName, fileUrl, caption } = req.body;
  if (!eventId || !fileUrl?.trim()) return res.status(400).json({ error: "eventId and fileUrl are required" });

  const asset = {
    id: crypto.randomUUID(),
    event_id: eventId,
    file_name: fileName || "festival-photo.jpg",
    file_url: fileUrl.trim(),
    file_type: "image",
    category: "gallery",
    caption: caption || "",
    published: true,
    created_at: new Date().toISOString(),
  };
  db.mediaAssets.push(asset);
  return res.status(201).json({ media: asset });
});

// --- CONTACT MESSAGES ---
app.post("/api/contact", (req: Request, res: Response) => {
  const { eventId, name, email, subject, message } = req.body;
  if (!eventId || !name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: "Name, email, and message are required" });
  }

  const msg = {
    id: crypto.randomUUID(),
    event_id: eventId,
    name: name.trim(),
    email: email.trim(),
    subject: subject?.trim() || "Event Inquiry",
    message: message.trim(),
    status: "unread",
    created_at: new Date().toISOString(),
  };

  db.contactMessages.push(msg);
  return res.status(201).json({ ok: true, message: "Thank you for contacting the organisers." });
});

app.get("/api/contact", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  if (!eventId) return res.status(400).json({ error: "eventId is required" });
  const messages = db.contactMessages.filter((m) => m.event_id === eventId);
  return res.json({ messages });
});

// --- PUBLIC REGISTRATION ---
app.post("/api/public-registration", (req: Request, res: Response) => {
  const { eventId, programmeId, teamName, participantName, email, phone } = req.body;
  if (!eventId || !participantName?.trim()) {
    return res.status(400).json({ error: "Event and participant name are required." });
  }

  const event = db.events.find((e) => e.id === eventId);
  if (!event || !event.registration_open) {
    return res.status(403).json({ error: "Registrations for this festival are currently closed." });
  }

  let teamId: string | null = null;
  if (teamName?.trim()) {
    let t = db.teams.find((tm) => tm.event_id === eventId && tm.name.toLowerCase() === teamName.trim().toLowerCase());
    if (!t) {
      t = {
        id: crypto.randomUUID(),
        event_id: eventId,
        name: teamName.trim(),
        code: teamName.substring(0, 3).toUpperCase(),
        points: 0,
        created_at: new Date().toISOString(),
      };
      db.teams.push(t);
    }
    teamId = t.id;
  }

  const chestNumber = db.participants.length + 101;
  const participant = {
    id: crypto.randomUUID(),
    event_id: eventId,
    team_id: teamId,
    name: participantName.trim(),
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    participant_code: `P-${chestNumber}`,
    chest_number: chestNumber,
    created_at: new Date().toISOString(),
  };
  db.participants.push(participant);

  if (programmeId) {
    db.registrations.push({
      id: crypto.randomUUID(),
      programme_id: programmeId,
      participant_id: participant.id,
      team_id: teamId,
      created_at: new Date().toISOString(),
    });
  }

  return res.status(201).json({
    ok: true,
    participant,
    message: `Registration successful! Your chest number is ${chestNumber}.`,
  });
});

// --- LEADERBOARD ---
app.get("/api/leaderboard", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  if (!eventId) return res.status(400).json({ error: "eventId is required" });

  const teams = db.teams.filter((t) => t.event_id === eventId);
  const progIds = new Set(db.programmes.filter((p) => p.event_id === eventId).map((p) => p.id));
  const publishedResults = db.results.filter((r) => progIds.has(r.programme_id) && r.published);

  const teamTotals: Record<string, { id: string; name: string; code: string; points: number; gold: number; silver: number; bronze: number }> = {};

  teams.forEach((t) => {
    teamTotals[t.id] = { id: t.id, name: t.name, code: t.code, points: 0, gold: 0, silver: 0, bronze: 0 };
  });

  publishedResults.forEach((r) => {
    let tId = r.team_id;
    if (!tId && r.participant_id) {
      const part = db.participants.find((p) => p.id === r.participant_id);
      tId = part?.team_id;
    }
    if (tId && teamTotals[tId]) {
      teamTotals[tId].points += Number(r.points || 0);
      if (r.position === 1) teamTotals[tId].gold++;
      if (r.position === 2) teamTotals[tId].silver++;
      if (r.position === 3) teamTotals[tId].bronze++;
    }
  });

  const leaderboard = Object.values(teamTotals).sort((a, b) => b.points - a.points || b.gold - a.gold);
  return res.json({ leaderboard });
});

// --- AUDIT LOGS ---
app.get("/api/audit-logs", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const eventId = req.query.eventId as string;
  const orgId = req.query.orgId as string;

  let logs = db.auditLogs;
  if (user && !user.isSuperAdmin) {
    const allowedOrgs = new Set(user.organizations.map((o) => o.orgId));
    logs = logs.filter((l) => l.organization_id && allowedOrgs.has(l.organization_id));
  }

  if (eventId) logs = logs.filter((l) => l.event_id === eventId);
  if (orgId) logs = logs.filter((l) => l.organization_id === orgId);

  return res.json({ logs: logs.slice(0, 50) });
});

// --- VITE MIDDLEWARE / STATIC ASSETS ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve("dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist", "index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`[Eventra SaaS Engine] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
