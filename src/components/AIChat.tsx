import React, { useState, useRef, useEffect } from "react";
import { User } from "../types";
import { Send, ShieldCheck, Heart, AlertTriangle, Compass, RefreshCw } from "lucide-react";

interface AIChatProps {
  user: User;
  onNavigateToSafety?: () => void;
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
  isCrisis?: boolean;
}

export default function AIChat({ user, onNavigateToSafety }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: `Hello, family! I am **Saman**, your anonymous AI Wellness Companion. 

I am here 24/7 to listen to your stress, anxiety, sleep issues, or relationship troubles, reflect on coping strategies, and support your journey. 

*Gentle reminder: I am an AI companion, not a human therapist or medical doctor. I cannot provide diagnostic evaluations or prescriptions. I'm always here to support.*`
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [crisisAlert, setCrisisAlert] = useState(false);

  const endOfChatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfChatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMsg = inputText.trim();
    setInputText("");
    setLoading(true);
    setCrisisAlert(false);

    // Append user message immediately
    const updatedMessages = [...messages, { role: "user" as const, text: userMsg }];
    setMessages(updatedMessages);

    try {
      // Map history format expected by backend
      const history = messages.map((m) => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          message: userMsg,
          history
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to communicate with wellness AI");
      }

      const isCrisis = data.risk?.risk_level === "CRISIS";
      if (isCrisis) {
        setCrisisAlert(true);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: data.response,
          isCrisis
        }
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: `I apologize, but I had a brief connection interruption. Let's take a deep breath together. Writing your thoughts down in your **Private Journal** is also a great way to relieve some mental pressure.`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear this chat conversation history? Your logs are safe but can be reset.")) {
      setMessages([
        {
          role: "model",
          text: `Hello, family! I am **Saman**, your anonymous AI Wellness Companion. How can I help support your peace of mind today?`
        }
      ]);
      setCrisisAlert(false);
    }
  };

  return (
    <div id="ai-companion-container" className="space-y-6 max-w-4xl mx-auto flex flex-col h-[550px]">
      
      {/* Upper header */}
      <div className="flex justify-between items-center bg-white border border-[#EBE3D5] p-4 rounded-2xl shadow-sm shrink-0">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Compass className="w-5 h-5 text-[#00A896]" /> Ask Saman AI
          </h2>
          <p className="text-[10px] text-slate-400">Personalized Emotional Reflection & Safety Classification Pipeline Active</p>
        </div>

        <button
          onClick={handleClearChat}
          className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-slate-50 rounded-lg text-xs flex items-center gap-1 transition-all"
          title="Reset chat transcript"
        >
          <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Reset History</span>
        </button>
      </div>

      {/* Main chat window container */}
      <div className="flex-1 bg-white border border-[#EBE3D5] rounded-2xl p-4 overflow-y-auto space-y-4 shadow-sm relative flex flex-col">
        
        {/* Messages feed */}
        <div className="flex-1 space-y-4">
          {messages.map((m, index) => {
            const isUser = m.role === "user";
            return (
              <div
                key={index}
                className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Avatar Icon */}
                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm font-bold ${
                  isUser ? "bg-[#0F4C81] text-white" : m.isCrisis ? "bg-red-50 text-red-600 border border-red-200" : "bg-teal-50 text-[#00A896]"
                }`}>
                  {isUser ? "👤" : m.isCrisis ? "🚨" : "🧭"}
                </div>

                {/* Message Bubble */}
                <div className="space-y-1">
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? "bg-[#0F4C81] text-white rounded-tr-none"
                      : m.isCrisis
                      ? "bg-red-50 border border-red-150 text-slate-800 rounded-tl-none font-medium"
                      : "bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none"
                  }`}>
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 mr-auto max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-teal-50 text-[#00A896] flex items-center justify-center text-xs animate-pulse">
                🧭
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 text-slate-400 text-xs rounded-2xl rounded-tl-none flex items-center gap-1">
                <span className="animate-bounce font-extrabold">•</span>
                <span className="animate-bounce delay-100 font-extrabold">•</span>
                <span className="animate-bounce delay-200 font-extrabold">•</span>
                <span className="ml-1 italic text-[10px]">Saman is listening...</span>
              </div>
            </div>
          )}

          <div ref={endOfChatRef} />
        </div>

        {/* Crisis Trigger Overlay Alert */}
        {crisisAlert && onNavigateToSafety && (
          <div className="sticky bottom-0 left-0 right-0 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 shadow-md animate-pulse">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-red-900">Safety Intervention Active</h4>
              <p className="text-[10px] text-slate-600 leading-normal">
                Saman has logged a crisis event based on self-harm or abuse patterns. Confidential, free emergency help lines and breathing guides are immediately available for you.
              </p>
              <button
                onClick={onNavigateToSafety}
                className="mt-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-[10px] transition-colors"
              >
                Access Regional Help & Exercises
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Input Form Box */}
      <form onSubmit={handleSend} className="bg-white border border-[#EBE3D5] p-3 rounded-2xl shadow-sm shrink-0 flex gap-2">
        <input
          id="input-ai-message"
          type="text"
          placeholder="Type whatever you are holding inside today... (e.g., Felt lonely lately)"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A896]/20 text-xs"
        />
        <button
          id="btn-submit-ai-chat"
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-[#00A896] hover:bg-[#02C39A] disabled:bg-[#00A896]/30 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

    </div>
  );
}
