import crypto from "crypto";
import { db } from "./db";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  globalRole: string;
  roles: string[];
  token: string;
  expiresAt: string;
}

const activeTokens = new Map<string, UserSession>();

export function createToken(user: { id: string; email: string; display_name: string; roles?: string[]; role?: string }): UserSession {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
  const roles = user.roles || (user.role ? [user.role] : ["viewer"]);
  const globalRole = roles.includes("admin") ? "admin" : roles[0] || "viewer";

  const sessionUser: UserSession = {
    id: user.id,
    email: user.email.toLowerCase(),
    name: user.display_name,
    globalRole,
    roles,
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

// RBAC Check
export function checkAuthorization(
  user: UserSession | null,
  options: {
    eventId?: string;
    programmeId?: string;
    requiredRole?: "admin" | "organizer" | "coordinator" | "judge" | "any";
  }
): { ok: boolean; status: number; error?: string } {
  if (!user) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  // Super Admin can do everything
  if (user.globalRole === "admin") {
    return { ok: true, status: 200 };
  }

  const { eventId, programmeId, requiredRole } = options;

  // Check event-level role assignment
  if (eventId) {
    const assignment = db.eventRoles.find(
      (r) => r.event_id === eventId && r.email.toLowerCase() === user.email.toLowerCase() && r.active
    );

    if (!assignment) {
      return { ok: false, status: 403, error: "You are not assigned to this event" };
    }

    if (requiredRole === "judge") {
      if (assignment.role !== "judge" && assignment.role !== "admin" && assignment.role !== "organizer") {
        return { ok: false, status: 403, error: "Judge role required" };
      }
    }

    if (requiredRole === "organizer" || requiredRole === "coordinator") {
      if (assignment.role !== "organizer" && assignment.role !== "admin") {
        return { ok: false, status: 403, error: "Organizer or Admin authorization required" };
      }
    }
  }

  // If programme specified and user is a judge, verify judge assignment
  if (programmeId && user.globalRole === "judge") {
    const isAssigned = db.judgeAssignments.some(
      (ja) => ja.programme_id === programmeId && ja.email.toLowerCase() === user.email.toLowerCase() && ja.active
    );

    if (!isAssigned) {
      return { ok: false, status: 403, error: "You are not assigned to score this competition programme" };
    }
  }

  return { ok: true, status: 200 };
}
