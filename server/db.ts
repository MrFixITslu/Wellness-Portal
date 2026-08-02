import fs from "fs";
import path from "path";
import crypto from "crypto";
import Database from "better-sqlite3";

// ----------------------------------------------------------------------
// TYPES (unchanged from the previous JSON-file schema — every route in
// server.ts and every component in src/ consumes these same shapes)
// ----------------------------------------------------------------------

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
  mood_score: number;
  stress_level: number;
  energy_level: number;
  sleep_quality: number;
  note: string;
  created_at: string;
}

export interface Journal {
  id: string;
  user_id: string;
  title: string;
  encrypted_content: string;
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
  liked_by_users: string[];
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
  encrypted_content: string;
  created_at: string;
  status: "sent" | "read" | "flagged" | "removed";
}

export interface Report {
  id: string;
  reporter_id: string;
  content_type: "post" | "comment" | "message";
  target_id: string;
  reason: string;
  details: string;
  status: "pending" | "reviewed" | "action_taken";
  created_at: string;
}

export interface SafetyEvent {
  id: string;
  user_id: string;
  event_type: "crisis_detected" | "abuse_detected" | "escalation";
  risk_score: number;
  content_snippet: string;
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
  date: string;
  slot: string;
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

export interface Session {
  token_hash: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}

// ----------------------------------------------------------------------
// DATABASE SETUP
// ----------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "wellness.sqlite3");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const sqlite = new Database(DB_PATH);

// WAL mode gives real concurrent-read / single-writer safety instead of
// the previous "rewrite the whole JSON file on every request" approach.
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = NORMAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    anonymous_username TEXT NOT NULL UNIQUE,
    avatar_id TEXT NOT NULL,
    country TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    notifications_enabled INTEGER NOT NULL DEFAULT 1,
    daily_reminder_time TEXT NOT NULL DEFAULT '08:00',
    share_anonymously INTEGER NOT NULL DEFAULT 1,
    high_contrast_mode INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS mood_checkins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    mood_score INTEGER NOT NULL,
    stress_level INTEGER NOT NULL,
    energy_level INTEGER NOT NULL,
    sleep_quality INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_moods_user ON mood_checkins(user_id);

  CREATE TABLE IF NOT EXISTS journals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    encrypted_content TEXT NOT NULL,
    mood_tag TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_journals_user ON journals(user_id);

  CREATE TABLE IF NOT EXISTS communities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS community_members (
    id TEXT PRIMARY KEY,
    community_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at TEXT NOT NULL,
    UNIQUE(community_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_members_user ON community_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_members_community ON community_members(community_id);

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    community_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    anonymous_author TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    report_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    likes_count INTEGER NOT NULL DEFAULT 0,
    liked_by_users TEXT NOT NULL DEFAULT '[]'
  );
  CREATE INDEX IF NOT EXISTS idx_posts_community ON posts(community_id);
  CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    anonymous_author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    report_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_one_id TEXT NOT NULL,
    user_two_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_conversations_user_one ON conversations(user_one_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_user_two ON conversations(user_two_id);

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    encrypted_content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent'
  );
  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    content_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

  CREATE TABLE IF NOT EXISTS safety_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    content_snippet TEXT NOT NULL DEFAULT '',
    action_taken TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_safety_user ON safety_events(user_id);

  CREATE TABLE IF NOT EXISTS moderation_actions (
    id TEXT PRIMARY KEY,
    moderator_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resource_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    read_time_mins INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category_id);

  CREATE TABLE IF NOT EXISTS therapists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    credentials TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    specialties TEXT NOT NULL DEFAULT '[]',
    availability_slots TEXT NOT NULL DEFAULT '[]',
    verified INTEGER NOT NULL DEFAULT 0,
    rating REAL NOT NULL DEFAULT 5.0
  );
  CREATE INDEX IF NOT EXISTS idx_therapists_user ON therapists(user_id);

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    therapist_id TEXT NOT NULL,
    date TEXT NOT NULL,
    slot TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested',
    notes TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_therapist ON appointments(therapist_id);

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    ip_address TEXT NOT NULL DEFAULT '0.0.0.0',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
`);

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
function nowIso(): string {
  return new Date().toISOString();
}
function toBool(v: number | null | undefined): boolean {
  return !!v;
}
function toInt(v: boolean | undefined): number {
  return v ? 1 : 0;
}

// ----------------------------------------------------------------------
// SEED DATA — inserted only once, on first boot (table empty)
// ----------------------------------------------------------------------

function seedIfEmpty() {
  const userCount = (sqlite.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
  if (userCount > 0) return;

  const seed = sqlite.transaction(() => {
    const categories: ResourceCategory[] = [
      { id: "cat-1", name: "Anxiety", description: "Coping with worry, tension, and breathing panic" },
      { id: "cat-2", name: "Stress", description: "Managing pressure in career, home, and island life" },
      { id: "cat-3", name: "Sleep", description: "Improving rest, relaxation techniques, and evening calmness" },
      { id: "cat-4", name: "Relationships", description: "Fostering healthy boundaries, connection, and emotional growth" },
      { id: "cat-5", name: "Parenting", description: "Navigating discipline, tradition, and youthful mental health support" },
      { id: "cat-6", name: "Mental Wellness", description: "Broad articles on breaking stigma and mindful living in the Caribbean" },
    ];
    const insertCategory = sqlite.prepare("INSERT INTO resource_categories (id, name, description) VALUES (@id, @name, @description)");
    categories.forEach((c) => insertCategory.run(c));

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
        created_at: nowIso(),
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
        created_at: nowIso(),
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
        created_at: nowIso(),
      },
    ];
    const insertResource = sqlite.prepare(
      "INSERT INTO resources (id, category_id, title, excerpt, content, read_time_mins, created_at) VALUES (@id, @category_id, @title, @excerpt, @content, @read_time_mins, @created_at)"
    );
    resources.forEach((r) => insertResource.run(r));

    const communities: Community[] = [
      { id: "comm-1", name: "Anxiety Support", description: "A calming group to share coping strategies and find relief from worry.", category: "Anxiety", created_at: nowIso() },
      { id: "comm-2", name: "Stress Management", description: "Sharing tips on balancing work, island life, and financial responsibilities.", category: "Stress", created_at: nowIso() },
      { id: "comm-3", name: "Parenting", description: "Connecting Caribbean parents to share advice on raising kids with love and patience.", category: "Parenting", created_at: nowIso() },
      { id: "comm-4", name: "Grief Support", description: "A gentle space for anyone healing from loss and looking for mutual understanding.", category: "Grief", created_at: nowIso() },
      { id: "comm-5", name: "Men's Wellness", description: "Breaking the stigma, opening up about pressures, and supporting fellow brothers.", category: "Wellness", created_at: nowIso() },
      { id: "comm-6", name: "Youth Support", description: "For young adults navigating life transitions, school, and emotional identity.", category: "Youth", created_at: nowIso() },
      { id: "comm-7", name: "Financial Stress", description: "A supportive, non-judgmental space to share anxiety around inflation and living expenses.", category: "Financial", created_at: nowIso() },
    ];
    const insertCommunity = sqlite.prepare("INSERT INTO communities (id, name, description, category, created_at) VALUES (@id, @name, @description, @category, @created_at)");
    communities.forEach((c) => insertCommunity.run(c));

    const therapists: Therapist[] = [
      {
        id: "ther-1", user_id: "user-therapist-1", name: "Dr. Alana Clarke", country: "Barbados",
        credentials: "PhD in Clinical Psychology, UWI",
        bio: "With over 12 years of experience, Dr. Clarke specializes in anxiety, storm trauma, and CBT, blending modern therapy with culturally responsive techniques.",
        specialties: ["Anxiety", "Trauma", "CBT", "Stress Management"],
        availability_slots: ["Monday 9:00 AM", "Monday 11:00 AM", "Wednesday 2:00 PM"],
        verified: true, rating: 4.9,
      },
      {
        id: "ther-2", user_id: "user-therapist-2", name: "Jean-Pierre Baptiste", country: "Trinidad & Tobago",
        credentials: "MSc in Counseling Psychology",
        bio: "Jean-Pierre is passionate about family counseling and men's mental wellness. He works extensively with local support groups across Trinidad.",
        specialties: ["Relationships", "Men's Wellness", "Family Therapy"],
        availability_slots: ["Tuesday 10:00 AM", "Thursday 3:00 PM", "Friday 1:00 PM"],
        verified: true, rating: 4.8,
      },
      {
        id: "ther-3", user_id: "user-therapist-3", name: "Cheryl Noel", country: "Saint Lucia",
        credentials: "M.Ed. in School Counseling & Trauma Specialist",
        bio: "Cheryl focuses on young adult guidance, stress management, and self-acceptance, using creative arts and mindfulness.",
        specialties: ["Youth Support", "Grief", "Mindfulness", "Anxiety"],
        availability_slots: ["Wednesday 10:00 AM", "Friday 10:00 AM", "Friday 4:00 PM"],
        verified: true, rating: 4.9,
      },
    ];
    const insertTherapist = sqlite.prepare(
      "INSERT INTO therapists (id, user_id, name, country, credentials, bio, specialties, availability_slots, verified, rating) VALUES (@id, @user_id, @name, @country, @credentials, @bio, @specialties, @availability_slots, @verified, @rating)"
    );
    therapists.forEach((t) =>
      insertTherapist.run({ ...t, specialties: JSON.stringify(t.specialties), availability_slots: JSON.stringify(t.availability_slots), verified: toInt(t.verified) })
    );

    // Backing user accounts for the seeded moderator/therapist fixtures.
    // NOTE: these fixture accounts have no password/session by design and
    // exist only so posts/comments/appointments have somewhere to point.
    // They cannot be logged into — there is no credential that maps to them.
    const users: User[] = [
      { id: "user-moderator-1", anonymous_username: "island_moderator", avatar_id: "av-mod", country: "Barbados", role: "moderator", created_at: nowIso() },
      { id: "user-therapist-1", anonymous_username: "dr_alana", avatar_id: "av-ther-1", country: "Barbados", role: "therapist", created_at: nowIso() },
      { id: "user-therapist-2", anonymous_username: "jp_baptiste", avatar_id: "av-ther-2", country: "Trinidad & Tobago", role: "therapist", created_at: nowIso() },
      { id: "user-therapist-3", anonymous_username: "cheryl_counselor", avatar_id: "av-ther-3", country: "Saint Lucia", role: "therapist", created_at: nowIso() },
    ];
    const insertUser = sqlite.prepare("INSERT INTO users (id, anonymous_username, avatar_id, country, role, created_at) VALUES (@id, @anonymous_username, @avatar_id, @country, @role, @created_at)");
    users.forEach((u) => insertUser.run(u));
    sqlite.prepare(
      "INSERT INTO user_settings (user_id, notifications_enabled, daily_reminder_time, share_anonymously, high_contrast_mode) VALUES (?, 1, '08:00', 1, 0)"
    ).run("user-moderator-1");

    sqlite.prepare(
      "INSERT INTO posts (id, community_id, user_id, anonymous_author, title, content, created_at, report_count, status, likes_count, liked_by_users) VALUES (@id, @community_id, @user_id, @anonymous_author, @title, @content, @created_at, 0, 'active', 5, '[]')"
    ).run({
      id: "post-1", community_id: "comm-1", user_id: "user-moderator-1", anonymous_author: "calm_breeze",
      title: "Welcome to the Anxiety Support Community",
      content: "Hello everyone, this is a safe space to share what you're dealing with. No judgments. Let's lift each other up. What's one thing you do to feel grounded when anxiety hits?",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    });
    sqlite.prepare(
      "INSERT INTO comments (id, post_id, user_id, anonymous_author, content, created_at, report_count) VALUES (@id, @post_id, @user_id, @anonymous_author, @content, @created_at, 0)"
    ).run({
      id: "comm-c-1", post_id: "post-1", user_id: "user-therapist-1", anonymous_author: "wellness_guide",
      content: "A wonderful step! For me, ocean sound breathing always works. Grateful to be part of this group.",
      created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    });
  });

  seed();
}

seedIfEmpty();

const defaultSettings = (userId: string): UserSettings => ({
  user_id: userId,
  notifications_enabled: true,
  daily_reminder_time: "08:00",
  share_anonymously: true,
  high_contrast_mode: false,
});

// ----------------------------------------------------------------------
// RELATIONAL OPERATIONS — same public shape as the old JSON-file version,
// backed by real prepared statements and transactions instead of a
// read-everything/write-everything flat file.
// ----------------------------------------------------------------------

export const db = {
  // SESSIONS (new — see server/auth.ts)
  sessions: {
    create: (userId: string, tokenHash: string, ttlMs: number): Session => {
      const session: Session = {
        token_hash: tokenHash,
        user_id: userId,
        created_at: nowIso(),
        expires_at: new Date(Date.now() + ttlMs).toISOString(),
      };
      sqlite.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (@token_hash, @user_id, @created_at, @expires_at)").run(session);
      return session;
    },
    find: (tokenHash: string): Session | undefined => {
      return sqlite.prepare("SELECT * FROM sessions WHERE token_hash = ?").get(tokenHash) as Session | undefined;
    },
    destroy: (tokenHash: string): void => {
      sqlite.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    },
    pruneExpired: (): void => {
      sqlite.prepare("DELETE FROM sessions WHERE expires_at < ?").run(nowIso());
    },
  },

  // USERS
  users: {
    find: (id: string): User | undefined => sqlite.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined,
    findByUsername: (uname: string): User | undefined =>
      sqlite.prepare("SELECT * FROM users WHERE anonymous_username = ?").get(uname) as User | undefined,
    create: (user: Omit<User, "id" | "created_at">): User => {
      const newUser: User = { ...user, id: newId("user"), created_at: nowIso() };
      const tx = sqlite.transaction(() => {
        sqlite.prepare("INSERT INTO users (id, anonymous_username, avatar_id, country, role, created_at) VALUES (@id, @anonymous_username, @avatar_id, @country, @role, @created_at)").run(newUser);
        const settings = defaultSettings(newUser.id);
        sqlite.prepare(
          "INSERT INTO user_settings (user_id, notifications_enabled, daily_reminder_time, share_anonymously, high_contrast_mode) VALUES (@user_id, @notifications_enabled, @daily_reminder_time, @share_anonymously, @high_contrast_mode)"
        ).run({ ...settings, notifications_enabled: toInt(settings.notifications_enabled), share_anonymously: toInt(settings.share_anonymously), high_contrast_mode: toInt(settings.high_contrast_mode) });
      });
      tx();
      return newUser;
    },
    setRole: (id: string, role: User["role"]): void => {
      sqlite.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
    },
  },

  // USER SETTINGS
  settings: {
    get: (userId: string): UserSettings => {
      const row = sqlite.prepare("SELECT * FROM user_settings WHERE user_id = ?").get(userId) as any;
      if (!row) return defaultSettings(userId);
      return {
        user_id: row.user_id,
        notifications_enabled: toBool(row.notifications_enabled),
        daily_reminder_time: row.daily_reminder_time,
        share_anonymously: toBool(row.share_anonymously),
        high_contrast_mode: toBool(row.high_contrast_mode),
      };
    },
    update: (userId: string, updates: Partial<Omit<UserSettings, "user_id">>): UserSettings => {
      const current = db.settings.get(userId);
      const merged = { ...current, ...updates };
      sqlite.prepare(
        `INSERT INTO user_settings (user_id, notifications_enabled, daily_reminder_time, share_anonymously, high_contrast_mode)
         VALUES (@user_id, @notifications_enabled, @daily_reminder_time, @share_anonymously, @high_contrast_mode)
         ON CONFLICT(user_id) DO UPDATE SET
           notifications_enabled = excluded.notifications_enabled,
           daily_reminder_time = excluded.daily_reminder_time,
           share_anonymously = excluded.share_anonymously,
           high_contrast_mode = excluded.high_contrast_mode`
      ).run({
        user_id: userId,
        notifications_enabled: toInt(merged.notifications_enabled),
        daily_reminder_time: merged.daily_reminder_time,
        share_anonymously: toInt(merged.share_anonymously),
        high_contrast_mode: toInt(merged.high_contrast_mode),
      });
      return merged;
    },
  },

  // MOOD CHECKINS
  moods: {
    list: (userId: string): MoodCheckin[] =>
      sqlite.prepare("SELECT * FROM mood_checkins WHERE user_id = ? ORDER BY created_at DESC").all(userId) as MoodCheckin[],
    create: (checkin: Omit<MoodCheckin, "id" | "created_at">): MoodCheckin => {
      const newCheckin: MoodCheckin = { ...checkin, id: newId("mood"), created_at: nowIso() };
      sqlite.prepare(
        "INSERT INTO mood_checkins (id, user_id, mood_score, stress_level, energy_level, sleep_quality, note, created_at) VALUES (@id, @user_id, @mood_score, @stress_level, @energy_level, @sleep_quality, @note, @created_at)"
      ).run(newCheckin);
      return newCheckin;
    },
  },

  // JOURNALS
  journals: {
    list: (userId: string): Journal[] =>
      sqlite.prepare("SELECT * FROM journals WHERE user_id = ? ORDER BY created_at DESC").all(userId) as Journal[],
    get: (id: string): Journal | undefined => sqlite.prepare("SELECT * FROM journals WHERE id = ?").get(id) as Journal | undefined,
    create: (journal: Omit<Journal, "id" | "created_at">): Journal => {
      const newJournal: Journal = { ...journal, id: newId("journal"), created_at: nowIso() };
      sqlite.prepare(
        "INSERT INTO journals (id, user_id, title, encrypted_content, mood_tag, created_at) VALUES (@id, @user_id, @title, @encrypted_content, @mood_tag, @created_at)"
      ).run(newJournal);
      return newJournal;
    },
    delete: (id: string, userId: string): boolean => {
      const result = sqlite.prepare("DELETE FROM journals WHERE id = ? AND user_id = ?").run(id, userId);
      return result.changes > 0;
    },
  },

  // COMMUNITIES
  communities: {
    list: (): Community[] => sqlite.prepare("SELECT * FROM communities").all() as Community[],
    join: (communityId: string, userId: string): CommunityMember => {
      const existing = sqlite.prepare("SELECT * FROM community_members WHERE community_id = ? AND user_id = ?").get(communityId, userId) as CommunityMember | undefined;
      if (existing) return existing;
      const newMember: CommunityMember = { id: newId("member"), community_id: communityId, user_id: userId, joined_at: nowIso() };
      sqlite.prepare("INSERT INTO community_members (id, community_id, user_id, joined_at) VALUES (@id, @community_id, @user_id, @joined_at)").run(newMember);
      return newMember;
    },
    joinedByUser: (userId: string): Community[] =>
      sqlite.prepare(
        `SELECT c.* FROM communities c
         JOIN community_members m ON m.community_id = c.id
         WHERE m.user_id = ?`
      ).all(userId) as Community[],
  },

  // POSTS
  posts: {
    list: (communityId?: string): Post[] => {
      const rows = communityId
        ? sqlite.prepare("SELECT * FROM posts WHERE status = 'active' AND community_id = ? ORDER BY created_at DESC").all(communityId)
        : sqlite.prepare("SELECT * FROM posts WHERE status = 'active' ORDER BY created_at DESC").all();
      return (rows as any[]).map((r) => ({ ...r, liked_by_users: JSON.parse(r.liked_by_users || "[]") }));
    },
    get: (id: string): Post | undefined => {
      const row = sqlite.prepare("SELECT * FROM posts WHERE id = ?").get(id) as any;
      if (!row) return undefined;
      return { ...row, liked_by_users: JSON.parse(row.liked_by_users || "[]") };
    },
    create: (post: Omit<Post, "id" | "created_at" | "report_count" | "status" | "likes_count" | "liked_by_users">): Post => {
      const newPost: Post = { ...post, id: newId("post"), created_at: nowIso(), report_count: 0, status: "active", likes_count: 0, liked_by_users: [] };
      sqlite.prepare(
        "INSERT INTO posts (id, community_id, user_id, anonymous_author, title, content, created_at, report_count, status, likes_count, liked_by_users) VALUES (@id, @community_id, @user_id, @anonymous_author, @title, @content, @created_at, 0, 'active', 0, '[]')"
      ).run(newPost);
      return newPost;
    },
    like: (postId: string, userId: string): Post | undefined => {
      const tx = sqlite.transaction(() => {
        const post = db.posts.get(postId);
        if (!post) return undefined;
        const idx = post.liked_by_users.indexOf(userId);
        if (idx > -1) {
          post.liked_by_users.splice(idx, 1);
          post.likes_count = Math.max(0, post.likes_count - 1);
        } else {
          post.liked_by_users.push(userId);
          post.likes_count += 1;
        }
        sqlite.prepare("UPDATE posts SET likes_count = ?, liked_by_users = ? WHERE id = ?").run(post.likes_count, JSON.stringify(post.liked_by_users), postId);
        return post;
      });
      return tx();
    },
    report: (postId: string): Post | undefined => {
      const tx = sqlite.transaction(() => {
        const post = db.posts.get(postId);
        if (!post) return undefined;
        post.report_count += 1;
        if (post.report_count >= 5) post.status = "flagged";
        sqlite.prepare("UPDATE posts SET report_count = ?, status = ? WHERE id = ?").run(post.report_count, post.status, postId);
        return post;
      });
      return tx();
    },
  },

  // COMMENTS
  comments: {
    listByPost: (postId: string): Comment[] =>
      sqlite.prepare("SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC").all(postId) as Comment[],
    create: (comment: Omit<Comment, "id" | "created_at" | "report_count">): Comment => {
      const newComment: Comment = { ...comment, id: newId("comment"), created_at: nowIso(), report_count: 0 };
      sqlite.prepare(
        "INSERT INTO comments (id, post_id, user_id, anonymous_author, content, created_at, report_count) VALUES (@id, @post_id, @user_id, @anonymous_author, @content, @created_at, 0)"
      ).run(newComment);
      return newComment;
    },
  },

  // MESSAGES AND CONVERSATIONS
  messaging: {
    getOrCreateConversation: (userOneId: string, userTwoId: string): Conversation => {
      const existing = sqlite.prepare(
        "SELECT * FROM conversations WHERE (user_one_id = ? AND user_two_id = ?) OR (user_one_id = ? AND user_two_id = ?)"
      ).get(userOneId, userTwoId, userTwoId, userOneId) as Conversation | undefined;
      if (existing) return existing;
      const conv: Conversation = { id: newId("conv"), user_one_id: userOneId, user_two_id: userTwoId, created_at: nowIso() };
      sqlite.prepare("INSERT INTO conversations (id, user_one_id, user_two_id, created_at) VALUES (@id, @user_one_id, @user_two_id, @created_at)").run(conv);
      return conv;
    },
    findConversation: (id: string): Conversation | undefined =>
      sqlite.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as Conversation | undefined,
    listConversations: (userId: string) => {
      const conversations = sqlite.prepare("SELECT * FROM conversations WHERE user_one_id = ? OR user_two_id = ?").all(userId, userId) as Conversation[];
      return conversations.map((c) => {
        const otherUserId = c.user_one_id === userId ? c.user_two_id : c.user_one_id;
        const otherUser = db.users.find(otherUserId);
        const lastMessage = sqlite.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1").get(c.id) as Message | undefined;
        return {
          id: c.id,
          other_user: otherUser || { id: otherUserId, anonymous_username: "Anonymous Peer", avatar_id: "av-1", country: "Caribbean", role: "user" },
          last_message: lastMessage || null,
          created_at: c.created_at,
        };
      });
    },
    listMessages: (conversationId: string): Message[] =>
      sqlite.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(conversationId) as Message[],
    sendMessage: (msg: Omit<Message, "id" | "created_at" | "status">): Message => {
      const newMessage: Message = { ...msg, id: newId("msg"), created_at: nowIso(), status: "sent" };
      sqlite.prepare(
        "INSERT INTO messages (id, conversation_id, sender_id, encrypted_content, created_at, status) VALUES (@id, @conversation_id, @sender_id, @encrypted_content, @created_at, 'sent')"
      ).run(newMessage);
      return newMessage;
    },
  },

  // REPORTS
  reports: {
    list: (): Report[] => sqlite.prepare("SELECT * FROM reports ORDER BY created_at DESC").all() as Report[],
    create: (report: Omit<Report, "id" | "created_at" | "status">): Report => {
      const newReport: Report = { ...report, id: newId("rep"), status: "pending", created_at: nowIso() };
      const tx = sqlite.transaction(() => {
        sqlite.prepare(
          "INSERT INTO reports (id, reporter_id, content_type, target_id, reason, details, status, created_at) VALUES (@id, @reporter_id, @content_type, @target_id, @reason, @details, 'pending', @created_at)"
        ).run(newReport);
        if (report.content_type === "post") {
          sqlite.prepare("UPDATE posts SET status = 'flagged' WHERE id = ?").run(report.target_id);
        }
      });
      tx();
      return newReport;
    },
    updateStatus: (reportId: string, status: Report["status"]): Report | undefined => {
      sqlite.prepare("UPDATE reports SET status = ? WHERE id = ?").run(status, reportId);
      return sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(reportId) as Report | undefined;
    },
  },

  // SAFETY EVENTS
  safetyEvents: {
    list: (): SafetyEvent[] => sqlite.prepare("SELECT * FROM safety_events ORDER BY created_at DESC").all() as SafetyEvent[],
    create: (event: Omit<SafetyEvent, "id" | "created_at">): SafetyEvent => {
      const newEvent: SafetyEvent = { ...event, id: newId("saf"), created_at: nowIso() };
      sqlite.prepare(
        "INSERT INTO safety_events (id, user_id, event_type, risk_score, content_snippet, action_taken, created_at) VALUES (@id, @user_id, @event_type, @risk_score, @content_snippet, @action_taken, @created_at)"
      ).run(newEvent);
      return newEvent;
    },
  },

  // MODERATION ACTIONS
  moderationActions: {
    list: (): ModerationAction[] => sqlite.prepare("SELECT * FROM moderation_actions ORDER BY created_at DESC").all() as ModerationAction[],
    execute: (action: Omit<ModerationAction, "id" | "created_at">): ModerationAction => {
      const newAction: ModerationAction = { ...action, id: newId("mod-act"), created_at: nowIso() };
      const tx = sqlite.transaction(() => {
        sqlite.prepare(
          "INSERT INTO moderation_actions (id, moderator_id, action_type, target_id, reason, created_at) VALUES (@id, @moderator_id, @action_type, @target_id, @reason, @created_at)"
        ).run(newAction);
        if (action.action_type === "remove_post") {
          sqlite.prepare("UPDATE posts SET status = 'removed' WHERE id = ?").run(action.target_id);
        } else if (action.action_type === "remove_comment") {
          sqlite.prepare("DELETE FROM comments WHERE id = ?").run(action.target_id);
        }
      });
      tx();
      return newAction;
    },
  },

  // RESOURCES
  resources: {
    list: (categoryId?: string): Resource[] =>
      categoryId
        ? (sqlite.prepare("SELECT * FROM resources WHERE category_id = ?").all(categoryId) as Resource[])
        : (sqlite.prepare("SELECT * FROM resources").all() as Resource[]),
    categories: (): ResourceCategory[] => sqlite.prepare("SELECT * FROM resource_categories").all() as ResourceCategory[],
    get: (id: string): Resource | undefined => sqlite.prepare("SELECT * FROM resources WHERE id = ?").get(id) as Resource | undefined,
  },

  // THERAPISTS & APPOINTMENTS
  therapists: {
    list: (): Therapist[] =>
      (sqlite.prepare("SELECT * FROM therapists").all() as any[]).map((t) => ({
        ...t, specialties: JSON.parse(t.specialties || "[]"), availability_slots: JSON.parse(t.availability_slots || "[]"), verified: toBool(t.verified),
      })),
    get: (id: string): Therapist | undefined => {
      const row = sqlite.prepare("SELECT * FROM therapists WHERE id = ?").get(id) as any;
      if (!row) return undefined;
      return { ...row, specialties: JSON.parse(row.specialties || "[]"), availability_slots: JSON.parse(row.availability_slots || "[]"), verified: toBool(row.verified) };
    },
    findByUserId: (userId: string): Therapist | undefined => {
      const row = sqlite.prepare("SELECT * FROM therapists WHERE user_id = ?").get(userId) as any;
      if (!row) return undefined;
      return { ...row, specialties: JSON.parse(row.specialties || "[]"), availability_slots: JSON.parse(row.availability_slots || "[]"), verified: toBool(row.verified) };
    },
    register: (therapist: Omit<Therapist, "id" | "verified" | "rating">): Therapist => {
      const newTher: Therapist = { ...therapist, id: newId("ther"), verified: false, rating: 5.0 };
      sqlite.prepare(
        "INSERT INTO therapists (id, user_id, name, country, credentials, bio, specialties, availability_slots, verified, rating) VALUES (@id, @user_id, @name, @country, @credentials, @bio, @specialties, @availability_slots, 0, 5.0)"
      ).run({ ...newTher, specialties: JSON.stringify(newTher.specialties), availability_slots: JSON.stringify(newTher.availability_slots) });
      return newTher;
    },
    createAppointment: (app: Omit<Appointment, "id" | "status">): Appointment => {
      const newApp: Appointment = { ...app, id: newId("appt"), status: "requested" };
      sqlite.prepare(
        "INSERT INTO appointments (id, user_id, therapist_id, date, slot, status, notes) VALUES (@id, @user_id, @therapist_id, @date, @slot, 'requested', @notes)"
      ).run(newApp);
      return newApp;
    },
    getAppointment: (id: string): Appointment | undefined =>
      sqlite.prepare("SELECT * FROM appointments WHERE id = ?").get(id) as Appointment | undefined,
    listAppointments: (userId: string, isTherapist = false) => {
      const appointments = isTherapist
        ? (sqlite.prepare("SELECT * FROM appointments WHERE therapist_id = ?").all(userId) as Appointment[])
        : (sqlite.prepare("SELECT * FROM appointments WHERE user_id = ?").all(userId) as Appointment[]);
      return appointments.map((a) => {
        const ther = db.therapists.get(a.therapist_id);
        const usr = db.users.find(a.user_id);
        return { ...a, therapist_name: ther ? ther.name : "Licensed Counselor", user_name: usr ? usr.anonymous_username : "Anonymous User" };
      });
    },
    updateAppointmentStatus: (appId: string, status: Appointment["status"]): Appointment | undefined => {
      sqlite.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, appId);
      return sqlite.prepare("SELECT * FROM appointments WHERE id = ?").get(appId) as Appointment | undefined;
    },
  },

  // AUDIT LOGS
  audit: {
    list: (): AuditLog[] => sqlite.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC").all() as AuditLog[],
    log: (userId: string, action: string, details: string, ip: string = "0.0.0.0"): AuditLog => {
      const newLog: AuditLog = { id: newId("aud"), user_id: userId, action, details, ip_address: ip, created_at: nowIso() };
      sqlite.prepare(
        "INSERT INTO audit_logs (id, user_id, action, details, ip_address, created_at) VALUES (@id, @user_id, @action, @details, @ip_address, @created_at)"
      ).run(newLog);
      return newLog;
    },
  },
};
