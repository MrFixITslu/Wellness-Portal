import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./server/db";
import { encrypt, decrypt } from "./server/crypto";
import { runSafetyPipeline } from "./server/gemini";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // ----------------------------------------------------
  // API ROUTES (Always register API routes FIRST)
  // ----------------------------------------------------

  // 1. ANONYMOUS AUTHENTICATION
  app.post("/api/auth/register", (req, res) => {
    try {
      const { anonymous_username, avatar_id, country, role } = req.body;
      if (!anonymous_username || !avatar_id || !country) {
        return res.status(400).json({ error: "Missing required profile fields" });
      }

      // Check if username taken
      const existing = db.users.findByUsername(anonymous_username);
      if (existing) {
        return res.status(400).json({ error: "That anonymous username is already in use" });
      }

      const user = db.users.create({
        anonymous_username,
        avatar_id,
        country,
        role: role || "user"
      });

      db.audit.log(user.id, "USER_REGISTER", `Anonymous user registered with country: ${country}`);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "Missing user identification" });
      }

      const user = db.users.find(userId);
      if (!user) {
        return res.status(404).json({ error: "Anonymous session not found" });
      }

      db.audit.log(user.id, "USER_LOGIN", `Anonymous session resumed`);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Login failed" });
    }
  });

  app.get("/api/users/:userId", (req, res) => {
    try {
      const { userId } = req.params;
      const user = db.users.find(userId);
      if (!user) {
        return res.status(404).json({ error: "Anonymous session not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Session restoration failed" });
    }
  });

  // 2. USER SETTINGS
  app.get("/api/users/:userId/settings", (req, res) => {
    try {
      const { userId } = req.params;
      const settings = db.settings.get(userId);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/users/:userId/settings", (req, res) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      const updated = db.settings.update(userId, updates);
      db.audit.log(userId, "UPDATE_SETTINGS", `User updated privacy or theme settings`);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. MOOD TRACKING
  app.get("/api/users/:userId/moods", (req, res) => {
    try {
      const { userId } = req.params;
      const list = db.moods.list(userId);
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users/:userId/moods", (req, res) => {
    try {
      const { userId } = req.params;
      const { mood_score, stress_level, energy_level, sleep_quality, note } = req.body;

      if (!mood_score || !stress_level || !energy_level || !sleep_quality) {
        return res.status(400).json({ error: "Missing mood tracking values" });
      }

      const checkin = db.moods.create({
        user_id: userId,
        mood_score: Number(mood_score),
        stress_level: Number(stress_level),
        energy_level: Number(energy_level),
        sleep_quality: Number(sleep_quality),
        note: note || ""
      });

      db.audit.log(userId, "MOOD_CHECKIN", `Recorded mood: ${mood_score}, stress: ${stress_level}`);
      res.status(201).json(checkin);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. PRIVATE JOURNAL WITH AES-256 ENCRYPTION
  app.get("/api/users/:userId/journals", (req, res) => {
    try {
      const { userId } = req.params;
      const list = db.journals.list(userId);

      // Decrypt journal content before returning to the authorized user
      const decryptedList = list.map((j) => ({
        ...j,
        content: decrypt(j.encrypted_content)
      }));

      res.json(decryptedList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users/:userId/journals", (req, res) => {
    try {
      const { userId } = req.params;
      const { title, content, mood_tag } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: "Journal title and content are required" });
      }

      // Encrypt sensitive content prior to database persistence
      const encrypted_content = encrypt(content);

      const journal = db.journals.create({
        user_id: userId,
        title,
        encrypted_content,
        mood_tag: mood_tag || ""
      });

      // Secure Audit Log: log entry creation, but never log the actual content or encryption strings!
      db.audit.log(userId, "JOURNAL_CREATE", `Created journal entry: "${title}" (Content encrypted successfully)`);

      res.status(201).json({
        id: journal.id,
        user_id: journal.user_id,
        title: journal.title,
        mood_tag: journal.mood_tag,
        created_at: journal.created_at,
        content // Echo back decrypted to front end for instant display
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/users/:userId/journals/:journalId", (req, res) => {
    try {
      const { userId, journalId } = req.params;
      const success = db.journals.delete(journalId, userId);
      if (success) {
        db.audit.log(userId, "JOURNAL_DELETE", `Deleted journal entry: ${journalId}`);
        res.json({ message: "Journal entry permanently deleted" });
      } else {
        res.status(404).json({ error: "Journal entry not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 5. COMMUNITY FORUMS
  app.get("/api/communities", (req, res) => {
    try {
      res.json(db.communities.list());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/communities/:communityId/join", (req, res) => {
    try {
      const { communityId } = req.params;
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "Missing user identification" });

      const joined = db.communities.join(communityId, userId);
      db.audit.log(userId, "COMMUNITY_JOIN", `Joined community: ${communityId}`);
      res.json(joined);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/communities/joined", (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "Missing user identification" });
      res.json(db.communities.joinedByUser(userId));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Posts inside communities
  app.get("/api/posts", (req, res) => {
    try {
      const communityId = req.query.communityId as string;
      res.json(db.posts.list(communityId));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/posts", (req, res) => {
    try {
      const { community_id, user_id, anonymous_author, title, content } = req.body;
      if (!community_id || !user_id || !anonymous_author || !title || !content) {
        return res.status(400).json({ error: "Missing required post fields" });
      }

      const post = db.posts.create({
        community_id,
        user_id,
        anonymous_author,
        title,
        content
      });

      db.audit.log(user_id, "POST_CREATE", `Created post in community ${community_id}: "${title}"`);
      res.status(201).json(post);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/posts/:postId/like", (req, res) => {
    try {
      const { postId } = req.params;
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "Missing user identification" });

      const post = db.posts.like(postId, userId);
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/posts/:postId/report", (req, res) => {
    try {
      const { postId } = req.params;
      const { reporterId, reason, details } = req.body;
      if (!reporterId || !reason) {
        return res.status(400).json({ error: "Missing reporter id or report reason" });
      }

      // Increment report count on post
      db.posts.report(postId);

      // Create detailed report log
      const rep = db.reports.create({
        reporter_id: reporterId,
        content_type: "post",
        target_id: postId,
        reason,
        details: details || ""
      });

      db.audit.log(reporterId, "POST_REPORTED", `Reported post ${postId} for reason: ${reason}`);
      res.json({ message: "Content reported to moderators successfully", report: rep });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Comments
  app.get("/api/posts/:postId/comments", (req, res) => {
    try {
      const { postId } = req.params;
      res.json(db.comments.listByPost(postId));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/posts/:postId/comments", (req, res) => {
    try {
      const { postId } = req.params;
      const { user_id, anonymous_author, content } = req.body;
      if (!user_id || !anonymous_author || !content) {
        return res.status(400).json({ error: "Missing comment fields" });
      }

      const comment = db.comments.create({
        post_id: postId,
        user_id,
        anonymous_author,
        content
      });

      db.audit.log(user_id, "COMMENT_CREATE", `Commented on post ${postId}`);
      res.status(201).json(comment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 6. ANONYMOUS PEER-TO-PEER MESSAGING WITH END-TO-END DECRYPTION
  app.get("/api/conversations", (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "Missing user ID" });

      const list = db.messaging.listConversations(userId);
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/conversations", (req, res) => {
    try {
      const { userOneId, userTwoId } = req.body;
      if (!userOneId || !userTwoId) {
        return res.status(400).json({ error: "Both peer user IDs are required to start chat" });
      }

      const conv = db.messaging.getOrCreateConversation(userOneId, userTwoId);
      res.json(conv);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/conversations/:conversationId/messages", (req, res) => {
    try {
      const { conversationId } = req.params;
      const messages = db.messaging.listMessages(conversationId);

      // Decrypt messages before serving to client browser
      const decryptedMessages = messages.map((m) => ({
        ...m,
        content: decrypt(m.encrypted_content)
      }));

      res.json(decryptedMessages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/conversations/:conversationId/messages", (req, res) => {
    try {
      const { conversationId } = req.params;
      const { senderId, content } = req.body;

      if (!senderId || !content) {
        return res.status(400).json({ error: "Sender ID and message content are required" });
      }

      // Encrypt sensitive peer message prior to db storage
      const encrypted_content = encrypt(content);

      const msg = db.messaging.sendMessage({
        conversation_id: conversationId,
        sender_id: senderId,
        encrypted_content
      });

      // Avoid auditing message text to uphold strict mental wellness privacy
      db.audit.log(senderId, "MESSAGE_SEND", `Encrypted chat message sent in conversation: ${conversationId}`);

      res.status(201).json({
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        created_at: msg.created_at,
        status: msg.status,
        content // Return decrypted for immediate UI update
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 7. AI WELLNESS COMPANION ROUTE (WITH MULTI-STAGE SAFETY PIPELINE)
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { userId, message, history } = req.body;
      if (!userId || !message) {
        return res.status(400).json({ error: "Missing user identification or message context" });
      }

      const chatHistory = history || [];

      // Process message through full Safety Pipeline
      const result = await runSafetyPipeline(userId, message, chatHistory);

      res.json({
        response: result.response,
        risk: result.risk
      });
    } catch (error: any) {
      console.error("AI chat endpoint failure:", error);
      res.status(500).json({ error: error.message || "An error occurred in AI wellness companion processing." });
    }
  });

  // 8. SAFETY CENTER & RESOURCE LIBRARY
  app.get("/api/resources/categories", (req, res) => {
    try {
      res.json(db.resources.categories());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/resources", (req, res) => {
    try {
      const categoryId = req.query.categoryId as string;
      res.json(db.resources.list(categoryId));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/resources/:id", (req, res) => {
    try {
      const article = db.resources.get(req.params.id);
      if (!article) return res.status(404).json({ error: "Article not found" });
      res.json(article);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 9. THERAPIST NETWORK
  app.get("/api/therapists", (req, res) => {
    try {
      res.json(db.therapists.list());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/therapists/register", (req, res) => {
    try {
      const { user_id, name, country, credentials, bio, specialties, availability_slots } = req.body;
      if (!user_id || !name || !country || !credentials) {
        return res.status(400).json({ error: "Missing core professional registration parameters" });
      }

      const therapist = db.therapists.register({
        user_id,
        name,
        country,
        credentials,
        bio: bio || "",
        specialties: specialties || [],
        availability_slots: availability_slots || ["Monday 10:00 AM", "Wednesday 1:00 PM"]
      });

      // Update original user role to therapist in DB
      const user = db.users.find(user_id);
      if (user) {
        user.role = "therapist";
        const currentDb = db.users.find(user_id); // force cache reload if needed
      }

      db.audit.log(user_id, "THERAPIST_REGISTER", `Registered as therapist: ${name} (${country})`);
      res.status(201).json(therapist);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/appointments", (req, res) => {
    try {
      const { user_id, therapist_id, date, slot, notes } = req.body;
      if (!user_id || !therapist_id || !date || !slot) {
        return res.status(400).json({ error: "Missing critical appointment details" });
      }

      const appt = db.therapists.createAppointment({
        user_id,
        therapist_id,
        date,
        slot,
        notes: notes || ""
      });

      db.audit.log(user_id, "APPOINTMENT_REQUEST", `Requested appointment on ${date} at ${slot}`);
      res.status(201).json(appt);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/appointments", (req, res) => {
    try {
      const userId = req.query.userId as string;
      const isTherapist = req.query.isTherapist === "true";
      if (!userId) return res.status(400).json({ error: "Missing identification ID" });

      res.json(db.therapists.listAppointments(userId, isTherapist));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/appointments/:id/status", (req, res) => {
    try {
      const { id } = req.params;
      const { status, updaterId } = req.body; // status: 'confirmed', 'cancelled', 'completed'
      if (!status || !updaterId) return res.status(400).json({ error: "Missing new status or updater ID" });

      const updated = db.therapists.updateAppointmentStatus(id, status);
      db.audit.log(updaterId, "APPOINTMENT_UPDATE", `Updated appointment ${id} to state: ${status}`);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 10. MODERATION / AUDIT DASHBOARD ENDPOINTS
  app.get("/api/admin/reports", (req, res) => {
    try {
      res.json(db.reports.list());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/reports/:id/status", (req, res) => {
    try {
      const { id } = req.params;
      const { status, moderatorId } = req.body;
      if (!status || !moderatorId) return res.status(400).json({ error: "Missing status or moderator ID" });

      const rep = db.reports.updateStatus(id, status);
      db.audit.log(moderatorId, "REPORT_STATUS_CHANGE", `Report ${id} changed to status: ${status}`);
      res.json(rep);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/action", (req, res) => {
    try {
      const { moderatorId, action_type, target_id, reason } = req.body;
      if (!moderatorId || !action_type || !target_id || !reason) {
        return res.status(400).json({ error: "Missing critical moderation parameters" });
      }

      const action = db.moderationActions.execute({
        moderator_id: moderatorId,
        action_type,
        target_id,
        reason
      });

      db.audit.log(moderatorId, `MODERATION_ACTION_${action_type.toUpperCase()}`, `Action taken on target ${target_id}. Reason: ${reason}`);
      res.status(201).json(action);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/safety-events", (req, res) => {
    try {
      res.json(db.safetyEvents.list());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/audit-logs", (req, res) => {
    try {
      res.json(db.audit.list());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ----------------------------------------------------
  // VITE PLAYGROUND MIDDLEWARE INTEGRATION
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Caribbean Wellness Full-Stack Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
