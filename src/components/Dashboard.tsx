import React, { useEffect, useState } from "react";
import { User, MoodCheckin } from "../types";
import { ShieldAlert, Sun, Sunrise, Sunset, Moon, Activity, Calendar, Award, MessageSquare, BookOpen, Users, Compass, ShieldCheck } from "lucide-react";

interface DashboardProps {
  user: User;
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ user, onNavigate }: DashboardProps) {
  const [lastCheckin, setLastCheckin] = useState<MoodCheckin | null>(null);
  const [checkinDoneToday, setCheckinDoneToday] = useState(false);
  const [greeting, setGreeting] = useState("Hello");
  const [greetingIcon, setGreetingIcon] = useState<any>(Sunrise);

  useEffect(() => {
    // Determine Caribbean greeting based on current hour
    const hr = new Date().getHours();
    if (hr < 12) {
      setGreeting("Mornin' family!");
      setGreetingIcon(Sunrise);
    } else if (hr < 17) {
      setGreeting("Good afternoon, friend.");
      setGreetingIcon(Sun);
    } else if (hr < 21) {
      setGreeting("Quiet evening wind down.");
      setGreetingIcon(Sunset);
    } else {
      setGreeting("Peaceful night rest.");
      setGreetingIcon(Moon);
    }

    // Fetch mood tracking status
    const fetchMoods = async () => {
      try {
        const res = await fetch(`/api/users/${user.id}/moods`);
        if (res.ok) {
          const list: MoodCheckin[] = await res.json();
          if (list.length > 0) {
            setLastCheckin(list[0]);
            // Check if last checkin is today
            const lastDate = new Date(list[0].created_at).toDateString();
            const todayDate = new Date().toDateString();
            setCheckinDoneToday(lastDate === todayDate);
          }
        }
      } catch (err) {
        console.error("Dashboard failed to fetch mood data", err);
      }
    };

    fetchMoods();
  }, [user.id]);

  // Comfort quotes tailored specifically to the Caribbean context
  const getWellnessSuggestion = () => {
    if (lastCheckin) {
      if (lastCheckin.stress_level >= 4) {
        return {
          title: "Elevated Stress Detected",
          body: "Stress is running high. Let's head over to the Safety Center for a 3-minute beach wave breathing meditation. Your mind deserves a quick lime.",
          action: "Go to Safety Center",
          tab: "safety"
        };
      }
      if (lastCheckin.sleep_quality <= 2) {
        return {
          title: "Restless Night Support",
          body: "Sleep quality was low. Read our 'Island Time vs. Overwork' article in the Resource Library to build calming evening wind down routines.",
          action: "Read Articles",
          tab: "resources"
        };
      }
    }
    return {
      title: "Daily Wellness Suggestion",
      body: "Anonymously share your thoughts in the Community space or chat with our empathetic AI Wellness Companion, Saman.",
      action: "Talk to Saman AI",
      tab: "ai"
    };
  };

  const suggestion = getWellnessSuggestion();
  const GreetingIconComponent = greetingIcon;

  return (
    <div id="dashboard-container" className="space-y-6 max-w-4xl mx-auto">
      
      {/* 1. Caribbean Greeting & Checkin Status Card */}
      <div id="greeting-banner" className="bg-[#FFFDF9] border border-[#EBE3D5] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#0F4C81]">
            <GreetingIconComponent className="w-6 h-6 text-[#F4D35E]" />
            <h1 id="dashboard-greeting" className="text-2xl font-semibold tracking-tight">
              {greeting}
            </h1>
          </div>
          <p id="dashboard-username-sub" className="text-slate-500 text-sm">
            Logged in privately as <span className="font-semibold text-slate-800">{user.anonymous_username}</span> • From {user.country}
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full md:w-auto">
          {checkinDoneToday ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-150 px-4 py-2.5 rounded-xl text-emerald-800 text-xs font-medium">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
              <span>You checked in today. Beautiful!</span>
            </div>
          ) : (
            <button
              id="btn-navigate-mood-checkin"
              onClick={() => onNavigate("mood")}
              className="px-5 py-3 bg-[#00A896] hover:bg-[#02C39A] text-white rounded-xl text-xs font-semibold tracking-wide shadow-sm transition-all"
            >
              Complete Daily Wellness Check-in
            </button>
          )}
        </div>
      </div>

      {/* 2. Safety Intercept / Resource suggestion banner */}
      <div id="suggestion-banner" className="bg-[#F8F1E5] border border-[#EBE3D5] p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-[#00A896]" /> {suggestion.title}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{suggestion.body}</p>
        </div>
        <button
          onClick={() => onNavigate(suggestion.tab)}
          className="text-xs font-semibold text-[#0F4C81] hover:text-[#1D70B8] whitespace-nowrap"
        >
          {suggestion.action} &rarr;
        </button>
      </div>

      {/* 3. Grid of Main Sections */}
      <div id="quick-actions-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Mood history widget */}
        <div
          id="widget-mood"
          onClick={() => onNavigate("mood")}
          className="bg-white border border-[#EBE3D5] p-5 rounded-2xl hover:border-[#00A896]/50 cursor-pointer transition-all space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="inline-flex p-2.5 bg-rose-50 rounded-xl text-rose-600">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-[#0F4C81] uppercase tracking-wider">Mood Analytics</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Track Mood & Vitals</h3>
            <p className="text-xs text-slate-500 mt-1">Record and inspect your stress, energy, sleep metrics on beautiful, non-diagnostic trends.</p>
          </div>
          {lastCheckin ? (
            <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between text-xs text-slate-600">
              <span>Last Mood Score: <strong>{lastCheckin.mood_score}/5</strong></span>
              <span>Stress Level: <strong>{lastCheckin.stress_level}/5</strong></span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">No wellness check-ins recorded yet.</div>
          )}
        </div>

        {/* Journal widget */}
        <div
          id="widget-journal"
          onClick={() => onNavigate("journal")}
          className="bg-white border border-[#EBE3D5] p-5 rounded-2xl hover:border-[#00A896]/50 cursor-pointer transition-all space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="inline-flex p-2.5 bg-amber-50 rounded-xl text-amber-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-[#0F4C81] uppercase tracking-wider">Secure Journal</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Encrypted Private Journal</h3>
            <p className="text-xs text-slate-500 mt-1">Offload your internal weight. Fully encrypted with AES-256 prior to saving.</p>
          </div>
          <div className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg inline-block w-fit font-medium">
            🔒 Content is AES-256 Encrypted
          </div>
        </div>

        {/* AI chat widget */}
        <div
          id="widget-ai"
          onClick={() => onNavigate("ai")}
          className="bg-white border border-[#EBE3D5] p-5 rounded-2xl hover:border-[#00A896]/50 cursor-pointer transition-all space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="inline-flex p-2.5 bg-teal-50 rounded-xl text-[#00A896]">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-[#0F4C81] uppercase tracking-wider">Wellness AI</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Talk with Saman AI</h3>
            <p className="text-xs text-slate-500 mt-1">Get 24/7 empathetic listening, reflecting suggestions, and crisis screening pipelines.</p>
          </div>
          <div className="text-xs text-slate-400">"Always ready to listen without judgment."</div>
        </div>

        {/* Community forums widget */}
        <div
          id="widget-community"
          onClick={() => onNavigate("community")}
          className="bg-white border border-[#EBE3D5] p-5 rounded-2xl hover:border-[#00A896]/50 cursor-pointer transition-all space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="inline-flex p-2.5 bg-blue-50 rounded-xl text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-[#0F4C81] uppercase tracking-wider">Caribbean Forums</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Anonymous Community Hub</h3>
            <p className="text-xs text-slate-500 mt-1">Lime with peers across island borders, discuss anxieties, men's wellness, grief support.</p>
          </div>
          <div className="text-xs text-slate-400">7 Active support circles ready to browse.</div>
        </div>

      </div>

      {/* 4. Bottom Disclaimer */}
      <div id="disclaimer-footer" className="bg-[#FFFDF9] border border-amber-100 p-4 rounded-xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-amber-900">Important Safety Disclaimer</h4>
          <p className="text-[10px] text-slate-500 leading-normal">
            Saman Wellness Platform is designed to support mental wellness, connection, and emotional reflection. It does NOT provide formal clinical diagnoses, prescribe drug treatments, or replace formal therapeutic medical services. If you are experiencing suicidal thoughts or are in physical danger, please access the <strong>Safety Center</strong> tab immediately for free, direct confidential emergency phone lines in your Caribbean territory.
          </p>
        </div>
      </div>

    </div>
  );
}
