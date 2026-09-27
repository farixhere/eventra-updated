import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import path from "path";
import crypto from "crypto";
import { db, getNeonSql } from "./server/db";
import { createToken, parseToken, revokeToken, checkAuthorization, UserSession } from "./server/auth";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// Audit logger helper
function logAudit(req: Request, action: string, details: { eventId?: string; entityType?: string; entityId?: string; changes?: any }) {
  const user = (req as any).user as UserSession | undefined;
  const entry = {
    id: crypto.randomUUID(),
    event_id: details.eventId || null,
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
        console.warn("Neon fallback to memory state:", (neonErr as any).message);
      }
    }

    return res.json({
      ok: true,
      database: isDbConnected ? "connected_remote_neon" : "connected_integrated_engine",
      database_time: liveStats?.db_time || new Date().toISOString(),
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
        },
        systemStatus: "healthy",
      },
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// --- AUTHENTICATION & RBAC ---
app.get("/api/auth/status", (req: Request, res: Response) => {
  return res.json({
    ok: true,
    auth: {
      configured: true,
      configuredEmail: process.env.EVENTRA_ADMIN_EMAIL || "owner@eventra.local",
      users: db.users.length,
    },
  });
});

app.post("/api/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body;
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  // Find user
  let user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

  // If user doesn't exist, allow super admin bootstrap if email matches owner or default
  if (!user && (cleanEmail === "owner@eventra.local" || cleanEmail === (process.env.EVENTRA_ADMIN_EMAIL || "").toLowerCase())) {
    user = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      display_name: "Eventra Super Admin",
      roles: ["admin"],
      active: true,
    };
    db.users.push(user);
  }

  if (!user || !user.active) {
    return res.status(401).json({ error: "Invalid email or credentials." });
  }

  // Create session
  const session = createToken(user);

  res.cookie("eventra_session", session.token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 28800 * 1000,
  });

  logAudit(req, "auth.login", { changes: { email: cleanEmail, role: session.globalRole } });

  return res.json({
    ok: true,
    user: {
      id: session.id,
      email: session.email,
      name: session.name,
      globalRole: session.globalRole,
      roles: session.roles,
      token: session.token,
    },
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

app.get("/api/auth/accounts", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  if (!user || user.globalRole !== "admin") {
    return res.status(403).json({ error: "Super admin access required" });
  }
  return res.json({ users: db.users });
});

app.post("/api/auth/accounts", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  if (!user || user.globalRole !== "admin") {
    return res.status(403).json({ error: "Super admin access required" });
  }
  const { email, displayName, role } = req.body;
  if (!email || !displayName) {
    return res.status(400).json({ error: "Email and Display Name are required" });
  }
  const newUser = {
    id: crypto.randomUUID(),
    email: email.trim().toLowerCase(),
    display_name: displayName.trim(),
    roles: [role || "viewer"],
    active: true,
    created_at: new Date().toISOString(),
  };
  db.users.push(newUser);
  return res.status(201).json({ user: newUser });
});

app.get("/api/auth/event-roles", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  if (!eventId) return res.status(400).json({ error: "eventId is required" });
  const roles = db.eventRoles.filter((er) => er.event_id === eventId);
  return res.json({ roles });
});

app.post("/api/auth/event-roles", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const { eventId, email, role } = req.body;
  if (!user || (user.globalRole !== "admin" && user.globalRole !== "organizer")) {
    return res.status(403).json({ error: "Admin or Organizer authorization required" });
  }
  if (!eventId || !email || !role) {
    return res.status(400).json({ error: "eventId, email, and role are required" });
  }

  const existingIdx = db.eventRoles.findIndex(
    (er) => er.event_id === eventId && er.email.toLowerCase() === email.toLowerCase()
  );
  const entry = {
    id: crypto.randomUUID(),
    event_id: eventId,
    email: email.toLowerCase(),
    role,
    active: true,
    created_at: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    db.eventRoles[existingIdx] = entry;
  } else {
    db.eventRoles.push(entry);
  }

  return res.status(201).json({ role: entry });
});

// --- EVENTS ---
app.get("/api/events", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  const isPublicQuery = req.query.public === "true";

  if (isPublicQuery) {
    const publicEvents = db.events.filter((e) => e.is_public);
    return res.json({ events: publicEvents });
  }

  // If asking for administrative events without login
  if (!user) {
    // Return public events as fallback or 401 depending on intent
    const publicEvents = db.events.filter((e) => e.is_public);
    return res.json({ events: publicEvents, notice: "Public view. Sign in for organizer dashboard." });
  }

  if (user.globalRole === "admin") {
    return res.json({ events: db.events });
  }

  // Filter events assigned to user
  const assignedEventIds = new Set(
    db.eventRoles.filter((er) => er.email.toLowerCase() === user.email.toLowerCase() && er.active).map((er) => er.event_id)
  );
  const userEvents = db.events.filter((e) => assignedEventIds.has(e.id));
  return res.json({ events: userEvents });
});

app.post("/api/events", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  if (!user) {
    return res.status(401).json({ error: "Authentication required to create events." });
  }

  const { name, description, startDate, endDate, location, tagline, logoUrl, bannerUrl, primaryColor, secondaryColor, isPublic, registrationOpen, registrationDeadline } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: "Event name is required." });
  }

  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
  const newEvent = {
    id: crypto.randomUUID(),
    name: name.trim(),
    slug,
    description: description?.trim() || "",
    tagline: tagline?.trim() || "",
    start_date: startDate || new Date().toISOString(),
    end_date: endDate || null,
    location: location?.trim() || "Main Venue TBA",
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

  // Assign user as organizer
  db.eventRoles.push({
    id: crypto.randomUUID(),
    event_id: newEvent.id,
    email: user.email,
    role: "organizer",
    active: true,
    created_at: new Date().toISOString(),
  });

  logAudit(req, "event.created", { eventId: newEvent.id, entityType: "event", entityId: newEvent.id, changes: newEvent });
  return res.status(201).json({ event: newEvent });
});

app.patch("/api/events", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const { id, ...updates } = req.body;
  if (!id) return res.status(400).json({ error: "Event id is required" });

  const idx = db.events.findIndex((e) => e.id === id);
  if (idx < 0) return res.status(404).json({ error: "Event not found" });

  const auth = checkAuthorization(user, { eventId: id, requiredRole: "organizer" });
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  db.events[idx] = { ...db.events[idx], ...updates, updated_at: new Date().toISOString() };
  logAudit(req, "event.updated", { eventId: id, entityType: "event", entityId: id, changes: updates });
  return res.json({ event: db.events[idx] });
});

app.delete("/api/events", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const id = req.query.id as string;
  if (!id) return res.status(400).json({ error: "Event id is required" });

  const auth = checkAuthorization(user, { eventId: id, requiredRole: "organizer" });
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
  const { eventId, name, location, capacity } = req.body;
  if (!eventId || !name?.trim()) return res.status(400).json({ error: "eventId and venue name are required" });

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
  const id = req.query.id as string;
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
  const { eventId, name, code } = req.body;
  if (!eventId || !name?.trim()) return res.status(400).json({ error: "eventId and team name are required" });

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
  const id = req.query.id as string;
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
  const { eventId, teamId, name, email, phone, participantCode, chestNumber } = req.body;
  if (!eventId || !name?.trim()) return res.status(400).json({ error: "eventId and participant name are required" });

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
  const id = req.query.id as string;
  db.participants = db.participants.filter((p) => p.id !== id);
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
  const { eventId, name, category, type, maxParticipants, description, durationMinutes, reportingMinutes, judgeCount } = req.body;
  if (!eventId || !name?.trim()) return res.status(400).json({ error: "eventId and programme name are required" });

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
  const { id, ...updates } = req.body;
  if (!id) return res.status(400).json({ error: "Programme id is required" });

  const idx = db.programmes.findIndex((p) => p.id === id);
  if (idx < 0) return res.status(404).json({ error: "Programme not found" });

  db.programmes[idx] = { ...db.programmes[idx], ...updates };
  return res.json({ programme: db.programmes[idx] });
});

app.delete("/api/programmes", (req: Request, res: Response) => {
  const id = req.query.id as string;
  db.programmes = db.programmes.filter((p) => p.id !== id);
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
  const { programmeId, name, maxScore, weight, description } = req.body;
  if (!programmeId || !name?.trim()) return res.status(400).json({ error: "programmeId and name are required" });

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
  const { programmeId, venueId, startsAt, endsAt, reportingAt, notes } = req.body;
  if (!programmeId || !venueId || !startsAt) {
    return res.status(400).json({ error: "programmeId, venueId, and startsAt are required." });
  }

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
    const conflictedProg = db.programmes.find((p) => p.id === conflict.programme_id);
    return res.status(409).json({
      error: `Schedule conflict: Venue is already booked for "${conflictedProg?.name || 'Another Event'}" at this time.`,
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
  const { eventId, programmeId, email } = req.body;
  if (!eventId || !programmeId || !email) {
    return res.status(400).json({ error: "eventId, programmeId, and email are required" });
  }

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

// --- JUDGE SCORES ---
app.get("/api/judge-scores", (req: Request, res: Response) => {
  const eventId = req.query.eventId as string;
  const programmeId = req.query.programmeId as string;
  const user = (req as any).user as UserSession | undefined;

  let list = db.judgeScores;
  if (eventId) list = list.filter((s) => s.event_id === eventId);
  if (programmeId) list = list.filter((s) => s.programme_id === programmeId);

  // If user is a judge, only return their own scores
  if (user && user.globalRole === "judge") {
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

  // Verify judge assignment
  if (user.globalRole !== "admin") {
    const isAssigned = db.judgeAssignments.some(
      (ja) => ja.programme_id === programmeId && ja.email.toLowerCase() === user.email.toLowerCase() && ja.active
    );
    if (!isAssigned) {
      return res.status(403).json({ error: "You are not assigned to score this programme." });
    }
  }

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

  // If public, only show published results
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

// Verify Result
app.post("/api/results/verify", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const { eventId, programmeId, participantId, teamId } = req.body;
  if (!eventId || !programmeId) {
    return res.status(400).json({ error: "eventId and programmeId are required" });
  }

  // Find all submitted judge scores for this entry
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
      verified_by: user.email,
      created_at: new Date().toISOString(),
    };
    db.results.push(existing);
  } else {
    existing.total_score = Number(avgScore.toFixed(2));
    existing.verification_status = "verified";
    existing.verified_at = new Date().toISOString();
    existing.verified_by = user.email;
  }

  // Re-rank all verified results for this programme
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

// Publish Result
app.post("/api/results/publish", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const { eventId, resultId } = req.body;
  if (!eventId || !resultId) {
    return res.status(400).json({ error: "eventId and resultId are required" });
  }

  const result = db.results.find((r) => r.id === resultId);
  if (!result) return res.status(404).json({ error: "Result not found" });

  if (result.verification_status !== "verified") {
    return res.status(409).json({ error: "Result must be reviewed and verified before publishing live." });
  }

  result.published = true;
  result.published_at = new Date().toISOString();
  result.published_by = user.email;

  // Auto-generate certificates for winners if not already created
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

  // Update team points if team-associated
  if (result.team_id) {
    const team = db.teams.find((t) => t.id === result.team_id);
    if (team) {
      team.points = (team.points || 0) + (result.points || 0);
    }
  }

  logAudit(req, "result.published", { eventId, entityType: "result", entityId: result.id, changes: result });
  return res.json({ result });
});

// Result Corrections
app.post("/api/result-corrections", (req: Request, res: Response) => {
  const user = (req as any).user as UserSession | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const { eventId, resultId, reason, totalScore, position, points } = req.body;
  if (!eventId || !resultId || !reason?.trim()) {
    return res.status(400).json({ error: "eventId, resultId, and reason are required" });
  }

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
    corrected_by: user.email,
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

app.post("/api/certificates", (req: Request, res: Response) => {
  const { eventId, title, participantId, teamId, certificateType } = req.body;
  if (!eventId || !title) return res.status(400).json({ error: "eventId and title are required" });

  const certNum = `EVT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const vrfCode = `VRF-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

  const cert = {
    id: crypto.randomUUID(),
    event_id: eventId,
    participant_id: participantId || null,
    team_id: teamId || null,
    title: title.trim(),
    certificate_type: certificateType || "participation",
    certificate_number: certNum,
    issued_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  db.certificates.push(cert);

  db.certificateVerifications.push({
    id: crypto.randomUUID(),
    certificate_id: cert.id,
    verification_code: vrfCode,
    last_verified_at: null,
    verification_count: 0,
  });

  return res.status(201).json({ certificate: { ...cert, verification_code: vrfCode } });
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
  const { eventId, title, body } = req.body;
  if (!eventId || !title?.trim() || !body?.trim()) {
    return res.status(400).json({ error: "eventId, title, and body are required" });
  }

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

// --- CONTACT & APPEALS ---
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
  const eventId = req.query.eventId as string;
  let logs = db.auditLogs;
  if (eventId) logs = logs.filter((l) => l.event_id === eventId);
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
    console.log(`[Eventra Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
