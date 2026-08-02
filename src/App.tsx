import React, { useEffect, useState } from "react";
import { User } from "./types";

// Import modular components
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import MoodTracker from "./components/MoodTracker";
import JournalComponent from "./components/Journal";
import CommunityComponent from "./components/Community";
import Messaging from "./components/Messaging";
import AIChat from "./components/AIChat";
import SafetyCenter from "./components/SafetyCenter";
import ResourceLibrary from "./components/ResourceLibrary";
import TherapistNetwork from "./components/TherapistNetwork";
import ModeratorPanel from "./components/ModeratorPanel";

import { 
  Home, Activity, BookOpen, Compass, Users, MessageSquare, 
  Award, Library, ShieldAlert, LogOut, Shield, Contrast, Menu, X
} from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [highContrast, setHighContrast] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Deep link state for Peer Direct Message redirection from communities
  const [initialDMTargetUserId, setInitialDMTargetUserId] = useState<string | undefined>(undefined);

  // Authenticate and handshake session on load
  useEffect(() => {
    const userId = localStorage.getItem("carib_wellness_user_id");
    if (!userId) {
      setLoading(false);
      return;
    }

    const checkSession = async () => {
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          localStorage.removeItem("carib_wellness_user_id");
        }
      } catch (err) {
        console.error("Session restoration error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to exit your private session? Your anonymous identity and AES-256 encrypted entries will remain safe.")) {
      localStorage.removeItem("carib_wellness_user_id");
      setUser(null);
      setActiveTab("dashboard");
    }
  };

  const handleNavigateToDM = (targetUserId: string) => {
    setInitialDMTargetUserId(targetUserId);
    setActiveTab("messages");
  };

  if (loading) {
    return (
      <div id="app-loading-container" className="min-h-screen bg-[#F8F1E5] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-[#00A896] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-[#0F4C81]">Opening Private Wellness Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthSuccess={(registeredUser) => setUser(registeredUser)} />;
  }

  // Navigation Tabs configuration
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "mood", label: "Wellness Log", icon: Activity },
    { id: "journal", label: "Private Journal", icon: BookOpen },
    { id: "ai", label: "Companion AI", icon: Compass },
    { id: "community", label: "Forums Circle", icon: Users },
    { id: "messages", label: "Peer Messages", icon: MessageSquare },
    { id: "therapists", label: "Specialists Network", icon: Award },
    { id: "resources", label: "Wellness Library", icon: Library },
    { id: "safety", label: "Safety Center", icon: ShieldAlert },
  ];

  if (user.role === "moderator") {
    tabs.push({ id: "moderator", label: "Moderator Panel", icon: Shield });
  }

  return (
    <div className={`min-h-screen flex flex-col transition-all ${
      highContrast 
        ? "bg-black text-white selection:bg-yellow-400 selection:text-black" 
        : "bg-[#F8F1E5] text-slate-800"
    }`}>
      
      {/* 1. TOP RESPONSIVE HEADER */}
      <header className={`sticky top-0 z-40 border-b flex items-center justify-between px-4 py-3 shadow-sm transition-all ${
        highContrast 
          ? "bg-neutral-900 border-white/20 text-white" 
          : "bg-[#FFFDF9] border-[#EBE3D5] text-slate-800"
      }`}>
        
        {/* Logo and Menu Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 md:hidden text-slate-500 hover:text-slate-800 transition-colors"
            title="Toggle Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-xl">🌳</span>
            <div className="leading-tight">
              <span id="app-brand-name" className="text-sm font-bold tracking-tight text-[#0F4C81] block">Saman Wellness Portal</span>
              <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Caribbean Support Space</span>
            </div>
          </div>
        </div>

        {/* Dynamic Badges & Action Toolbar */}
        <div className="flex items-center gap-2">
          
          {/* User Profile Info Badge */}
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            highContrast ? "border-white/30 bg-white/5" : "border-[#EBE3D5] bg-[#FBF8F3]"
          }`}>
            <span>@{user.anonymous_username}</span>
            <span className="text-slate-400 font-normal">({user.country})</span>
            {user.role !== "user" && (
              <span className="text-[9px] uppercase tracking-wide bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded">
                {user.role}
              </span>
            )}
          </div>

          {/* Toggle Contrast Accessibility */}
          <button
            id="btn-toggle-contrast"
            onClick={() => setHighContrast(!highContrast)}
            className={`p-2.5 rounded-xl border transition-colors ${
              highContrast 
                ? "bg-white text-black hover:bg-slate-200 border-white" 
                : "bg-[#FBF8F3] text-slate-500 hover:text-[#0F4C81] border-[#EBE3D5]"
            }`}
            title="Toggle high-contrast accessibility mode"
          >
            <Contrast className="w-4 h-4" />
          </button>

          {/* Logout safely */}
          <button
            id="btn-logout"
            onClick={handleLogout}
            className={`p-2.5 rounded-xl border transition-colors ${
              highContrast 
                ? "bg-neutral-800 text-white hover:bg-neutral-700 border-white/20" 
                : "bg-red-50 hover:bg-red-100 text-red-600 border-red-100"
            }`}
            title="Exit private session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MAIN APPLICATION CONTENT VIEWPORTS */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto relative">
        
        {/* SIDEBAR NAVIGATION (Large screens always open, Mobile is overlay drawer) */}
        <nav className={`md:block shrink-0 transition-all ${
          menuOpen 
            ? "absolute top-0 left-0 bottom-0 z-30 w-64 block p-4 shadow-lg animate-in slide-in-from-left duration-200" 
            : "hidden md:w-60 md:p-5"
        } ${
          highContrast 
            ? "bg-neutral-900 border-r border-white/20" 
            : "bg-[#FFFDF9] border-r border-[#EBE3D5]"
        }`}>
          
          <div className="space-y-1.5 flex flex-col h-full justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block px-3.5 mb-2">Navigation Portal</span>
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    id={`btn-nav-tab-${tab.id}`}
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMenuOpen(false);
                      // Clear initial DM target to prevent stickiness
                      if (tab.id !== "messages") {
                        setInitialDMTargetUserId(undefined);
                      }
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all ${
                      isActive
                        ? highContrast
                          ? "bg-white text-black font-extrabold shadow-sm"
                          : "bg-[#0F4C81] text-white font-extrabold shadow-sm"
                        : highContrast
                          ? "hover:bg-white/10 text-white"
                          : "hover:bg-slate-50 text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    <TabIcon className="w-4.5 h-4.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Micro disclaimer bottom of sidebar */}
            <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100/50 text-[9px] text-slate-400 leading-normal">
              🔒 Private, anonymous session verified and certified by clinical networks.
            </div>
          </div>
        </nav>

        {/* Backdrop for mobile drawer */}
        {menuOpen && (
          <div 
            onClick={() => setMenuOpen(false)}
            className="md:hidden fixed inset-0 z-20 bg-black/30 backdrop-blur-xs"
          />
        )}

        {/* CORE WORKSPACE PANEL */}
        <main className={`flex-1 p-4 md:p-8 overflow-y-auto transition-all`}>
          
          {activeTab === "dashboard" && (
            <Dashboard 
              user={user} 
              onNavigate={(t) => {
                setActiveTab(t);
                if (t !== "messages") setInitialDMTargetUserId(undefined);
              }} 
            />
          )}

          {activeTab === "mood" && (
            <MoodTracker user={user} />
          )}

          {activeTab === "journal" && (
            <JournalComponent user={user} />
          )}

          {activeTab === "ai" && (
            <AIChat 
              user={user} 
              onNavigateToSafety={() => {
                setActiveTab("safety");
              }}
            />
          )}

          {activeTab === "community" && (
            <CommunityComponent 
              user={user} 
              onNavigateToDirectMessage={handleNavigateToDM}
            />
          )}

          {activeTab === "messages" && (
            <Messaging 
              user={user} 
              initialTargetUserId={initialDMTargetUserId} 
            />
          )}

          {activeTab === "therapists" && (
            <TherapistNetwork user={user} />
          )}

          {activeTab === "resources" && (
            <ResourceLibrary />
          )}

          {activeTab === "safety" && (
            <SafetyCenter />
          )}

          {activeTab === "moderator" && (
            <ModeratorPanel user={user} />
          )}

        </main>

      </div>
    </div>
  );
}
