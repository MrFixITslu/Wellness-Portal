import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db, User } from "./db";

const SESSION_COOKIE = "sw_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Creates a new session for a user and sets the session cookie on the
 * response. The raw token only ever lives in the httpOnly cookie — only
 * its SHA-256 hash is stored server-side, so a database read can't leak
 * usable session tokens.
 */
export function issueSession(res: Response, user: User): void {
  const rawToken = crypto.randomBytes(32).toString("hex");
  db.sessions.create(user.id, hashToken(rawToken), SESSION_TTL_MS);

  res.cookie(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearSession(req: Request, res: Response): void {
  const rawToken = req.cookies?.[SESSION_COOKIE];
  if (rawToken) {
    db.sessions.destroy(hashToken(rawToken));
  }
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

// Augment Express's Request type with the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      currentUser?: User;
    }
  }
}

/**
 * Reads the session cookie (if present) and attaches the corresponding
 * user to req.currentUser. Runs on every request; does NOT reject
 * unauthenticated requests by itself — pair with requireAuth for that.
 */
export function attachSession(req: Request, _res: Response, next: NextFunction): void {
  const rawToken = req.cookies?.[SESSION_COOKIE];
  if (!rawToken) return next();

  const session = db.sessions.find(hashToken(rawToken));
  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    return next();
  }

  const user = db.users.find(session.user_id);
  if (user) {
    req.currentUser = user;
  }
  next();
}

/** Rejects the request unless a valid session is attached. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.currentUser) {
    res.status(401).json({ error: "Please sign in to continue." });
    return;
  }
  next();
}

/**
 * Rejects the request unless the authenticated user's id matches the
 * given route param — i.e. you can only read/write your OWN journals,
 * settings, moods, etc. Must be used after requireAuth.
 */
export function requireSelf(paramName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.currentUser!.id !== req.params[paramName]) {
      res.status(403).json({ error: "You don't have permission to access this resource." });
      return;
    }
    next();
  };
}

/** Rejects the request unless the authenticated user has the given role. */
export function requireRole(...roles: Array<User["role"]>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.currentUser || !roles.includes(req.currentUser.role)) {
      res.status(403).json({ error: "You don't have permission to perform this action." });
      return;
    }
    next();
  };
}
