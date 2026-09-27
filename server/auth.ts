import crypto from "crypto";
import { db } from "./db";

export interface UserSessionOrg {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: "owner" | "admin" | "coordinator" | "judge" | "team-mgr" | "member";
  planCode: string;
  subStatus: string;
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  emailVerified: boolean;
  organizations: UserSessionOrg[];
  activeOrgId: string;
  activeRole: string;
  token: string;
  expiresAt: string;
}

const activeTokens = new Map<string, UserSession>();

export function getUserOrganizations(userId: string, isSuperAdmin: boolean): UserSessionOrg[] {
  if (isSuperAdmin) {
    return db.organizations.map((org) => {
      const sub = db.organizationSubscriptions.find((s) => s.organization_id === org.id);
      return {
        orgId: org.id,
        orgName: org.name,
        orgSlug: org.slug,
        role: "owner" as const,
        planCode: sub?.plan_code || "enterprise",
        subStatus: sub?.status || "active",
      };
    });
  }

  const memberships = db.organizationMembers.filter(
    (m) => m.user_id === userId && m.status === "active"
  );

  return memberships.map((m) => {
    const org = db.organizations.find((o) => o.id === m.organization_id);
    const sub = db.organizationSubscriptions.find((s) => s.organization_id === m.organization_id);
    return {
      orgId: m.organization_id,
      orgName: org?.name || "Workspace",
      orgSlug: org?.slug || "workspace",
      role: m.role,
      planCode: sub?.plan_code || "trial",
      subStatus: sub?.status || "trialing",
    };
  });
}

export function createToken(user: {
  id: string;
  email: string;
  display_name: string;
  email_verified?: boolean;
}): UserSession {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
  const cleanEmail = user.email.toLowerCase();

  const isSuperAdmin =
    cleanEmail === "owner@eventra.local" ||
    cleanEmail === (process.env.EVENTRA_ADMIN_EMAIL || "").toLowerCase();

  const orgs = getUserOrganizations(user.id, isSuperAdmin);
  const activeOrg = orgs[0] || null;

  const sessionUser: UserSession = {
    id: user.id,
    email: cleanEmail,
    name: user.display_name,
    isSuperAdmin,
    emailVerified: Boolean(user.email_verified ?? true),
    organizations: orgs,
    activeOrgId: activeOrg?.orgId || "",
    activeRole: isSuperAdmin ? "super_admin" : (activeOrg?.role || "member"),
    token,
    expiresAt,
  };

  activeTokens.set(token, sessionUser);
  return sessionUser;
}

export function parseToken(token?: string | null): UserSession | null {
  if (!token) return null;
  const session = activeTokens.get(token);
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    activeTokens.delete(token);
    return null;
  }
  return session;
}

export function revokeToken(token?: string | null): void {
  if (token) activeTokens.delete(token);
}

// Multi-Tenant RBAC Authorization Checker
export function checkTenantAuthorization(
  user: UserSession | null | undefined,
  options: {
    targetOrgId?: string;
    targetEventId?: string;
    targetProgrammeId?: string;
    requiredRole?: "owner" | "admin" | "coordinator" | "judge" | "any";
  }
): { ok: boolean; status: number; error?: string; organizationId?: string } {
  if (!user) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  // Faris (Super Admin) has platform-level omni access
  if (user.isSuperAdmin) {
    return { ok: true, status: 200, organizationId: options.targetOrgId || user.activeOrgId };
  }

  let orgId = options.targetOrgId;

  // If event specified, resolve its owning organization
  if (options.targetEventId) {
    const event = db.events.find((e) => e.id === options.targetEventId);
    if (!event) {
      return { ok: false, status: 404, error: "Event not found" };
    }
    orgId = event.organization_id;
  }

  // If no org resolved, reject
  if (!orgId) {
    return { ok: false, status: 400, error: "Organization context required" };
  }

  const cleanOrgId = String(orgId || "").trim().toLowerCase();
  const cleanUserId = String(user.id || "").trim().toLowerCase();

  // Verify that the user has access to this organization via session or membership
  const sessionOrg = user.organizations?.find(
    (o) => String(o.orgId || "").trim().toLowerCase() === cleanOrgId
  );
  const membership = db.organizationMembers.find(
    (m) =>
      String(m.organization_id || "").trim().toLowerCase() === cleanOrgId &&
      String(m.user_id || "").trim().toLowerCase() === cleanUserId &&
      m.status === "active"
  );

  const effectiveRole = sessionOrg?.role || membership?.role;

  if (!sessionOrg && !membership) {
    return {
      ok: false,
      status: 403,
      error: "Tenant isolation policy: You do not have access to this organization's workspace",
    };
  }

  const { requiredRole } = options;

  // Role hierarchy check
  if (requiredRole === "owner" && effectiveRole !== "owner") {
    return { ok: false, status: 403, error: "Organization owner privileges required" };
  }

  if (requiredRole === "admin" && effectiveRole !== "owner" && effectiveRole !== "admin") {
    return { ok: false, status: 403, error: "Organization admin privileges required" };
  }

  if (
    requiredRole === "coordinator" &&
    effectiveRole !== "owner" &&
    effectiveRole !== "admin" &&
    effectiveRole !== "coordinator"
  ) {
    return { ok: false, status: 403, error: "Coordinator or admin privileges required" };
  }

  // Judge Isolation: Judge can only view and score their assigned programmes
  if (options.targetProgrammeId && (membership.role === "judge" || user.activeRole === "judge")) {
    const isAssigned = db.judgeAssignments.some(
      (ja) =>
        ja.programme_id === options.targetProgrammeId &&
        ja.email.toLowerCase() === user.email.toLowerCase() &&
        ja.active
    );
    if (!isAssigned) {
      return {
        ok: false,
        status: 403,
        error: "Judge boundary enforcement: You are not assigned to score this competition programme",
      };
    }
  }

  return { ok: true, status: 200, organizationId: orgId };
}
