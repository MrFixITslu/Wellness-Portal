import React, { useEffect, useState } from "react";
import { User, Community, Post, Comment } from "../types";
import { Users, MessageSquare, ThumbsUp, AlertTriangle, Send, CornerDownRight, Check, Compass, PlusCircle, Mic } from "lucide-react";
import { VoiceRecorder, VoiceNotePlayer } from "./VoiceRecorder";

interface CommunityProps {
  user: User;
  onNavigateToDirectMessage?: (targetUserId: string) => void;
}

export default function CommunityComponent({ user, onNavigateToDirectMessage }: CommunityProps) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  
  // Forms
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newCommentContent, setNewCommentContent] = useState("");
  const [anonymousAuthor, setAnonymousAuthor] = useState("");

  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState("");

  // Voice States
  const [showPostVoice, setShowPostVoice] = useState(false);
  const [showCommentVoice, setShowCommentVoice] = useState(false);

  const loadInitialData = async () => {
    try {
      // 1. Fetch communities
      const commRes = await fetch("/api/communities");
      if (commRes.ok) {
        const comms = await commRes.json();
        setCommunities(comms);
        if (comms.length > 0) {
          setSelectedCommunity(comms[0]);
        }
      }

      // 2. Fetch joined communities
      const joinedRes = await fetch(`/api/communities/joined?userId=${user.id}`);
      if (joinedRes.ok) {
        const joined: Community[] = await joinedRes.json();
        setJoinedIds(joined.map((c) => c.id));
      }
    } catch (e) {
      console.error("Failed to load community metadata", e);
    }
  };

  useEffect(() => {
    loadInitialData();
    // Default author alias to their registered anonymous username
    setAnonymousAuthor(user.anonymous_username);
  }, [user.id]);

  // Load posts whenever selected community changes
  useEffect(() => {
    if (!selectedCommunity) return;
    const fetchPosts = async () => {
      try {
        const res = await fetch(`/api/posts?communityId=${selectedCommunity.id}`);
        if (res.ok) {
          const data = await res.json();
          setPosts(data);
        }
      } catch (err) {
        console.error("Failed to load posts", err);
      }
    };
    fetchPosts();
    setActivePost(null);
  }, [selectedCommunity]);

  // Load comments whenever active post changes
  useEffect(() => {
    if (!activePost) return;
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/posts/${activePost.id}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data);
        }
      } catch (err) {
        console.error("Failed to load comments", err);
      }
    };
    fetchComments();
  }, [activePost]);

  const handleJoin = async (communityId: string) => {
    try {
      const res = await fetch(`/api/communities/${communityId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        setJoinedIds([...joinedIds, communityId]);
        setSuccessMsg("Successfully joined this support community!");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommunity) return;
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      return alert("Please enter both post title and details.");
    }

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community_id: selectedCommunity.id,
          user_id: user.id,
          anonymous_author: anonymousAuthor.trim() || user.anonymous_username,
          title: newPostTitle.trim(),
          content: newPostContent.trim()
        })
      });

      if (res.ok) {
        const post = await res.json();
        setPosts([post, ...posts]);
        setNewPostTitle("");
        setNewPostContent("");
        setSuccessMsg("Your post was uploaded successfully.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePost) return;
    if (!newCommentContent.trim()) return;

    try {
      const res = await fetch(`/api/posts/${activePost.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          anonymous_author: anonymousAuthor.trim() || user.anonymous_username,
          content: newCommentContent.trim()
        })
      });

      if (res.ok) {
        const comment = await res.json();
        setComments([...comments, comment]);
        setNewCommentContent("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateVoiceComment = async (base64Wav: string, durationSec: number, modifierId: string) => {
    if (!activePost) return;
    try {
      const payloadContent = JSON.stringify({
        isVoiceNote: true,
        audio: base64Wav,
        duration: durationSec,
        modifier: modifierId
      });
      const res = await fetch(`/api/posts/${activePost.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          anonymous_author: anonymousAuthor.trim() || user.anonymous_username,
          content: payloadContent
        })
      });

      if (res.ok) {
        const comment = await res.json();
        setComments([...comments, comment]);
        setShowCommentVoice(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const renderContent = (content: string) => {
    if (content.startsWith('{"isVoiceNote":true')) {
      try {
        const parsed = JSON.parse(content);
        return (
          <div className="my-1.5 block">
            <VoiceNotePlayer 
              src={parsed.audio} 
              duration={parsed.duration} 
              modifier={parsed.modifier} 
            />
          </div>
        );
      } catch (e) {
        return content;
      }
    }
    return content;
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        const updatedPost: Post = await res.json();
        // Update local list
        setPosts(posts.map((p) => (p.id === postId ? updatedPost : p)));
        if (activePost && activePost.id === postId) {
          setActivePost(updatedPost);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReport = async (postId: string) => {
    const reason = window.prompt("Why are you reporting this post? (e.g., Harassment, Suicide risk, Stigma, Non-wellness content)");
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch(`/api/posts/${postId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterId: user.id,
          reason: reason.trim()
        })
      });

      if (res.ok) {
        alert("Thank you. This post has been reported and sent to clinical moderators for immediate review.");
        // Hide post from view instantly
        setPosts(posts.filter((p) => p.id !== postId));
        if (activePost && activePost.id === postId) {
          setActivePost(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div id="community-container" className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 id="community-title" className="text-xl font-semibold tracking-tight text-[#163A2E]">Caribbean Support Forums</h1>
        <p id="community-desc" className="text-slate-500 text-xs">
          Connect anonymously with peers across Caribbean borders. Speak from the heart, share coping advice, and build mutual resilience.
        </p>
      </div>

      <div id="community-layout" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: List of Communities */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-[#E3D8BF] rounded-2xl p-4 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4.5 h-4.5 text-[#158A80]" /> Communities
            </h3>

            <div className="flex flex-col gap-1.5">
              {communities.map((comm) => {
                const isJoined = joinedIds.includes(comm.id);
                const isSelected = selectedCommunity?.id === comm.id;
                return (
                  <button
                    id={`btn-community-select-${comm.id}`}
                    key={comm.id}
                    onClick={() => setSelectedCommunity(comm)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-[#163A2E] text-white"
                        : "bg-[#FAF6EA] hover:bg-slate-100 text-slate-700 border border-slate-100"
                    }`}
                  >
                    <span className="truncate pr-2">{comm.name}</span>
                    {isJoined && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isSelected ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"}`}>
                        Joined
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configurable posting alias */}
          <div className="bg-white border border-[#E3D8BF] rounded-2xl p-4 space-y-2 shadow-sm">
            <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Your Active Alias</h4>
            <input
              type="text"
              value={anonymousAuthor}
              onChange={(e) => setAnonymousAuthor(e.target.value)}
              placeholder="e.g. coconut_friend"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <p className="text-[9px] text-slate-400">You can customize this pseudonym anytime to change how your posts/comments appear.</p>
          </div>
        </div>

        {/* Center / Right Column: Active Forum Workspace */}
        <div className="lg:col-span-9 space-y-4">
          {selectedCommunity && (
            <div className="bg-white border border-[#E3D8BF] rounded-2xl p-6 shadow-sm space-y-6">
              
              {/* Selected Community Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-[#163A2E]">{selectedCommunity.name} Community</h2>
                  <p className="text-xs text-slate-500">{selectedCommunity.description}</p>
                </div>

                {!joinedIds.includes(selectedCommunity.id) ? (
                  <button
                    id={`btn-join-comm-${selectedCommunity.id}`}
                    onClick={() => handleJoin(selectedCommunity.id)}
                    className="px-4 py-2 bg-[#158A80] hover:bg-[#1FA396] text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
                  >
                    Join Support Circle
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Subscribed Circle
                  </span>
                )}
              </div>

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl">
                  {successMsg}
                </div>
              )}

              {/* View 1: Active Post Discussion */}
              {activePost ? (
                <div className="space-y-6">
                  {/* Back button */}
                  <button
                    onClick={() => setActivePost(null)}
                    className="text-xs font-semibold text-[#163A2E] hover:underline"
                  >
                    &larr; Back to discussion board
                  </button>

                  {/* Main Post */}
                  <div className="space-y-4 bg-[#FAF6EA]/50 p-5 rounded-xl border border-slate-100">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Posted by <strong>{activePost.anonymous_author}</strong></span>
                      <span>{new Date(activePost.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm">{activePost.title}</h3>
                    <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{renderContent(activePost.content)}</div>

                    <div className="flex items-center gap-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      <button
                        onClick={() => handleLike(activePost.id)}
                        className={`flex items-center gap-1 hover:text-[#163A2E] ${activePost.liked_by_users?.includes(user.id) ? "text-[#163A2E] font-bold" : ""}`}
                      >
                        <ThumbsUp className="w-4 h-4" /> {activePost.likes_count || 0} Likes
                      </button>

                      <button
                        onClick={() => handleReport(activePost.id)}
                        className="flex items-center gap-1 text-slate-400 hover:text-red-600 ml-auto"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Report Post
                      </button>
                    </div>
                  </div>

                  {/* Comments list */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4" /> Discussion Feed
                    </h4>

                    {comments.length === 0 ? (
                      <p className="text-slate-400 text-xs italic pl-4">No comments shared yet. Be the first to speak comforting words!</p>
                    ) : (
                      <div className="space-y-3.5 pl-4 border-l border-slate-100">
                        {comments.map((comment) => (
                          <div key={comment.id} className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span className="font-semibold text-slate-600">{comment.anonymous_author}</span>
                              <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="text-slate-600 leading-normal bg-slate-50 p-2.5 rounded-xl">{renderContent(comment.content)}</div>
                            {onNavigateToDirectMessage && comment.user_id !== user.id && (
                              <button
                                onClick={() => onNavigateToDirectMessage(comment.user_id)}
                                className="text-[10px] text-[#158A80] hover:underline"
                              >
                                Message anonymously &rarr;
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Voice Comment Recorder (collapsible) */}
                    {showCommentVoice && (
                      <div className="py-3 border-t border-slate-100">
                        <VoiceRecorder 
                          onVoiceAttached={handleCreateVoiceComment}
                          onCancel={() => setShowCommentVoice(false)}
                        />
                      </div>
                    )}

                    {/* Write comment form */}
                    <form onSubmit={handleCreateComment} className="flex items-center gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCommentVoice(!showCommentVoice)}
                        className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
                          showCommentVoice 
                            ? "bg-red-500 hover:bg-red-600 text-white border-transparent shadow-sm" 
                            : "bg-[#FAF6EA] hover:bg-slate-50 text-slate-500 border-[#E3D8BF]"
                        }`}
                        title="Toggle voice note recorder"
                      >
                        <Mic className="w-4.5 h-4.5" />
                      </button>

                      <input
                        type="text"
                        placeholder={showCommentVoice ? "Recording active. Attach your note or cancel..." : "Share supportive words..."}
                        value={newCommentContent}
                        disabled={showCommentVoice}
                        onChange={(e) => setNewCommentContent(e.target.value)}
                        className="flex-1 px-4 py-2 bg-[#FAF6EA] border border-[#E3D8BF] rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none text-xs disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={showCommentVoice || !newCommentContent.trim()}
                        className="px-4 py-2 bg-[#163A2E] text-white rounded-xl transition-colors hover:bg-[#1FA396] flex items-center justify-center disabled:opacity-50"
                      >
                        <Send className="w-4.5 h-4.5" />
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                // View 2: List of active community posts & Create Post form
                <div className="space-y-8">
                  
                  {/* Create Post Card */}
                  {joinedIds.includes(selectedCommunity.id) ? (
                    <div className="bg-[#FAF6EA] border border-[#E3D8BF] rounded-xl p-4 space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <PlusCircle className="w-4.5 h-4.5 text-[#158A80]" /> Start a Private Conversation
                      </h4>

                      <form onSubmit={handleCreatePost} className="space-y-3">
                        <input
                          type="text"
                          placeholder="What is the topic of your thought? (e.g. Sleep anxiety during warnings)"
                          value={newPostTitle}
                          onChange={(e) => setNewPostTitle(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-[#E3D8BF] rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none text-xs"
                          required
                        />
                        
                        <div className="flex items-center gap-2 mb-1">
                          <button
                            type="button"
                            onClick={() => setShowPostVoice(false)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                              !showPostVoice 
                                ? "bg-[#163A2E] text-white border-transparent" 
                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            Write Text Post
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowPostVoice(true)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all flex items-center gap-1 ${
                              showPostVoice 
                                ? "bg-[#163A2E] text-white border-transparent" 
                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <Mic className="w-3.5 h-3.5" /> Record Voice Post
                          </button>
                        </div>

                        {showPostVoice ? (
                          <div className="bg-white border border-[#E3D8BF] p-3 rounded-xl">
                            {newPostContent.startsWith('{"isVoiceNote":true') ? (
                              <div className="space-y-2">
                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Private voice note successfully attached!
                                </span>
                                {renderContent(newPostContent)}
                                <button
                                  type="button"
                                  onClick={() => setNewPostContent("")}
                                  className="text-[10px] text-red-500 hover:underline font-semibold"
                                >
                                  Remove and record again
                                </button>
                              </div>
                            ) : (
                              <VoiceRecorder 
                                onVoiceAttached={(base64, duration, preset) => {
                                  const payloadContent = JSON.stringify({
                                    isVoiceNote: true,
                                    audio: base64,
                                    duration: duration,
                                    modifier: preset
                                  });
                                  setNewPostContent(payloadContent);
                                }}
                              />
                            )}
                          </div>
                        ) : (
                          <textarea
                            rows={3}
                            placeholder="Express yourself. Feel free to explain details. Remember, you are fully anonymous."
                            value={newPostContent.startsWith('{"isVoiceNote":true') ? "" : newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-[#E3D8BF] rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none text-xs"
                          />
                        )}

                        <button
                          type="submit"
                          disabled={!newPostTitle.trim() || !newPostContent.trim()}
                          className="px-5 py-2 bg-[#163A2E] hover:bg-[#1FA396] text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                        >
                          Submit Anonymous Post
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500">
                      You must join this Support Circle to write a post. Click "Join Support Circle" above.
                    </div>
                  )}

                  {/* List of active posts */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Posts Feed</h3>

                    {posts.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs italic">
                        No active discussions in this circle yet. Feel free to share your thoughts first.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {posts.map((post) => (
                          <div
                            key={post.id}
                            className="p-4 border border-slate-100 rounded-xl hover:border-[#158A80]/30 transition-all space-y-2 cursor-pointer bg-white"
                          >
                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                              <span>By <strong>{post.anonymous_author}</strong></span>
                              <span>{new Date(post.created_at).toLocaleDateString()}</span>
                            </div>

                            <div onClick={() => setActivePost(post)}>
                              <h4 className="font-semibold text-slate-800 text-xs hover:text-[#163A2E]">{post.title}</h4>
                              <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                {post.content.startsWith('{"isVoiceNote":true') ? "🎤 [Voice Post]" : post.content}
                              </p>
                            </div>

                            <div className="flex items-center gap-4 pt-2 border-t border-slate-50 text-[10px] text-slate-500">
                              <button
                                onClick={() => handleLike(post.id)}
                                className="flex items-center gap-1 hover:text-[#163A2E]"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" /> {post.likes_count || 0}
                              </button>

                              <button
                                onClick={() => setActivePost(post)}
                                className="flex items-center gap-1 hover:text-[#158A80]"
                              >
                                <MessageSquare className="w-3.5 h-3.5" /> Reply to discussion
                              </button>

                              <button
                                onClick={() => handleReport(post.id)}
                                className="flex items-center gap-1 text-slate-300 hover:text-red-600 ml-auto"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" /> Report
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
