import fs from "fs";
import path from "path";

// Define TypeScript interfaces for the 18 requested tables
export interface User {
  id: string;
  anonymous_username: string;
  avatar_id: string;
  country: string;
  role: "user" | "moderator" | "therapist";
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  notifications_enabled: boolean;
  daily_reminder_time: string;
  share_anonymously: boolean;
  high_contrast_mode: boolean;
}

export interface MoodCheckin {
  id: string;
  user_id: string;
  mood_score: number; // 1-5
  stress_level: number; // 1-5
  energy_level: number; // 1-5
  sleep_quality: number; // 1-5
  note: string;
  created_at: string;
}

export interface Journal {
  id: string;
  user_id: string;
  title: string;
  encrypted_content: string; // Encrypted with AES-256
  mood_tag: string;
  created_at: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  joined_at: string;
}

export interface Post {
  id: string;
  community_id: string;
  user_id: string;
  anonymous_author: string;
  title: string;
  content: string;
  created_at: string;
  report_count: number;
  status: "active" | "flagged" | "removed";
  likes_count: number;
  liked_by_users: string[]; // List of user IDs who liked
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  anonymous_author: string;
  content: string;
  created_at: string;
  report_count: number;
}

export interface Conversation {
  id: string;
  user_one_id: string;
  user_two_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  encrypted_content: string; // Encrypted with AES-256
  created_at: string;
  status: "sent" | "read" | "flagged" | "removed";
}

export interface Report {
  id: string;
  reporter_id: string;
  content_type: "post" | "comment" | "message";
  target_id: string; // Post id, Comment id or Message id
  reason: string;
  details: string;
  status: "pending" | "reviewed" | "action_taken";
  created_at: string;
}

export interface SafetyEvent {
  id: string;
  user_id: string;
  event_type: "crisis_detected" | "abuse_detected" | "escalation";
  risk_score: number; // 1-100
  content_snippet: string; // High-level trigger context
  action_taken: string;
  created_at: string;
}

export interface ModerationAction {
  id: string;
  moderator_id: string;
  action_type: "remove_post" | "remove_comment" | "suspend_user" | "dismiss_report";
  target_id: string;
  reason: string;
  created_at: string;
}

export interface ResourceCategory {
  id: string;
  name: string;
  description: string;
}

export interface Resource {
  id: string;
  category_id: string;
  title: string;
  excerpt: string;
  content: string;
  read_time_mins: number;
  created_at: string;
}

export interface Therapist {
  id: string;
  user_id: string;
  name: string;
  country: string;
  credentials: string;
  bio: string;
  specialties: string[];
  availability_slots: string[];
  verified: boolean;
  rating: number;
}

export interface Appointment {
  id: string;
  user_id: string;
  therapist_id: string;
  date: string; // YYYY-MM-DD
  slot: string; // "10:00 AM"
  status: "requested" | "confirmed" | "cancelled" | "completed";
  notes: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
}

// Database JSON Schema
export interface DatabaseSchema {
  users: User[];
  user_settings: UserSettings[];
  mood_checkins: MoodCheckin[];
  journals: Journal[];
  communities: Community[];
  community_members: CommunityMember[];
  posts: Post[];
  comments: Comment[];
  conversations: Conversation[];
  messages: Message[];
  reports: Report[];
  safety_events: SafetyEvent[];
  moderation_actions: ModerationAction[];
  resources: Resource[];
  resource_categories: ResourceCategory[];
  therapists: Therapist[];
  appointments: Appointment[];
  audit_logs: AuditLog[];
}

const DB_PATH = path.join(process.cwd(), "data", "db.json");

// Helper to ensure data directory exists and DB is seeded
function initDb(): DatabaseSchema {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const data = fs.readFileSync(DB_PATH, "utf8");
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse DB, rebuilding from scratch", e);
    }
  }

  // Pre-seed Categories
  const categories: ResourceCategory[] = [
    { id: "cat-1", name: "Anxiety", description: "Coping with worry, tension, and breathing panic" },
    { id: "cat-2", name: "Stress", description: "Managing pressure in career, home, and island life" },
    { id: "cat-3", name: "Sleep", description: "Improving rest, relaxation techniques, and evening calmness" },
    { id: "cat-4", name: "Relationships", description: "Fostering healthy boundaries, connection, and emotional growth" },
    { id: "cat-5", name: "Parenting", description: "Navigating discipline, tradition, and youthful mental health support" },
    { id: "cat-6", name: "Mental Wellness", description: "Broad articles on breaking stigma and mindful living in the Caribbean" },
  ];

  // Pre-seed Resources (Caribbean Wellness specific)
  const resources: Resource[] = [
    {
      id: "res-1",
      category_id: "cat-1",
      title: "Coping with Weather and Storm Anxiety",
      excerpt: "Living through hurricane seasons brings recurring stress. Learn grounding methods designed to manage storm-associated trauma and anxiety.",
      content: `The Caribbean is beautiful, but the hurricane season brings distinct emotional triggers. Storm anxiety is a recognized condition where weather warnings provoke physical stress, panic, and persistent dread.

### Grounding Exercises for Storm Warnings:
1. **The Beach Breathing Metaphor**: Visualize the predictable, steady ebb and flow of tides. Inhale for 4 seconds, hold for 4 seconds, exhale for 6 seconds.
2. **Anchor with the Senses**: Look around and name 5 items in your safe space, touch 4 physical anchors, listen for 3 reassuring sounds, smell 2 calming scents, and taste 1 simple drink.
3. **Control the Controllables**: Organize your emergency kit calmly. Once prepared, consciously redirect your focus to soft background music or quiet storytelling.

Remember, feelings of panic are normal adaptive responses, but they do not have to consume your day. Be gentle with your mind.`,
      read_time_mins: 4,
      created_at: new Date().toISOString(),
    },
    {
      id: "res-2",
      category_id: "cat-2",
      title: "Island Time vs. Overwork: Caribbean Career Stress",
      excerpt: "Exploring the tension between relaxed cultural narratives and the intense realities of financial and career pressure.",
      content: `While tourist brochures describe our region as an effortless paradise, Caribbean professionals face staggering pressure. Financial demands, long commutes, and modern global workplace expectations often clash with localized community roles.

### Signs of Career Burnout:
- Feeling persistent fatigue before starting the workday.
- Heightened irritability with friends, neighbors, or colleagues.
- A feeling of distance from things that used to bring island joy, like Sunday cookouts or beach lime.

### Cultivating Mindful Boundaries:
- **Set a Digital Curfew**: Disconnect from workplace group chats at least 2 hours before bed.
- **Micro-Limes**: Dedicate 10 minutes during your lunch break to step outside, feel the warm sun on your skin, and deliberately empty your thoughts.
- **Protect Your Sunday**: Safeguard at least one day a week dedicated strictly to recovery, family, or quiet hobbies.`,
      read_time_mins: 5,
      created_at: new Date().toISOString(),
    },
    {
      id: "res-3",
      category_id: "cat-6",
      title: "Breaking the Silence: Men's Mental Health in the Caribbean",
      excerpt: "Addressing the cultural conditioning of strength, vulnerability, and why seeking help is the ultimate courage.",
      content: `Historically, Caribbean men are conditioned to be 'strong, silent providers.' Showing sadness, doubt, or emotional exhaustion is frequently mischaracterized as weakness. This silence leads to elevated rates of isolation and silent suffering.

### Reimagining Strength:
- **Vulnerability is Protective**: Suppressing emotions increases heart rate, blood pressure, and psychological stress. Speaking anonymously or in safe circles is the first line of defense.
- **Redefining 'Lime' conversations**: Checking in deeply with a friend doesn't require a formal setting. Next time you're liming, ask: "How are you *actually* coping with everything right now?"
- **Take Small Steps**: Utilize anonymous online journaling or AI reflection tools to start labeling your feelings before sharing them with others.`,
      read_time_mins: 6,
      created_at: new Date().toISOString(),
    },
  ];

  // Pre-seed Communities
  const communities: Community[] = [
    { id: "comm-1", name: "Anxiety Support", description: "A calming group to share coping strategies and find relief from worry.", category: "Anxiety", created_at: new Date().toISOString() },
    { id: "comm-2", name: "Stress Management", description: "Sharing tips on balancing work, island life, and financial responsibilities.", category: "Stress", created_at: new Date().toISOString() },
    { id: "comm-3", name: "Parenting", description: "Connecting Caribbean parents to share advice on raising kids with love and patience.", category: "Parenting", created_at: new Date().toISOString() },
    { id: "comm-4", name: "Grief Support", description: "A gentle space for anyone healing from loss and looking for mutual understanding.", category: "Grief", created_at: new Date().toISOString() },
    { id: "comm-5", name: "Men's Wellness", description: "Breaking the stigma, opening up about pressures, and supporting fellow brothers.", category: "Wellness", created_at: new Date().toISOString() },
    { id: "comm-6", name: "Youth Support", description: "For young adults navigating life transitions, school, and emotional identity.", category: "Youth", created_at: new Date().toISOString() },
    { id: "comm-7", name: "Financial Stress", description: "A supportive, non-judgmental space to share anxiety around inflation and living expenses.", category: "Financial", created_at: new Date().toISOString() },
  ];

  // Pre-seed Therapists
  const therapists: Therapist[] = [
    {
      id: "ther-1",
      user_id: "user-therapist-1",
      name: "Dr. Alana Clarke",
      country: "Barbados",
      credentials: "PhD in Clinical Psychology, UWI",
      bio: "With over 12 years of experience, Dr. Clarke specializes in anxiety, storm trauma, and CBT, blending modern therapy with culturally responsive techniques.",
      specialties: ["Anxiety", "Trauma", "CBT", "Stress Management"],
      availability_slots: ["Monday 9:00 AM", "Monday 11:00 AM", "Wednesday 2:00 PM"],
      verified: true,
      rating: 4.9,
    },
    {
      id: "ther-2",
      user_id: "user-therapist-2",
      name: "Jean-Pierre Baptiste",
      country: "Trinidad & Tobago",
      credentials: "MSc in Counseling Psychology",
      bio: "Jean-Pierre is passionate about family counseling and men's mental wellness. He works extensively with local support groups across Trinidad.",
      specialties: ["Relationships", "Men's Wellness", "Family Therapy"],
      availability_slots: ["Tuesday 10:00 AM", "Thursday 3:00 PM", "Friday 1:00 PM"],
      verified: true,
      rating: 4.8,
    },
    {
      id: "ther-3",
      user_id: "user-therapist-3",
      name: "Cheryl Noel",
      country: "Saint Lucia",
      credentials: "M.Ed. in School Counseling & Trauma Specialist",
      bio: "Cheryl focuses on young adult guidance, stress management, and self-acceptance, using creative arts and mindfulness.",
      specialties: ["Youth Support", "Grief", "Mindfulness", "Anxiety"],
      availability_slots: ["Wednesday 10:00 AM", "Friday 10:00 AM", "Friday 4:00 PM"],
      verified: true,
      rating: 4.9,
    },
  ];

  // Create default moderator and therapist users to represent backend entities
  const users: User[] = [
    { id: "user-moderator-1", anonymous_username: "island_moderator", avatar_id: "av-mod", country: "Barbados", role: "moderator", created_at: new Date().toISOString() },
    { id: "user-therapist-1", anonymous_username: "dr_alana", avatar_id: "av-ther-1", country: "Barbados", role: "therapist", created_at: new Date().toISOString() },
    { id: "user-therapist-2", anonymous_username: "jp_baptiste", avatar_id: "av-ther-2", country: "Trinidad & Tobago", role: "therapist", created_at: new Date().toISOString() },
    { id: "user-therapist-3", anonymous_username: "cheryl_counselor", avatar_id: "av-ther-3", country: "Saint Lucia", role: "therapist", created_at: new Date().toISOString() },
  ];

  const defaultDb: DatabaseSchema = {
    users,
    user_settings: [
      { user_id: "user-moderator-1", notifications_enabled: true, daily_reminder_time: "08:00", share_anonymously: true, high_contrast_mode: false },
    ],
    mood_checkins: [],
    journals: [],
    communities,
    community_members: [],
    posts: [
      {
        id: "post-1",
        community_id: "comm-1",
        user_id: "user-moderator-1",
        anonymous_author: "calm_breeze",
        title: "Welcome to the Anxiety Support Community",
        content: "Hello everyone, this is a safe space to share what you're dealing with. No judgments. Let's lift each other up. What's one thing you do to feel grounded when anxiety hits?",
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        report_count: 0,
        status: "active",
        likes_count: 5,
        liked_by_users: [],
      }
    ],
    comments: [
      {
        id: "comm-c-1",
        post_id: "post-1",
        user_id: "user-therapist-1",
        anonymous_author: "wellness_guide",
        content: "A wonderful step! For me, ocean sound breathing always works. Grateful to be part of this group.",
        created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
        report_count: 0,
      }
    ],
    conversations: [],
    messages: [],
    reports: [],
    safety_events: [],
    moderation_actions: [],
    resources,
    resource_categories: categories,
    therapists,
    appointments: [],
    audit_logs: [],
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), "utf8");
  return defaultDb;
}

let cache: DatabaseSchema = initDb();

// Generic helper to read DB
export function readDb(): DatabaseSchema {
  try {
    const data = fs.readFileSync(DB_PATH, "utf8");
    cache = JSON.parse(data);
    return cache;
  } catch (e) {
    return cache;
  }
}

// Generic helper to write DB
export function writeDb(db: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
    cache = db;
  } catch (e) {
    console.error("Failed to write to local file DB:", e);
  }
}

// Relational Operations
export const db = {
  // USERS
  users: {
    find: (id: string) => readDb().users.find((u) => u.id === id),
    findByUsername: (uname: string) => readDb().users.find((u) => u.anonymous_username === uname),
    create: (user: Omit<User, "id" | "created_at">) => {
      const current = readDb();
      const newUser: User = {
        ...user,
        id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        created_at: new Date().toISOString(),
      };
      current.users.push(newUser);
      // Create settings automatically
      const defaultSettings: UserSettings = {
        user_id: newUser.id,
        notifications_enabled: true,
        daily_reminder_time: "08:00",
        share_anonymously: true,
        high_contrast_mode: false,
      };
      current.user_settings.push(defaultSettings);
      writeDb(current);
      return newUser;
    },
  },

  // USER SETTINGS
  settings: {
    get: (userId: string) => {
      const settings = readDb().user_settings.find((s) => s.user_id === userId);
      if (settings) return settings;
      // Default fallback
      return {
        user_id: userId,
        notifications_enabled: true,
        daily_reminder_time: "08:00",
        share_anonymously: true,
        high_contrast_mode: false,
      };
    },
    update: (userId: string, updates: Partial<Omit<UserSettings, "user_id">>) => {
      const current = readDb();
      let settings = current.user_settings.find((s) => s.user_id === userId);
      if (!settings) {
        settings = {
          user_id: userId,
          notifications_enabled: true,
          daily_reminder_time: "08:00",
          share_anonymously: true,
          high_contrast_mode: false,
        };
        current.user_settings.push(settings);
      }
      Object.assign(settings, updates);
      writeDb(current);
      return settings;
    },
  },

  // MOOD CHECKINS
  moods: {
    list: (userId: string) => readDb().mood_checkins.filter((m) => m.user_id === userId).sort((a,b) => b.created_at.localeCompare(a.created_at)),
    create: (checkin: Omit<MoodCheckin, "id" | "created_at">) => {
      const current = readDb();
      const newCheckin: MoodCheckin = {
        ...checkin,
        id: `mood-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      current.mood_checkins.push(newCheckin);
      writeDb(current);
      return newCheckin;
    },
  },

  // JOURNALS
  journals: {
    list: (userId: string) => readDb().journals.filter((j) => j.user_id === userId).sort((a,b) => b.created_at.localeCompare(a.created_at)),
    get: (id: string) => readDb().journals.find((j) => j.id === id),
    create: (journal: Omit<Journal, "id" | "created_at">) => {
      const current = readDb();
      const newJournal: Journal = {
        ...journal,
        id: `journal-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      current.journals.push(newJournal);
      writeDb(current);
      return newJournal;
    },
    delete: (id: string, userId: string) => {
      const current = readDb();
      const filtered = current.journals.filter((j) => !(j.id === id && j.user_id === userId));
      const deletedCount = current.journals.length - filtered.length;
      current.journals = filtered;
      writeDb(current);
      return deletedCount > 0;
    },
  },

  // COMMUNITIES
  communities: {
    list: () => readDb().communities,
    join: (communityId: string, userId: string) => {
      const current = readDb();
      const exists = current.community_members.find((m) => m.community_id === communityId && m.user_id === userId);
      if (exists) return exists;
      const newMember: CommunityMember = {
        id: `member-${Date.now()}`,
        community_id: communityId,
        user_id: userId,
        joined_at: new Date().toISOString(),
      };
      current.community_members.push(newMember);
      writeDb(current);
      return newMember;
    },
    joinedByUser: (userId: string) => {
      const members = readDb().community_members.filter((m) => m.user_id === userId);
      const communityIds = members.map((m) => m.community_id);
      return readDb().communities.filter((c) => communityIds.includes(c.id));
    },
  },

  // POSTS
  posts: {
    list: (communityId?: string) => {
      const posts = readDb().posts.filter((p) => p.status === "active");
      if (communityId) {
        return posts.filter((p) => p.community_id === communityId).sort((a,b) => b.created_at.localeCompare(a.created_at));
      }
      return posts.sort((a,b) => b.created_at.localeCompare(a.created_at));
    },
    get: (id: string) => readDb().posts.find((p) => p.id === id),
    create: (post: Omit<Post, "id" | "created_at" | "report_count" | "status" | "likes_count" | "liked_by_users">) => {
      const current = readDb();
      const newPost: Post = {
        ...post,
        id: `post-${Date.now()}`,
        created_at: new Date().toISOString(),
        report_count: 0,
        status: "active",
        likes_count: 0,
        liked_by_users: [],
      };
      current.posts.push(newPost);
      writeDb(current);
      return newPost;
    },
    like: (postId: string, userId: string) => {
      const current = readDb();
      const post = current.posts.find((p) => p.id === postId);
      if (post) {
        if (!post.liked_by_users) post.liked_by_users = [];
        const index = post.liked_by_users.indexOf(userId);
        if (index > -1) {
          // Unlike
          post.liked_by_users.splice(index, 1);
          post.likes_count = Math.max(0, post.likes_count - 1);
        } else {
          // Like
          post.liked_by_users.push(userId);
          post.likes_count += 1;
        }
        writeDb(current);
      }
      return post;
    },
    report: (postId: string) => {
      const current = readDb();
      const post = current.posts.find((p) => p.id === postId);
      if (post) {
        post.report_count += 1;
        if (post.report_count >= 5) {
          post.status = "flagged";
        }
        writeDb(current);
      }
      return post;
    },
  },

  // COMMENTS
  comments: {
    listByPost: (postId: string) => readDb().comments.filter((c) => c.post_id === postId).sort((a,b) => a.created_at.localeCompare(b.created_at)),
    create: (comment: Omit<Comment, "id" | "created_at" | "report_count">) => {
      const current = readDb();
      const newComment: Comment = {
        ...comment,
        id: `comment-${Date.now()}`,
        created_at: new Date().toISOString(),
        report_count: 0,
      };
      current.comments.push(newComment);
      writeDb(current);
      return newComment;
    },
  },

  // MESSAGES AND CONVERSATIONS
  messaging: {
    getOrCreateConversation: (userOneId: string, userTwoId: string) => {
      const current = readDb();
      let conv = current.conversations.find(
        (c) =>
          (c.user_one_id === userOneId && c.user_two_id === userTwoId) ||
          (c.user_one_id === userTwoId && c.user_two_id === userOneId)
      );
      if (!conv) {
        conv = {
          id: `conv-${Date.now()}`,
          user_one_id: userOneId,
          user_two_id: userTwoId,
          created_at: new Date().toISOString(),
        };
        current.conversations.push(conv);
        writeDb(current);
      }
      return conv;
    },
    listConversations: (userId: string) => {
      const dbInstance = readDb();
      const conversations = dbInstance.conversations.filter(
        (c) => c.user_one_id === userId || c.user_two_id === userId
      );

      return conversations.map((c) => {
        const otherUserId = c.user_one_id === userId ? c.user_two_id : c.user_one_id;
        const otherUser = dbInstance.users.find((u) => u.id === otherUserId);
        const convMessages = dbInstance.messages
          .filter((m) => m.conversation_id === c.id)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        const lastMessage = convMessages[0] || null;

        return {
          id: c.id,
          other_user: otherUser || { id: otherUserId, anonymous_username: "Anonymous Peer", avatar_id: "av-1", country: "Caribbean", role: "user" },
          last_message: lastMessage,
          created_at: c.created_at,
        };
      });
    },
    listMessages: (conversationId: string) => {
      return readDb().messages.filter((m) => m.conversation_id === conversationId).sort((a,b) => a.created_at.localeCompare(b.created_at));
    },
    sendMessage: (msg: Omit<Message, "id" | "created_at" | "status">) => {
      const current = readDb();
      const newMessage: Message = {
        ...msg,
        id: `msg-${Date.now()}`,
        created_at: new Date().toISOString(),
        status: "sent",
      };
      current.messages.push(newMessage);
      writeDb(current);
      return newMessage;
    },
  },

  // REPORTS
  reports: {
    list: () => readDb().reports.sort((a,b) => b.created_at.localeCompare(a.created_at)),
    create: (report: Omit<Report, "id" | "created_at" | "status">) => {
      const current = readDb();
      const newReport: Report = {
        ...report,
        id: `rep-${Date.now()}`,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      current.reports.push(newReport);

      // Flag corresponding content if target matches
      if (report.content_type === "post") {
        const p = current.posts.find((p) => p.id === report.target_id);
        if (p) p.status = "flagged";
      }

      writeDb(current);
      return newReport;
    },
    updateStatus: (reportId: string, status: "pending" | "reviewed" | "action_taken") => {
      const current = readDb();
      const rep = current.reports.find((r) => r.id === reportId);
      if (rep) {
        rep.status = status;
        writeDb(current);
      }
      return rep;
    },
  },

  // SAFETY EVENTS (CRISIS LOGGER)
  safetyEvents: {
    list: () => readDb().safety_events.sort((a,b) => b.created_at.localeCompare(a.created_at)),
    create: (event: Omit<SafetyEvent, "id" | "created_at">) => {
      const current = readDb();
      const newEvent: SafetyEvent = {
        ...event,
        id: `saf-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      current.safety_events.push(newEvent);
      writeDb(current);
      return newEvent;
    },
  },

  // MODERATION ACTIONS
  moderationActions: {
    list: () => readDb().moderation_actions.sort((a,b) => b.created_at.localeCompare(a.created_at)),
    execute: (action: Omit<ModerationAction, "id" | "created_at">) => {
      const current = readDb();
      const newAction: ModerationAction = {
        ...action,
        id: `mod-act-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      current.moderation_actions.push(newAction);

      // Perform action on targets
      if (action.action_type === "remove_post") {
        const post = current.posts.find((p) => p.id === action.target_id);
        if (post) post.status = "removed";
      } else if (action.action_type === "remove_comment") {
        current.comments = current.comments.filter((c) => c.id !== action.target_id);
      }

      writeDb(current);
      return newAction;
    },
  },

  // RESOURCES
  resources: {
    list: (categoryId?: string) => {
      const res = readDb().resources;
      if (categoryId) {
        return res.filter((r) => r.category_id === categoryId);
      }
      return res;
    },
    categories: () => readDb().resource_categories,
    get: (id: string) => readDb().resources.find((r) => r.id === id),
  },

  // THERAPISTS & APPOINTMENTS
  therapists: {
    list: () => readDb().therapists,
    get: (id: string) => readDb().therapists.find((t) => t.id === id),
    register: (therapist: Omit<Therapist, "id" | "verified" | "rating">) => {
      const current = readDb();
      const newTher: Therapist = {
        ...therapist,
        id: `ther-${Date.now()}`,
        verified: false, // Moderation verification required
        rating: 5.0,
      };
      current.therapists.push(newTher);
      writeDb(current);
      return newTher;
    },
    createAppointment: (app: Omit<Appointment, "id" | "status">) => {
      const current = readDb();
      const newApp: Appointment = {
        ...app,
        id: `app-${Date.now()}`,
        status: "requested",
      };
      current.appointments.push(newApp);
      writeDb(current);
      return newApp;
    },
    listAppointments: (userId: string, isTherapist = false) => {
      const dbInstance = readDb();
      const appointments = dbInstance.appointments.filter((a) =>
        isTherapist ? a.therapist_id === userId : a.user_id === userId
      );

      return appointments.map((a) => {
        const ther = dbInstance.therapists.find((t) => t.id === a.therapist_id);
        const usr = dbInstance.users.find((u) => u.id === a.user_id);
        return {
          ...a,
          therapist_name: ther ? ther.name : "Licensed Counselor",
          user_name: usr ? usr.anonymous_username : "Anonymous User",
        };
      });
    },
    updateAppointmentStatus: (appId: string, status: Appointment["status"]) => {
      const current = readDb();
      const app = current.appointments.find((a) => a.id === appId);
      if (app) {
        app.status = status;
        writeDb(current);
      }
      return app;
    },
  },

  // AUDIT LOGS
  audit: {
    list: () => readDb().audit_logs.sort((a,b) => b.created_at.localeCompare(a.created_at)),
    log: (userId: string, action: string, details: string, ip: string = "0.0.0.0") => {
      const current = readDb();
      const newLog: AuditLog = {
        id: `aud-${Date.now()}`,
        user_id: userId,
        action,
        details,
        ip_address: ip,
        created_at: new Date().toISOString(),
      };
      current.audit_logs.push(newLog);
      writeDb(current);
      return newLog;
    },
  },
};
