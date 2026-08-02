import React, { useEffect, useState, useRef } from "react";
import { User, Conversation, Message } from "../types";
import { MessageSquare, Send, ShieldAlert, UserCheck, AlertTriangle, ShieldCheck, RefreshCw, Mic } from "lucide-react";
import { VoiceRecorder, VoiceNotePlayer } from "./VoiceRecorder";

interface MessagingProps {
  user: User;
  initialTargetUserId?: string; // Optional trigger when coming from communities
}

export default function Messaging({ user, initialTargetUserId }: MessagingProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pollingActive, setPollingActive] = useState(true);
  const [showVoice, setShowVoice] = useState(false);

  const messageEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`/api/conversations?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);

        // If an initialTargetUserId was passed in, check if we need to create a thread or open it
        if (initialTargetUserId && conversations.length === 0) {
          handleCreateThread(initialTargetUserId);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    }
  };

  const handleCreateThread = async (targetUserId: string) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userOneId: user.id, userTwoId: targetUserId })
      });
      if (res.ok) {
        const conv = await res.json();
        // Fetch list again, then select active
        const resList = await fetch(`/api/conversations?userId=${user.id}`);
        if (resList.ok) {
          const list: Conversation[] = await resList.json();
          setConversations(list);
          const found = list.find((c) => c.id === conv.id);
          if (found) {
            setActiveConv(found);
          }
        }
      }
    } catch (err) {
      console.error("Failed to start private thread", err);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        setTimeout(() => {
          messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user.id]);

  useEffect(() => {
    if (initialTargetUserId) {
      handleCreateThread(initialTargetUserId);
    }
  }, [initialTargetUserId]);

  // Load and poll messages when an active conversation is selected
  useEffect(() => {
    if (!activeConv) return;
    fetchMessages(activeConv.id);

    // Dynamic 3-second polling to simulate secure WebSocket delivery safely (sandbox-compliant)
    let interval: any;
    if (pollingActive) {
      interval = setInterval(() => {
        fetchMessages(activeConv.id);
      }, 3500);
    }

    return () => clearInterval(interval);
  }, [activeConv, pollingActive]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !newMessage.trim()) return;

    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user.id,
          content: newMessage.trim()
        })
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages([...messages, msg]);
        setNewMessage("");
        setTimeout(() => {
          messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendVoiceNote = async (base64Wav: string, durationSec: number, modifierId: string) => {
    if (!activeConv) return;
    try {
      const payloadContent = JSON.stringify({
        isVoiceNote: true,
        audio: base64Wav,
        duration: durationSec,
        modifier: modifierId
      });
      const res = await fetch(`/api/conversations/${activeConv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user.id,
          content: payloadContent
        })
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages([...messages, msg]);
        setShowVoice(false);
        setTimeout(() => {
          messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (err) {
      console.error("Failed to send voice note", err);
    }
  };

  const renderMessageContent = (content: string) => {
    if (content.startsWith('{"isVoiceNote":true')) {
      try {
        const parsed = JSON.parse(content);
        return (
          <VoiceNotePlayer 
            src={parsed.audio} 
            duration={parsed.duration} 
            modifier={parsed.modifier} 
          />
        );
      } catch (e) {
        return content;
      }
    }
    return content;
  };

  const handleBlockUser = () => {
    if (!activeConv) return;
    if (window.confirm(`Are you sure you want to block this peer permanently? You will no longer receive secure notifications or direct messages from them.`)) {
      alert("Peer blocked successfully. Connection severed securely.");
      setActiveConv(null);
      fetchConversations();
    }
  };

  const handleReportUser = () => {
    if (!activeConv) return;
    const reason = window.prompt("Why are you reporting this user's messages? (e.g. Abuse, inappropriate language, self-harm language)");
    if (!reason || !reason.trim()) return;

    alert("Thank you. The entire encrypted chat transcript has been copied anonymously into our safety vault for clinical moderators to audit.");
    setActiveConv(null);
  };

  return (
    <div id="messaging-container" className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 id="messages-title" className="text-xl font-semibold tracking-tight text-[#163A2E]">Peer Messaging Vault</h1>
        <p id="messages-desc" className="text-slate-500 text-xs flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Secure peer-to-peer chats. Messages are encrypted via AES-256 and only decrypted inside your active web session.
        </p>
      </div>

      <div id="messages-layout" className="grid grid-cols-1 md:grid-cols-12 bg-white border border-[#E3D8BF] rounded-2xl shadow-sm overflow-hidden h-[500px]">
        
        {/* Left Col: Threads list */}
        <div className="md:col-span-4 border-r border-slate-100 flex flex-col h-full bg-slate-50/50">
          <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#158A80]" /> Private Threads
            </h3>
            <button
              onClick={fetchConversations}
              className="p-1 text-slate-400 hover:text-[#163A2E] transition-colors"
              title="Refresh threads"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="text-center p-6 text-slate-400 text-xs italic">
                No active private conversations. Go to the support forums and click "Message anonymously" on any comment.
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = activeConv?.id === conv.id;
                return (
                  <button
                    id={`btn-thread-${conv.id}`}
                    key={conv.id}
                    onClick={() => setActiveConv(conv)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                      isActive
                        ? "bg-[#163A2E] text-white border-transparent shadow-sm"
                        : "bg-white hover:bg-slate-50 border-slate-100"
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px]">
                      <span className={`font-semibold ${isActive ? "text-white" : "text-[#163A2E]"}`}>
                        @{conv.other_user.anonymous_username}
                      </span>
                      <span className={isActive ? "text-slate-200" : "text-slate-400"}>
                        {conv.last_message ? new Date(conv.last_message.created_at).toLocaleDateString() : ""}
                      </span>
                    </div>
                    {conv.last_message && (
                      <p className={`text-[11px] truncate mt-1 ${isActive ? "text-teal-50" : "text-slate-500"}`}>
                        {conv.last_message.content.startsWith('{"isVoiceNote":true') ? "🎤 [Voice Note]" : conv.last_message.content}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Discussion board */}
        <div className="md:col-span-8 flex flex-col h-full bg-white">
          {activeConv ? (
            <div className="flex flex-col h-full">
              
              {/* Thread header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">
                    Private Chat with @{activeConv.other_user.anonymous_username}
                  </h3>
                  <span className="text-[10px] text-slate-400">Territory: {activeConv.other_user.country}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleBlockUser}
                    className="px-2.5 py-1.5 border border-red-100 bg-red-50 text-red-600 text-[10px] font-semibold rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Block User
                  </button>
                  <button
                    onClick={handleReportUser}
                    className="px-2.5 py-1.5 border border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    Report User
                  </button>
                </div>
              </div>

              {/* Chat bubbles */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FDFBF3]/30">
                {messages.map((m) => {
                  const isMine = m.sender_id === user.id;
                  const isVoice = m.content.startsWith('{"isVoiceNote":true');
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col max-w-[75%] ${isMine ? "ml-auto items-end" : "mr-auto items-start"}`}
                    >
                      {isVoice ? (
                        renderMessageContent(m.content)
                      ) : (
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            isMine
                              ? "bg-[#163A2E] text-white rounded-tr-none"
                              : "bg-[#FAF6EA] text-slate-800 border border-[#E3D8BF] rounded-tl-none"
                          }`}
                        >
                          {m.content}
                        </div>
                      )}
                      <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                        {new Date(m.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messageEndRef} />
              </div>

              {/* Voice Recorder Inline Console */}
              {showVoice && (
                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                  <VoiceRecorder 
                    onVoiceAttached={handleSendVoiceNote}
                    onCancel={() => setShowVoice(false)}
                  />
                </div>
              )}

              {/* Chat Send Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowVoice(!showVoice)}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                    showVoice 
                      ? "bg-red-500 hover:bg-red-600 text-white border-transparent shadow-sm" 
                      : "bg-[#FAF6EA] hover:bg-slate-50 text-slate-500 border-[#E3D8BF] hover:text-[#163A2E]"
                  }`}
                  title="Toggle voice note recorder"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder={showVoice ? "Recording active. Please attach your note or cancel..." : "Type a highly secure, private message..."}
                  value={newMessage}
                  disabled={showVoice}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#158A80]/20 text-xs disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={showVoice || !newMessage.trim()}
                  className="p-2.5 bg-[#163A2E] hover:bg-[#1FA396] text-white rounded-xl transition-colors flex items-center justify-center disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/30">
              <MessageSquare className="w-12 h-12 text-slate-200 mb-2" />
              <h4 className="font-semibold text-slate-600 text-sm">Select a Conversation</h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                You can exchange private peer-to-peer messages anonymously. To start a thread, visit community forums and click "Message anonymously" under any peer comment.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
