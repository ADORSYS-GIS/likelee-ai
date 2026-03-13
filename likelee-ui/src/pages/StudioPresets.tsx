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
  Wand2,
} from "lucide-react";
import { listPresets, type StudioStylePreset } from "@/api/studio";

export default function StudioPresets() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: fetchedPresets, isLoading } = useQuery({
    queryKey: ["studio", "presets"],
    queryFn: listPresets,
  });

  const categorizedPresets = React.useMemo(() => {
    if (!fetchedPresets) return [];

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

  const handleSelectPreset = (preset: StudioStylePreset) => {
    // Navigate to StudioImage with the preset applied
    const params = new URLSearchParams();
    params.set("prompt", preset.prompt);
    params.set("preset_id", preset.id);
    navigate(`${createPageUrl("StudioImage")}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#09090F] text-[#F0F0FF] font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-cyan-500/20 bg-black/40">
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Wand2 size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  Image Presets
                </h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                  Style & Aesthetic Library
                </p>
              </div>
            </div>
          </div>

          <div className="relative w-72 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
            <input
              type="text"
              placeholder="Search presets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12">
        {/* Intro */}
        <div className="mb-12">
          <h2 className="text-3xl font-extrabold mb-4">Master any style</h2>
          <p className="text-gray-400 max-w-2xl leading-relaxed">
            Discover hundreds of professional image styles. From hyper-realistic
            photography to ethereal digital art, our curated presets help you
            achieve the perfect look for your AI generations.
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
                  ? "bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-600/30"
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
              }`}
            >
              {cat.category}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
            <p className="animate-pulse font-medium">
              Loading style presets...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {categorizedPresets
              .find((c) => c.category === selectedCategory)
              ?.styles.map((style) => (
                <div
                  key={style.id}
                  onClick={() => handleSelectPreset(style)}
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-all cursor-pointer bg-white/5 shadow-2xl"
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

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 backdrop-blur-md border border-cyan-400/60 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider mb-0.5">
                      {style.category}
                    </p>
                    <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-cyan-200 transition-colors">
                      {style.name}
                    </h3>
                  </div>
                </div>
              ))}
          </div>
        )}

        {!isLoading && categorizedPresets.length === 0 && (
          <div className="text-center py-32 border border-dashed border-white/5 rounded-3xl">
            <div className="text-5xl mb-6 opacity-20">🎨</div>
            <h3 className="text-xl font-bold text-gray-400">
              No presets found
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
