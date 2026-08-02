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
  content: string; // Already decrypted when queried from API
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
  other_user: User;
  last_message: {
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string; // Already decrypted
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

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details: string;
  ip_address: string;
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
  therapist_name: string;
  user_name: string;
}
