import React, { useEffect, useState } from "react";
import { User, Journal } from "../types";
import { BookOpen, Search, Plus, Trash2, ShieldCheck, Heart, Sparkles, Filter } from "lucide-react";

interface JournalProps {
  user: User;
}

const MOOD_TAGS = [
  { label: "Peaceful", emoji: "🌊" },
  { label: "Anxious", emoji: "☁️" },
  { label: "Stressed", emoji: "⚡" },
  { label: "Joyful", emoji: "☀️" },
  { label: "Lonely", emoji: "🍃" },
  { label: "Grieving", emoji: "🕊️" }
];

export default function JournalComponent({ user }: JournalProps) {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [moodTag, setMoodTag] = useState("Peaceful");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchJournals = async () => {
    try {
      const res = await fetch(`/api/users/${user.id}/journals`);
      if (res.ok) {
        const data = await res.json();
        setJournals(data);
      }
    } catch (err: any) {
      console.error("Failed to load journals", err);
    }
  };

  useEffect(() => {
    fetchJournals();
  }, [user.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title.trim() || !content.trim()) {
      return setError("Please add a title and some reflection text to your journal entry.");
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/journals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          mood_tag: moodTag
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to encrypt and store journal");
      }

      setSuccess("Your thoughts have been encrypted and saved securely.");
      setTitle("");
      setContent("");
      fetchJournals();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (journalId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this entry? Once deleted, it cannot be recovered from our encrypted vaults.")) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}/journals/${journalId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSuccess("Journal entry has been permanently deleted.");
        fetchJournals();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  const filteredJournals = journals.filter((j) => {
    const matchesSearch = j.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          j.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterTag === "all" || j.mood_tag === filterTag;
    return matchesSearch && matchesFilter;
  });

  return (
    <div id="journal-container" className="space-y-6 max-w-4xl mx-auto">
      
      {/* Page Header */}
      <div className="space-y-1">
        <h1 id="journal-title" className="text-xl font-semibold tracking-tight text-[#163A2E]">My Secure Reflections</h1>
        <p id="journal-desc" className="text-slate-500 text-xs flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600 inline" /> 
          This is your private, safe vault. Every word is encrypted via AES-256 before being committed to the database.
        </p>
      </div>

      <div id="journal-cols" className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Create Entry */}
        <div className="md:col-span-6 bg-white border border-[#E3D8BF] rounded-2xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Plus className="w-4.5 h-4.5 text-[#158A80]" /> New Journal Entry
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl">
                {success}
              </div>
            )}

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Entry Title</label>
              <input
                type="text"
                placeholder="e.g. Setting clear boundaries at work"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-[#FAF6EA] border border-[#E3D8BF] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#158A80]/30 text-xs"
              />
            </div>

            {/* Mood Tag */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 block">Current Emotion Tag</label>
              <div className="flex flex-wrap gap-1.5">
                {MOOD_TAGS.map((tag) => (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => setMoodTag(tag.label)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all flex items-center gap-1 ${
                      moodTag === tag.label
                        ? "bg-[#158A80] text-white border-transparent shadow-sm"
                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{tag.emoji}</span>
                    <span>{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Textarea */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Private Reflection</label>
              <textarea
                rows={8}
                placeholder="What is circulating in your mind? Spill your thoughts freely without fear. This canvas is fully yours..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF6EA] border border-[#E3D8BF] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#158A80]/30 text-xs leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#163A2E] hover:bg-[#1FA396] disabled:bg-[#163A2E]/40 text-white font-medium rounded-xl transition-colors text-xs shadow-sm"
            >
              {loading ? "Encrypting and Storing..." : "Commit Encrypted Entry"}
            </button>
          </form>
        </div>

        {/* Right Column: Past Logs & Search */}
        <div className="md:col-span-6 space-y-4">
          
          {/* Controls: Search and Filter */}
          <div className="bg-white border border-[#E3D8BF] rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search reflections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#FAF6EA] border border-[#E3D8BF] rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none text-xs"
              />
            </div>

            {/* Filter by emotion */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="px-3 py-2 bg-[#FAF6EA] border border-[#E3D8BF] rounded-xl text-slate-700 text-xs focus:outline-none"
              >
                <option value="all">All Emotions</option>
                {MOOD_TAGS.map((t) => (
                  <option key={t.label} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reflections List */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {filteredJournals.length === 0 ? (
              <div className="bg-white border border-[#E3D8BF] p-8 text-center rounded-2xl text-slate-400 text-xs italic">
                No matching journal entries found. Begin typing on the left to start your private record.
              </div>
            ) : (
              filteredJournals.map((j) => {
                const emotionObj = MOOD_TAGS.find((m) => m.label === j.mood_tag);
                return (
                  <div key={j.id} className="bg-white border border-[#E3D8BF] rounded-2xl p-5 shadow-sm space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {emotionObj && (
                          <span className="text-lg bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{emotionObj.emoji}</span>
                        )}
                        <div>
                          <h3 className="font-semibold text-slate-800 text-xs">{j.title}</h3>
                          <span className="text-[10px] text-slate-400">
                            {new Date(j.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(j.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete reflection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {j.content}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-[10px] text-slate-400">
                      <span>Reflective mood: <strong>{j.mood_tag}</strong></span>
                      <span className="flex items-center gap-1 text-emerald-600">
                        🔒 Encrypted
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
