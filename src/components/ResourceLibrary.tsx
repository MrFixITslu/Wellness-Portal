import React, { useEffect, useState } from "react";
import { Resource, ResourceCategory } from "../types";
import { Search, BookOpen, Clock, Heart, Filter, ChevronRight, X } from "lucide-react";

export default function ResourceLibrary() {
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeArticle, setActiveArticle] = useState<Resource | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  useEffect(() => {
    const loadResources = async () => {
      try {
        const catRes = await fetch("/api/resources/categories");
        if (catRes.ok) setCategories(await catRes.json());

        const resRes = await fetch("/api/resources");
        if (resRes.ok) setResources(await resRes.json());
      } catch (e) {
        console.error("Failed to load articles", e);
      }
    };
    loadResources();

    // Load saved bookmarks from local storage
    const saved = localStorage.getItem("carib_bookmarks");
    if (saved) {
      try {
        setBookmarkedIds(JSON.parse(saved));
      } catch (_) {}
    }
  }, []);

  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (bookmarkedIds.includes(id)) {
      updated = bookmarkedIds.filter((b) => b !== id);
    } else {
      updated = [...bookmarkedIds, id];
    }
    setBookmarkedIds(updated);
    localStorage.setItem("carib_bookmarks", JSON.stringify(updated));
  };

  const filteredResources = resources.filter((res) => {
    const matchesCategory = selectedCategory === "all" || res.category_id === selectedCategory;
    const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          res.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          res.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div id="resources-library-container" className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 id="resources-title" className="text-xl font-semibold tracking-tight text-[#0F4C81]">Caribbean Wellness Library</h1>
        <p id="resources-desc" className="text-slate-500 text-xs">
          Empowering articles and mindful reflections curated specifically for Caribbean professionals, parents, and youth.
        </p>
      </div>

      {/* Controls: Category tags + Search bar */}
      <div id="resources-controls" className="bg-white border border-[#EBE3D5] rounded-2xl p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shadow-sm">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            id="input-search-articles"
            type="text"
            placeholder="Search wellness articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-[#EBE3D5] rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none text-xs"
          />
        </div>

        {/* Categories selector */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            id="select-category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-[#EBE3D5] rounded-xl text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-[#00A896]"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Articles feed */}
      <div id="articles-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredResources.length === 0 ? (
          <div className="md:col-span-2 bg-white border border-[#EBE3D5] p-8 text-center text-slate-400 text-xs italic rounded-2xl">
            No articles found matching your parameters. Try another keyword.
          </div>
        ) : (
          filteredResources.map((article) => {
            const isBookmarked = bookmarkedIds.includes(article.id);
            const catName = categories.find((c) => c.id === article.category_id)?.name || "Wellness";

            return (
              <div
                key={article.id}
                onClick={() => setActiveArticle(article)}
                className="bg-white border border-[#EBE3D5] rounded-2xl p-5 hover:border-[#00A896]/50 transition-all cursor-pointer flex flex-col justify-between shadow-sm space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold tracking-wider uppercase">
                    <span className="text-[#00A896] bg-teal-50 px-2 py-0.5 rounded-full">{catName}</span>
                    <button
                      onClick={(e) => handleToggleBookmark(article.id, e)}
                      className={`p-1 rounded hover:bg-slate-50 transition-colors ${
                        isBookmarked ? "text-amber-500" : "text-slate-300"
                      }`}
                      title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                    >
                      <Heart className="w-4.5 h-4.5 fill-current" />
                    </button>
                  </div>

                  <h3 className="font-semibold text-slate-800 text-sm hover:text-[#0F4C81] line-clamp-1">{article.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{article.excerpt}</p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-50">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {article.read_time_mins} min read
                  </span>
                  <span className="text-[#0F4C81] font-semibold flex items-center gap-0.5 hover:underline">
                    Read article <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reader Modal Overlay */}
      {activeArticle && (
        <div id="article-reader-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-[#FBF8F3] border border-[#EBE3D5] rounded-2xl shadow-lg flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#00A896] tracking-wider uppercase bg-teal-50 px-2 py-0.5 rounded-full">
                {categories.find((c) => c.id === activeArticle.category_id)?.name || "Wellness"}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleToggleBookmark(activeArticle.id, e)}
                  className={`p-1.5 rounded hover:bg-slate-50 transition-colors ${
                    bookmarkedIds.includes(activeArticle.id) ? "text-amber-500" : "text-slate-300"
                  }`}
                >
                  <Heart className="w-5 h-5 fill-current" />
                </button>
                <button
                  onClick={() => setActiveArticle(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Reading canvas */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4">
              <h2 className="text-lg md:text-xl font-semibold text-slate-800 tracking-tight">{activeArticle.title}</h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 border-b border-slate-100 pb-3">
                <Clock className="w-4 h-4" /> <span>{activeArticle.read_time_mins} min read</span>
                <span className="mx-2">•</span>
                <span>Category: {categories.find((c) => c.id === activeArticle.category_id)?.name || "Wellness"}</span>
              </div>

              {/* Body Content with formatted Markdown-style paragraphs */}
              <div className="text-xs text-slate-600 leading-relaxed space-y-4 whitespace-pre-wrap">
                {activeArticle.content}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-100 text-center text-[10px] text-slate-400 italic">
              Empowering Caribbean minds anonymised and privately • Saman Library
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
