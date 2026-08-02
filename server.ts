import express, { Request, Response } from "express";
import path from "path";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { db } from "./server/db";
import { encrypt, decrypt } from "./server/crypto";
import { runSafetyPipeline } from "./server/gemini";
import { issueSession, clearSession, attachSession, requireAuth, requireSelf, requireRole } from "./server/auth";

const isProd = process.env.NODE_ENV === "production";

/**
 * Logs the full error server-side but only echoes safe detail to the
 * client. In dev, the real message is included to speed up debugging;
 * in production it isn't, since stack/internals shouldn't leak to callers.
 */
function handleError(res: Response, error: unknown, fallback: string): void {
  console.error(fallback, error);
  const message = !isProd && error instanceof Error ? error.message : fallback;
  res.status(500).json({ error: message });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Behind Nginx Proxy Manager / any reverse proxy, this makes req.ip and
  // req.secure reflect the real client instead of the proxy hop.
  app.set("trust proxy", 1);

  app.use(helmet({
    // CSP is left off for now rather than shipping a broken default —
    // add a real policy once asset hashes/nonces are wired up for prod.
    contentSecurityPolicy: false,
  }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachSession);

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
  const aiChatLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

  // ----------------------------------------------------
  // API ROUTES (Always register API routes FIRST)
  // ----------------------------------------------------

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // 1. ANONYMOUS AUTHENTICATION
  app.post("/api/auth/register", authLimiter, (req, res) => {
    try {
      const { anonymous_username, avatar_id, country, moderator_invite_code } = req.body;
      if (!anonymous_username || !avatar_id || !country) {
        return res.status(400).json({ error: "Missing required profile fields" });
      }

      const existing = db.users.findByUsername(anonymous_username);
      if (existing) {
        return res.status(400).json({ error: "That anonymous username is already in use" });
      }

      // SECURITY: role is NEVER trusted from the client. The only way to
      // register as a moderator is to know a server-side secret that the
      // client never sees the value of.
      const inviteCode = process.env.MODERATOR_INVITE_CODE;
      const role = inviteCode && moderator_invite_code === inviteCode ? "moderator" : "user";

      const user = db.users.create({ anonymous_username, avatar_id, country, role });
      issueSession(res, user);

      db.audit.log(user.id, "USER_REGISTER", `Anonymous user registered with country: ${country}`, req.ip);
      res.status(201).json(user);
    } catch (error) {
      handleError(res, error, "Registration failed");
    }
  });

  // Resume an existing session from the session cookie (replaces the old
  // "log in with any user id you know" flow, which was equivalent to
  // account takeover for a passwordless app).
  app.get("/api/auth/session", (req, res) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: "No active session" });
    }
    res.json(req.currentUser);
  });

  app.post("/api/auth/logout", (req, res) => {
    clearSession(req, res);
    res.json({ message: "Session ended" });
  });

  // 2. USER SETTINGS
  app.get("/api/users/:userId/settings", requireAuth, requireSelf("userId"), (req, res) => {
    try {
      res.json(db.settings.get(req.params.userId));
    } catch (error) {
      handleError(res, error, "Could not load settings");
    }
  });

  app.put("/api/users/:userId/settings", requireAuth, requireSelf("userId"), (req, res) => {
    try {
      const updated = db.settings.update(req.params.userId, req.body);
      db.audit.log(req.params.userId, "UPDATE_SETTINGS", `User updated privacy or theme settings`, req.ip);
      res.json(updated);
    } catch (error) {
      handleError(res, error, "Could not update settings");
    }
  });

  // 3. MOOD TRACKING
  app.get("/api/users/:userId/moods", requireAuth, requireSelf("userId"), (req, res) => {
    try {
      res.json(db.moods.list(req.params.userId));
    } catch (error) {
      handleError(res, error, "Could not load mood history");
    }
  });

  app.post("/api/users/:userId/moods", requireAuth, requireSelf("userId"), (req, res) => {
    try {
      const { mood_score, stress_level, energy_level, sleep_quality, note } = req.body;
      if (!mood_score || !stress_level || !energy_level || !sleep_quality) {
        return res.status(400).json({ error: "Missing mood tracking values" });
      }

      const checkin = db.moods.create({
        user_id: req.params.userId,
        mood_score: Number(mood_score),
        stress_level: Number(stress_level),
        energy_level: Number(energy_level),
        sleep_quality: Number(sleep_quality),
        note: note || "",
      });

      db.audit.log(req.params.userId, "MOOD_CHECKIN", `Recorded mood: ${mood_score}, stress: ${stress_level}`, req.ip);
      res.status(201).json(checkin);
    } catch (error) {
      handleError(res, error, "Could not save mood check-in");
    }
  });

  // 4. PRIVATE JOURNAL WITH AES-256-GCM ENCRYPTION
  app.get("/api/users/:userId/journals", requireAuth, requireSelf("userId"), (req, res) => {
    try {
      const list = db.journals.list(req.params.userId);
      const decryptedList = list.map((j) => ({ ...j, content: decrypt(j.encrypted_content) }));
      res.json(decryptedList);
    } catch (error) {
      handleError(res, error, "Could not load journal entries");
    }
  });

  app.post("/api/users/:userId/journals", requireAuth, requireSelf("userId"), (req, res) => {
    try {
      const { title, content, mood_tag } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: "Journal title and content are required" });
      }

      const encrypted_content = encrypt(content);
      const journal = db.journals.create({ user_id: req.params.userId, title, encrypted_content, mood_tag: mood_tag || "" });

      // Secure Audit Log: log entry creation, but never log the actual content or encryption strings!
      db.audit.log(req.params.userId, "JOURNAL_CREATE", `Created journal entry: "${title}" (Content encrypted successfully)`, req.ip);

      res.status(201).json({
        id: journal.id,
        user_id: journal.user_id,
        title: journal.title,
        mood_tag: journal.mood_tag,
        created_at: journal.created_at,
        content, // Echo back decrypted to front end for instant display
      });
    } catch (error) {
      handleError(res, error, "Could not save journal entry");
    }
  });

  app.delete("/api/users/:userId/journals/:journalId", requireAuth, requireSelf("userId"), (req, res) => {
    try {
      const { userId, journalId } = req.params;
      const success = db.journals.delete(journalId, userId);
      if (success) {
        db.audit.log(userId, "JOURNAL_DELETE", `Deleted journal entry: ${journalId}`, req.ip);
        res.json({ message: "Journal entry permanently deleted" });
      } else {
        res.status(404).json({ error: "Journal entry not found" });
      }
    } catch (error) {
      handleError(res, error, "Could not delete journal entry");
    }
  });

  // 5. COMMUNITY FORUMS
  app.get("/api/communities", (_req, res) => {
    try {
      res.json(db.communities.list());
    } catch (error) {
      handleError(res, error, "Could not load communities");
    }
  });

  app.post("/api/communities/:communityId/join", requireAuth, (req, res) => {
    try {
      const joined = db.communities.join(req.params.communityId, req.currentUser!.id);
      db.audit.log(req.currentUser!.id, "COMMUNITY_JOIN", `Joined community: ${req.params.communityId}`, req.ip);
      res.json(joined);
    } catch (error) {
      handleError(res, error, "Could not join community");
    }
  });

  app.get("/api/communities/joined", requireAuth, (req, res) => {
    try {
      res.json(db.communities.joinedByUser(req.currentUser!.id));
    } catch (error) {
      handleError(res, error, "Could not load your communities");
    }
  });

  // Posts inside communities
  app.get("/api/posts", (req, res) => {
    try {
      const communityId = req.query.communityId as string;
      res.json(db.posts.list(communityId));
    } catch (error) {
      handleError(res, error, "Could not load posts");
    }
  });

  app.post("/api/posts", requireAuth, (req, res) => {
    try {
      const { community_id, anonymous_author, title, content } = req.body;
      if (!community_id || !anonymous_author || !title || !content) {
        return res.status(400).json({ error: "Missing required post fields" });
      }

      // user_id always comes from the session, never the request body —
      // otherwise anyone could author a post as someone else.
      const post = db.posts.create({ community_id, user_id: req.currentUser!.id, anonymous_author, title, content });

      db.audit.log(req.currentUser!.id, "POST_CREATE", `Created post in community ${community_id}: "${title}"`, req.ip);
      res.status(201).json(post);
    } catch (error) {
      handleError(res, error, "Could not create post");
    }
  });

  app.post("/api/posts/:postId/like", requireAuth, (req, res) => {
    try {
      const post = db.posts.like(req.params.postId, req.currentUser!.id);
      if (!post) return res.status(404).json({ error: "Post not found" });
      res.json(post);
    } catch (error) {
      handleError(res, error, "Could not update like");
    }
  });

  app.post("/api/posts/:postId/report", requireAuth, (req, res) => {
    try {
      const { reason, details } = req.body;
      if (!reason) return res.status(400).json({ error: "Missing report reason" });

      db.posts.report(req.params.postId);
      const rep = db.reports.create({
        reporter_id: req.currentUser!.id,
        content_type: "post",
        target_id: req.params.postId,
        reason,
        details: details || "",
      });

      db.audit.log(req.currentUser!.id, "POST_REPORTED", `Reported post ${req.params.postId} for reason: ${reason}`, req.ip);
      res.json({ message: "Content reported to moderators successfully", report: rep });
    } catch (error) {
      handleError(res, error, "Could not submit report");
    }
  });

  // Comments
  app.get("/api/posts/:postId/comments", (req, res) => {
    try {
      res.json(db.comments.listByPost(req.params.postId));
    } catch (error) {
      handleError(res, error, "Could not load comments");
    }
  });

  app.post("/api/posts/:postId/comments", requireAuth, (req, res) => {
    try {
      const { anonymous_author, content } = req.body;
      if (!anonymous_author || !content) {
        return res.status(400).json({ error: "Missing comment fields" });
      }

      const comment = db.comments.create({ post_id: req.params.postId, user_id: req.currentUser!.id, anonymous_author, content });

      db.audit.log(req.currentUser!.id, "COMMENT_CREATE", `Commented on post ${req.params.postId}`, req.ip);
      res.status(201).json(comment);
    } catch (error) {
      handleError(res, error, "Could not post comment");
    }
  });

  // 6. ANONYMOUS PEER-TO-PEER MESSAGING WITH END-TO-END ENCRYPTION
  app.get("/api/conversations", requireAuth, (req, res) => {
    try {
      res.json(db.messaging.listConversations(req.currentUser!.id));
    } catch (error) {
      handleError(res, error, "Could not load conversations");
    }
  });

  app.post("/api/conversations", requireAuth, (req, res) => {
    try {
      const { userTwoId } = req.body;
      if (!userTwoId) {
        return res.status(400).json({ error: "A peer user ID is required to start chat" });
      }
      // The requester is always one side of the conversation they create.
      const conv = db.messaging.getOrCreateConversation(req.currentUser!.id, userTwoId);
      res.json(conv);
    } catch (error) {
      handleError(res, error, "Could not start conversation");
    }
  });

  function assertConversationParticipant(req: Request, res: Response): boolean {
    const conv = db.messaging.findConversation(req.params.conversationId);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return false;
    }
    if (conv.user_one_id !== req.currentUser!.id && conv.user_two_id !== req.currentUser!.id) {
      res.status(403).json({ error: "You're not part of this conversation" });
      return false;
    }
    return true;
  }

  app.get("/api/conversations/:conversationId/messages", requireAuth, (req, res) => {
    try {
      if (!assertConversationParticipant(req, res)) return;
      const messages = db.messaging.listMessages(req.params.conversationId);
      const decryptedMessages = messages.map((m) => ({ ...m, content: decrypt(m.encrypted_content) }));
      res.json(decryptedMessages);
    } catch (error) {
      handleError(res, error, "Could not load messages");
    }
  });

  app.post("/api/conversations/:conversationId/messages", requireAuth, (req, res) => {
    try {
      if (!assertConversationParticipant(req, res)) return;
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Message content is required" });
      }

      const encrypted_content = encrypt(content);
      const msg = db.messaging.sendMessage({
        conversation_id: req.params.conversationId,
        sender_id: req.currentUser!.id,
        encrypted_content,
      });

      db.audit.log(req.currentUser!.id, "MESSAGE_SEND", `Encrypted chat message sent in conversation: ${req.params.conversationId}`, req.ip);

      res.status(201).json({
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        created_at: msg.created_at,
        status: msg.status,
        content,
      });
    } catch (error) {
      handleError(res, error, "Could not send message");
    }
  });

  // 7. AI WELLNESS COMPANION ROUTE (WITH MULTI-STAGE SAFETY PIPELINE)
  app.post("/api/ai/chat", requireAuth, aiChatLimiter, async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Missing message content" });
      }

      const result = await runSafetyPipeline(req.currentUser!.id, message, history || []);
      res.json({ response: result.response, risk: result.risk });
    } catch (error) {
      handleError(res, error, "An error occurred in AI wellness companion processing.");
    }
  });

  // 8. SAFETY CENTER & RESOURCE LIBRARY (public reference content)
  app.get("/api/resources/categories", (_req, res) => {
    try {
      res.json(db.resources.categories());
    } catch (error) {
      handleError(res, error, "Could not load resource categories");
    }
  });

  app.get("/api/resources", (req, res) => {
    try {
      res.json(db.resources.list(req.query.categoryId as string));
    } catch (error) {
      handleError(res, error, "Could not load resources");
    }
  });

  app.get("/api/resources/:id", (req, res) => {
    try {
      const article = db.resources.get(req.params.id);
      if (!article) return res.status(404).json({ error: "Article not found" });
      res.json(article);
    } catch (error) {
      handleError(res, error, "Could not load article");
    }
  });

  // 9. THERAPIST NETWORK
  app.get("/api/therapists", (_req, res) => {
    try {
      res.json(db.therapists.list());
    } catch (error) {
      handleError(res, error, "Could not load therapist directory");
    }
  });

  app.post("/api/therapists/register", requireAuth, (req, res) => {
    try {
      const { name, country, credentials, bio, specialties, availability_slots } = req.body;
      if (!name || !country || !credentials) {
        return res.status(400).json({ error: "Missing core professional registration parameters" });
      }

      // Always register the CALLER, never an id from the request body —
      // otherwise any user could grant therapist status to someone else.
      const userId = req.currentUser!.id;
      const therapist = db.therapists.register({
        user_id: userId,
        name,
        country,
        credentials,
        bio: bio || "",
        specialties: specialties || [],
        availability_slots: availability_slots || ["Monday 10:00 AM", "Wednesday 1:00 PM"],
      });

      db.users.setRole(userId, "therapist");

      db.audit.log(userId, "THERAPIST_REGISTER", `Registered as therapist: ${name} (${country})`, req.ip);
      res.status(201).json(therapist);
    } catch (error) {
      handleError(res, error, "Could not complete therapist registration");
    }
  });

  app.post("/api/appointments", requireAuth, (req, res) => {
    try {
      const { therapist_id, date, slot, notes } = req.body;
      if (!therapist_id || !date || !slot) {
        return res.status(400).json({ error: "Missing critical appointment details" });
      }

      const appt = db.therapists.createAppointment({ user_id: req.currentUser!.id, therapist_id, date, slot, notes: notes || "" });

      db.audit.log(req.currentUser!.id, "APPOINTMENT_REQUEST", `Requested appointment on ${date} at ${slot}`, req.ip);
      res.status(201).json(appt);
    } catch (error) {
      handleError(res, error, "Could not request appointment");
    }
  });

  app.get("/api/appointments", requireAuth, (req, res) => {
    try {
      const isTherapist = req.currentUser!.role === "therapist" && req.query.isTherapist === "true";
      // Appointments store the *therapist record's* id, not the user id,
      // so a therapist looking up "my appointments" needs that record first.
      const lookupId = isTherapist ? db.therapists.findByUserId(req.currentUser!.id)?.id ?? "" : req.currentUser!.id;
      res.json(db.therapists.listAppointments(lookupId, isTherapist));
    } catch (error) {
      handleError(res, error, "Could not load appointments");
    }
  });

  app.put("/api/appointments/:id/status", requireAuth, (req, res) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: "Missing new status" });

      const appt = db.therapists.getAppointment(req.params.id);
      if (!appt) return res.status(404).json({ error: "Appointment not found" });

      const therapistRecord = db.therapists.get(appt.therapist_id);
      const isOwner = appt.user_id === req.currentUser!.id;
      const isAssignedTherapist = therapistRecord?.user_id === req.currentUser!.id;
      const isModerator = req.currentUser!.role === "moderator";
      if (!isOwner && !isAssignedTherapist && !isModerator) {
        return res.status(403).json({ error: "You don't have permission to update this appointment" });
      }

      const updated = db.therapists.updateAppointmentStatus(req.params.id, status);
      db.audit.log(req.currentUser!.id, "APPOINTMENT_UPDATE", `Updated appointment ${req.params.id} to state: ${status}`, req.ip);
      res.json(updated);
    } catch (error) {
      handleError(res, error, "Could not update appointment");
    }
  });

  // 10. MODERATION / AUDIT DASHBOARD ENDPOINTS — moderators only
  app.get("/api/admin/reports", requireAuth, requireRole("moderator"), (_req, res) => {
    try {
      res.json(db.reports.list());
    } catch (error) {
      handleError(res, error, "Could not load reports");
    }
  });

  app.put("/api/admin/reports/:id/status", requireAuth, requireRole("moderator"), (req, res) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: "Missing status" });

      const rep = db.reports.updateStatus(req.params.id, status);
      db.audit.log(req.currentUser!.id, "REPORT_STATUS_CHANGE", `Report ${req.params.id} changed to status: ${status}`, req.ip);
      res.json(rep);
    } catch (error) {
      handleError(res, error, "Could not update report status");
    }
  });

  app.post("/api/admin/action", requireAuth, requireRole("moderator"), (req, res) => {
    try {
      const { action_type, target_id, reason } = req.body;
      if (!action_type || !target_id || !reason) {
        return res.status(400).json({ error: "Missing critical moderation parameters" });
      }

      const action = db.moderationActions.execute({ moderator_id: req.currentUser!.id, action_type, target_id, reason });

      db.audit.log(req.currentUser!.id, `MODERATION_ACTION_${action_type.toUpperCase()}`, `Action taken on target ${target_id}. Reason: ${reason}`, req.ip);
      res.status(201).json(action);
    } catch (error) {
      handleError(res, error, "Could not execute moderation action");
    }
  });

  app.get("/api/admin/safety-events", requireAuth, requireRole("moderator"), (_req, res) => {
    try {
      res.json(db.safetyEvents.list());
    } catch (error) {
      handleError(res, error, "Could not load safety events");
    }
  });

  app.get("/api/admin/audit-logs", requireAuth, requireRole("moderator"), (_req, res) => {
    try {
      res.json(db.audit.list());
    } catch (error) {
      handleError(res, error, "Could not load audit logs");
    }
  });

  // ----------------------------------------------------
  // VITE PLAYGROUND MIDDLEWARE INTEGRATION
  // ----------------------------------------------------
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Saman Wellness Portal listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
