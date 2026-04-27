import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import {
  Sparkles,
  ArrowLeft,
  Search,
  Loader2,
  Image as ImageIcon,
  ChevronRight,
  Play,
} from "lucide-react";
import { listPresets, type StudioStylePreset } from "@/api/studio";
import { useTranslation } from "react-i18next";

export default function StudioTemplates() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: fetchedPresets, isLoading } = useQuery({
    queryKey: ["studio", "presets"],
    queryFn: listPresets,
  });

  const categorizedPresets = React.useMemo(() => {
    if (!fetchedPresets) return [];

    // For Templates, we might want to prioritize "Motion" or "Video" related categories if they exist,
    // but for now we'll show all and maybe highlight some.
    const map = new Map<string, StudioStylePreset[]>();
    fetchedPresets.forEach((p) => {
      const cat = p.category || "All Styles";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    });

    return Array.from(map.entries())
      .map(([category, styles]) => ({
        category,
        styles: styles.filter(
          (s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      }))
      .filter((cat) => cat.styles.length > 0);
  }, [fetchedPresets, searchQuery]);

  React.useEffect(() => {
    if (categorizedPresets.length > 0 && !selectedCategory) {
      setSelectedCategory(categorizedPresets[0].category);
    }
  }, [categorizedPresets, selectedCategory]);

  const handleSelectTemplate = (preset: StudioStylePreset) => {
    // Navigate to StudioVideo with the preset applied
    // We pass the prompt via URL or state. URL is better for direct linking.
    const params = new URLSearchParams();
    params.set("prompt", preset.prompt);
    params.set("preset_id", preset.id);
    navigate(`${createPageUrl("StudioVideo")}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#09090F] text-[#F0F0FF] font-body pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-purple-500/20 bg-black/40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(createPageUrl("Studio"))}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
            >
              <ArrowLeft
                size={18}
                className="group-hover:-translate-x-1 transition-transform"
              />
              <span className="text-sm font-medium">Back to Studio</span>
            </button>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-orange-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  Video Templates
                </h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                  Motion & Style Library
                </p>
              </div>
            </div>
          </div>

          <div className="relative w-72 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12">
        {/* Intro */}
        <div className="mb-12">
          <h2 className="text-3xl font-extrabold mb-4">
            Choose a starting point
          </h2>
          <p className="text-gray-400 max-w-2xl leading-relaxed">
            Browse our library of high-quality AI video templates. Each template
            includes optimized prompts and motion settings to give you
            professional results instantly.
          </p>
        </div>

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar mb-8">
          {categorizedPresets.map((cat) => (
            <button
              key={cat.category}
              onClick={() => setSelectedCategory(cat.category)}
              className={`px-6 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                selectedCategory === cat.category
                  ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/30"
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
              }`}
            >
              {cat.category}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
            <p className="animate-pulse font-medium">
              Loading premium templates...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {categorizedPresets
              .find((c) => c.category === selectedCategory)
              ?.styles.map((style) => (
                <div
                  key={style.id}
                  onClick={() => handleSelectTemplate(style)}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer bg-white/5 shadow-2xl"
                >
                  {style.preview_url ? (
                    <img
                      src={style.preview_url}
                      alt={style.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                      <ImageIcon className="w-12 h-12 opacity-10" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/60 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">
                      {style.category}
                    </p>
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-purple-200 transition-colors">
                      {style.name}
                    </h3>
                  </div>
                </div>
              ))}
          </div>
        )}

        {!isLoading && categorizedPresets.length === 0 && (
          <div className="text-center py-32 border border-dashed border-white/5 rounded-3xl">
            <div className="text-5xl mb-6 opacity-20">🎬</div>
            <h3 className="text-xl font-bold text-gray-400">
              No templates found
            </h3>
            <p className="text-gray-600 mt-2">
              Try adjusting your search or category filters.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
