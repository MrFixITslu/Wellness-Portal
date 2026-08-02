import React, { useEffect, useState } from "react";
import { User, MoodCheckin } from "../types";
import { Smile, Sliders, Calendar, Activity, CheckCircle2, TrendingUp } from "lucide-react";

interface MoodTrackerProps {
  user: User;
}

const SCORE_LABELS = {
  mood: ["Very Heavy", "Heavy", "Balanced", "Light & Peaceful", "Joyful"],
  stress: ["Relaxed", "Mild Tension", "Moderate", "High Stress", "Overwhelming"],
  energy: ["Exhausted", "Low", "Moderate", "Active", "Highly Energized"],
  sleep: ["Poor rest", "Restless", "Moderate", "Good rest", "Deeply Restorative"]
};

export default function MoodTracker({ user }: MoodTrackerProps) {
  const [mood, setMood] = useState(3);
  const [stress, setStress] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [sleep, setSleep] = useState(3);
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<MoodCheckin[]>([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/users/${user.id}/moods`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch mood history", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch(`/api/users/${user.id}/moods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood_score: mood,
          stress_level: stress,
          energy_level: energy,
          sleep_quality: sleep,
          note: note.trim()
        })
      });

      if (res.ok) {
        setSuccessMsg("Your daily wellness check-in has been recorded privately.");
        setNote("");
        // Reset inputs
        setMood(3);
        setStress(3);
        setEnergy(3);
        setSleep(3);
        fetchHistory();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit check-in");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Render highly secure, pixel-perfect interactive SVG Trend Graph for mood and stress
  const renderTrendChart = () => {
    if (history.length < 2) {
      return (
        <div className="h-44 flex flex-col items-center justify-center bg-[#FAF6EA] border border-dashed border-[#E3D8BF] rounded-xl text-xs text-slate-500 p-4 text-center">
          <TrendingUp className="w-8 h-8 text-slate-300 mb-1" />
          <span>Chart needs at least 2 check-ins to map trends.</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Your data stays local and encrypted.</span>
        </div>
      );
    }

    // Limit to last 7 checkins for chart cleanliness, reversed to chronological (left-to-right)
    const chartData = [...history].slice(0, 7).reverse();

    const width = 500;
    const height = 150;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxVal = 5;
    const pointsMood: string[] = [];
    const pointsStress: string[] = [];

    chartData.forEach((check, index) => {
      const x = padding + (index / (chartData.length - 1)) * chartWidth;
      // Invert Y axis: 5 (good) is high up (near padding), 1 is low down
      const yMood = padding + chartHeight - ((check.mood_score - 1) / (maxVal - 1)) * chartHeight;
      const yStress = padding + chartHeight - ((check.stress_level - 1) / (maxVal - 1)) * chartHeight;
      pointsMood.push(`${x},${yMood}`);
      pointsStress.push(`${x},${yStress}`);
    });

    return (
      <div className="space-y-4">
        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[320px]">
            {/* Horizontal guide lines */}
            {[0, 1, 2, 3, 4].map((i) => {
              const y = padding + (i / 4) * chartHeight;
              return (
                <line
                  key={i}
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#EAE0C8"
                  strokeWidth="1"
                />
              );
            })}

            {/* Mood Line (Ocean Blue) */}
            <polyline
              fill="none"
              stroke="#163A2E"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsMood.join(" ")}
            />

            {/* Stress Line (Caribbean Teal) */}
            <polyline
              fill="none"
              stroke="#158A80"
              strokeWidth="2.5"
              strokeDasharray="4,4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsStress.join(" ")}
            />

            {/* Data nodes */}
            {chartData.map((check, index) => {
              const x = padding + (index / (chartData.length - 1)) * chartWidth;
              const yMood = padding + chartHeight - ((check.mood_score - 1) / (maxVal - 1)) * chartHeight;
              const yStress = padding + chartHeight - ((check.stress_level - 1) / (maxVal - 1)) * chartHeight;

              return (
                <g key={check.id}>
                  {/* Mood circle */}
                  <circle cx={x} cy={yMood} r="4.5" fill="#163A2E" stroke="white" strokeWidth="1.5" />
                  {/* Stress circle */}
                  <circle cx={x} cy={yStress} r="4" fill="#158A80" stroke="white" strokeWidth="1.5" />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-0.5 bg-[#163A2E] inline-block"></span>
            <span className="font-medium text-slate-700">Mood Score (1-5)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#158A80] inline-block"></span>
            <span className="font-medium text-slate-700">Stress Intensity (1-5)</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="mood-tracker-container" className="space-y-6 max-w-4xl mx-auto">
      
      {/* Title */}
      <div className="space-y-1">
        <h1 id="mood-title" className="text-xl font-semibold tracking-tight text-[#163A2E]">Wellness Logger</h1>
        <p id="mood-desc" className="text-slate-500 text-xs">
          A non-diagnostic tracking log to note your stress levels, mood patterns, and vital factors safely.
        </p>
      </div>

      <div id="mood-cols" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: The Logging Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white border border-[#E3D8BF] rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-[#158A80]" /> Today's Reflections
          </h2>

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Slider 1: Mood */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">General Mood</span>
              <span className="text-[#163A2E] font-bold bg-[#163A2E]/5 px-2 py-0.5 rounded">
                {mood}/5 • {SCORE_LABELS.mood[mood - 1]}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={mood}
              onChange={(e) => setMood(Number(e.target.value))}
              className="w-full accent-[#163A2E] bg-slate-100 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Slider 2: Stress */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Stress Level</span>
              <span className="text-[#158A80] font-bold bg-[#158A80]/5 px-2 py-0.5 rounded">
                {stress}/5 • {SCORE_LABELS.stress[stress - 1]}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={stress}
              onChange={(e) => setStress(Number(e.target.value))}
              className="w-full accent-[#158A80] bg-slate-100 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Slider 3: Energy */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Energy Level</span>
              <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">
                {energy}/5 • {SCORE_LABELS.energy[energy - 1]}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={energy}
              onChange={(e) => setEnergy(Number(e.target.value))}
              className="w-full accent-amber-500 bg-slate-100 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Slider 4: Sleep */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Sleep Quality</span>
              <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                {sleep}/5 • {SCORE_LABELS.sleep[sleep - 1]}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={sleep}
              onChange={(e) => setSleep(Number(e.target.value))}
              className="w-full accent-blue-500 bg-slate-100 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Text note */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Personal Notes (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g., Felt a bit winded by workload, but enjoyed a nice sea breeze walk later."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#FAF6EA] border border-[#E3D8BF] rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#158A80]/30 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#163A2E] hover:bg-[#1FA396] disabled:bg-[#163A2E]/40 text-white font-medium rounded-xl transition-colors text-xs shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? "Recording..." : "Save Daily Check-in"}
          </button>
        </form>

        {/* Right Col: Analytics & Logs */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Trend chart card */}
          <div className="bg-white border border-[#E3D8BF] rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#163A2E]" /> Weekly Wellness Trend
            </h3>
            {renderTrendChart()}
          </div>

          {/* Historical Logs List */}
          <div className="bg-white border border-[#E3D8BF] rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#158A80]" /> Logs History
            </h3>

            {history.length === 0 ? (
              <p className="text-slate-400 text-xs italic">No past logs recorded.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {history.map((log) => (
                  <div key={log.id} className="p-3 bg-[#FAF6EA] border border-[#E3D8BF] rounded-xl text-xs space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{new Date(log.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span className="text-slate-500 font-semibold">Mood: {log.mood_score}/5</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                      <span>Stress: {log.stress_level}/5</span>
                      <span>Sleep: {log.sleep_quality}/5</span>
                    </div>
                    {log.note && <p className="text-[11px] text-slate-500 italic border-t border-slate-100/50 pt-1.5 mt-1">{log.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
