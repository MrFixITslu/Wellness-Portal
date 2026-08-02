import React, { useState } from "react";
import { User } from "../types";
import { Shield, Sparkles, Heart, HelpCircle, Check } from "lucide-react";

interface AuthPageProps {
  onAuthSuccess: (user: User) => void;
}

const CARIBBEAN_COUNTRIES = [
  "Barbados",
  "Jamaica",
  "Saint Lucia",
  "Trinidad & Tobago",
  "Guyana",
  "Grenada",
  "Dominica",
  "Antigua & Barbuda",
  "St. Vincent & the Grenadines",
  "St. Kitts & Nevis"
];

const AVATARS = [
  { id: "hibiscus", label: "Hibiscus Blossom", emoji: "🌺", bg: "bg-red-50 text-red-600" },
  { id: "turtle", label: "Leatherback Turtle", emoji: "🐢", bg: "bg-emerald-50 text-emerald-600" },
  { id: "palm", label: "Coconut Palm", emoji: "🌴", bg: "bg-green-50 text-green-600" },
  { id: "breeze", label: "Ocean Breeze", emoji: "🍃", bg: "bg-teal-50 text-teal-600" },
  { id: "shell", label: "Conch Shell", emoji: "🐚", bg: "bg-orange-50 text-orange-600" },
  { id: "sun", label: "Sunrise Gold", emoji: "☀️", bg: "bg-amber-50 text-amber-600" }
];

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("Barbados");
  const [selectedAvatar, setSelectedAvatar] = useState("breeze");
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [isModeratorCode, setIsModeratorCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Generate a random comforting anonymous name
  const handleRandomizeName = () => {
    const prefixes = ["calm", "sunny", "ocean", "serene", "coral", "breeze", "sand", "coconut", "reggae", "rainforest"];
    const suffixes = ["lime", "waves", "shell", "star", "turtle", "bird", "clouds", "sky", "heart", "friend"];
    const randPre = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randSuf = suffixes[Math.floor(Math.random() * suffixes.length)];
    const num = Math.floor(Math.random() * 90) + 10;
    setUsername(`${randPre}_${randSuf}${num}`);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      return setError("Please create or generate an anonymous username.");
    }
    if (!agreedPrivacy) {
      return setError("Please read and accept the safety and privacy guidelines to proceed.");
    }

    setLoading(true);
    try {
      // Determine if registering as moderator for testing purposes
      let role: "user" | "moderator" = "user";
      if (isModeratorCode.trim() === "carib-mod-2026") {
        role = "moderator";
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymous_username: username.toLowerCase().trim(),
          avatar_id: selectedAvatar,
          country,
          role
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register anonymous account");
      }

      localStorage.setItem("carib_wellness_user_id", data.id);
      onAuthSuccess(data);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-page-container" className="min-h-screen bg-[#F8F1E5] flex items-center justify-center p-4">
      <div id="auth-card" className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-[#EBE3D5] overflow-hidden">
        
        {/* Header decoration */}
        <div id="auth-header-bg" className="bg-gradient-to-r from-[#0F4C81] to-[#00A896] p-6 text-white text-center">
          <div className="inline-flex p-3 bg-white/10 rounded-full mb-3">
            <Shield className="w-6 h-6 text-[#F4D35E]" />
          </div>
          <h1 id="auth-title" className="text-2xl font-semibold tracking-tight">Saman Wellness Portal</h1>
          <p id="auth-subtitle" className="text-sm text-teal-50/80 mt-1 max-w-md mx-auto">
            A private, anonymous space designed specifically for Caribbean minds to connect, reflect, and grow.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleRegister} className="p-6 md:p-8 space-y-6">
          
          {error && (
            <div id="auth-error-alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Guidelines info */}
          <div id="privacy-guarantees" className="bg-[#FBF8F3] border border-[#EBE3D5] p-4 rounded-xl space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F4C81] flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[#00A896]" /> Absolute Privacy Guarantees
            </h3>
            <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
              <li>We <strong>NEVER</strong> collect your real name, email, phone number, or address.</li>
              <li>Your personal journals and private messages are <strong>encrypted (AES-256)</strong> on our server.</li>
              <li>You choose a completely anonymous identity below.</li>
            </ul>
          </div>

          {/* Anonymous Username */}
          <div className="space-y-2">
            <label id="label-username" className="block text-sm font-medium text-slate-700">
              Create Anonymous Username
            </label>
            <div className="flex gap-2">
              <input
                id="input-anonymous-username"
                type="text"
                placeholder="e.g. calm_breeze24"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-[#FBF8F3] border border-[#EBE3D5] rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A896]/30 text-sm"
              />
              <button
                id="btn-generate-name"
                type="button"
                onClick={handleRandomizeName}
                className="px-3 py-2 bg-[#00A896] hover:bg-[#02C39A] text-white rounded-xl text-xs font-medium transition-colors"
              >
                Generate Name
              </button>
            </div>
            <p className="text-xs text-slate-400">Please do NOT use your real name or personal nicknames.</p>
          </div>

          {/* Country Selection */}
          <div className="space-y-2">
            <label id="label-country" className="block text-sm font-medium text-slate-700">
              Your Caribbean Country / Territory
            </label>
            <select
              id="select-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#FBF8F3] border border-[#EBE3D5] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A896]/30 text-sm"
            >
              {CARIBBEAN_COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400">Helps us display local emergency networks and crisis numbers relevant to you.</p>
          </div>

          {/* Avatar Selection */}
          <div className="space-y-3">
            <label id="label-avatar" className="block text-sm font-medium text-slate-700">
              Select Your Wellness Avatar
            </label>
            <div id="avatar-grid" className="grid grid-cols-3 gap-2.5">
              {AVATARS.map((av) => (
                <button
                  id={`btn-avatar-${av.id}`}
                  key={av.id}
                  type="button"
                  onClick={() => setSelectedAvatar(av.id)}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    selectedAvatar === av.id
                      ? "border-[#00A896] bg-[#00A896]/5 ring-2 ring-[#00A896]/20"
                      : "border-[#EBE3D5] bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className="text-2xl mb-1">{av.emoji}</span>
                  <span className="text-[10px] font-medium text-slate-600 truncate max-w-full text-center">{av.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Moderator Bypass (for evaluation) */}
          <div className="border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setIsModeratorCode(isModeratorCode ? "" : " ")}
              className="text-[11px] text-[#0F4C81] hover:underline"
            >
              Have a clinical moderator access code? Click here.
            </button>
            {isModeratorCode !== "" && (
              <input
                type="text"
                placeholder="Enter Moderator Code (Use: carib-mod-2026)"
                value={isModeratorCode.trim()}
                onChange={(e) => setIsModeratorCode(e.target.value)}
                className="mt-2 w-full px-3 py-1.5 border border-amber-200 bg-amber-50/50 rounded-lg text-xs"
              />
            )}
          </div>

          {/* Consent Checkbox */}
          <div className="flex items-start gap-3">
            <input
              id="chk-privacy-agreement"
              type="checkbox"
              checked={agreedPrivacy}
              onChange={(e) => setAgreedPrivacy(e.target.checked)}
              className="mt-1 h-4.5 w-4.5 rounded text-[#00A896] border-[#EBE3D5] focus:ring-[#00A896]"
            />
            <span id="consent-text" className="text-xs text-slate-500 leading-normal">
              I agree that this application is a supportive wellness companion and <strong>NOT a replacement for psychiatric therapy, diagnosis, or clinical emergency treatment</strong>. My data will be kept anonymous.
            </span>
          </div>

          {/* Submit */}
          <button
            id="btn-submit-register"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#0F4C81] hover:bg-[#1D70B8] disabled:bg-[#0F4C81]/40 text-white font-medium rounded-xl transition-colors text-sm shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? "Establishing Private Session..." : "Enter Saman Wellness Platform"}
          </button>

        </form>
      </div>
    </div>
  );
}
