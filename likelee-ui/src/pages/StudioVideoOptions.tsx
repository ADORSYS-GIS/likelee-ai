import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import {
  Film,
  ArrowLeft,
  Clock,
  Coins,
  Search,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const videoModels = [
  {
    id: "fal-ai/sora-2/image-to-video",
    name: "Sora 2",
    icon: "🎥",
    description: "OpenAI's cinematic engine (Image-to-Video)",
    duration: "5–10 sec",
    credits: "30",
    tag: "Beta",
    tagColor: "#F59E0B",
    capabilities: ["SOTA", "Quality", "Image"],
  },
  {
    id: "fal-ai/veo3.1",
    name: "Google Veo 3.1",
    icon: "🎬",
    description: "State-of-the-art AI video with synchronized audio",
    duration: "4–8 sec",
    credits: "20",
    tag: "Pro",
    tagColor: "#EC4899",
    capabilities: ["AI-Audio", "Quality"],
  },
  {
    id: "fal-ai/veo3.1/image-to-video",
    name: "Veo 3.1 · Image→Video",
    icon: "🖼️",
    description: "DeepMind's flagship image-to-video with audio",
    duration: "4–8 sec",
    credits: "25",
    tag: "SOTA",
    tagColor: "#EC4899",
    capabilities: ["AI-Audio", "Image"],
  },
  {
    id: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
    name: "Kling 2.6 Pro",
    icon: "🎞️",
    description: "Top-tier fluidity with native lip-sync",
    duration: "5–10 sec",
    credits: "30",
    tag: "Adv",
    tagColor: "#6366F1",
    capabilities: ["Fluidity", "AI-Audio"],
  },
  {
    id: "fal-ai/wan/v2.2-a14b/image-to-video",
    name: "Wan 2.1",
    icon: "🌅",
    description: "High motion diversity and cinematic results",
    duration: "5 sec",
    credits: "15",
    tag: "Wan",
    tagColor: "#10B981",
    capabilities: ["Motion", "Custom-Voice"],
  },
  {
    id: "fal-ai/minimax/hailuo-02/standard/image-to-video",
    name: "MiniMax 02",
    icon: "✨",
    description: "Advanced motion with 768p resolution",
    duration: "5 sec",
    credits: "15",
    tag: "New",
    tagColor: "#6366F1",
    capabilities: ["Motion", "Custom-Voice"],
  },
  {
    id: "fal-ai/seedance-v2",
    name: "Seedance 2.0",
    icon: "🌱",
    description: "Bytedance's cinematic model with audio",
    duration: "5 sec",
    credits: "20",
    tag: "Sync",
    tagColor: "#10B981",
    capabilities: ["AI-Audio", "Custom-Voice"],
  },
  {
    id: "fal-ai/minimax/video-01-live",
    name: "MiniMax Video 01",
    icon: "💫",
    description: "Fast text-to-video with prompt optimization",
    duration: "5 sec",
    credits: "10",
    tag: "Legacy",
    tagColor: "#4B5563",
    capabilities: ["Speed", "Quality"],
  },
];

const capabilityColors: Record<string, { bg: string; color: string }> = {
  Speed: { bg: "rgba(16,185,129,0.1)", color: "#10B981" },
  Quality: { bg: "rgba(139,92,246,0.1)", color: "#C084FC" },
  Cinematic: { bg: "rgba(236,72,153,0.1)", color: "#EC4899" },
  Pro: { bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
  Depth: { bg: "rgba(241,139,106,0.1)", color: "#F18B6A" },
  Realism: { bg: "rgba(59,130,246,0.1)", color: "#60A5FA" },
  Motion: { bg: "rgba(139,92,246,0.1)", color: "#A78BFA" },
  Creative: { bg: "rgba(236,72,153,0.1)", color: "#F472B6" },
  Audio: { bg: "rgba(139,92,246,0.1)", color: "#8B5CF6" },
  Fast: { bg: "rgba(16,185,129,0.1)", color: "#34D399" },
  Animation: { bg: "rgba(251,191,36,0.1)", color: "#FCD34D" },
  Stable: { bg: "rgba(107,114,128,0.1)", color: "#9CA3AF" },
  Fluid: { bg: "rgba(59,130,246,0.1)", color: "#38BDF8" },
  Image: { bg: "rgba(139,92,246,0.1)", color: "#C084FC" },
  Animate: { bg: "rgba(241,139,106,0.1)", color: "#F18B6A" },
  "AI-Audio": { bg: "rgba(139,92,246,0.1)", color: "#8B5CF6" },
  "Custom-Voice": { bg: "rgba(16,185,129,0.1)", color: "#10B981" },
};

export default function StudioVideoOptions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const mode = searchParams.get("mode") || "text-to-video";

  const filteredModels = videoModels.filter(
    (model) =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleModelSelect = (model: typeof videoModels[0]) => {
    navigate(
      createPageUrl("StudioVideo") +
      `?model=${encodeURIComponent(model.id)}&mode=${mode}`,
    );
  };

  const getModeTitle = () => {
    if (mode === "text-to-video") return "Text to Video";
    if (mode === "image-to-video") return "Image to Video";
    if (mode === "video-to-video") return "Video to Video";
    return "Video Generation";
  };

  return (
    <div
      style={{
        background: "#09090F",
        minHeight: "100vh",
        color: "#F0F0FF",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── HEADER ── */}
      <header
        style={{
          background: "linear-gradient(90deg, #0F0F1E 0%, #120F1C 50%, #0F0F1E 100%)",
          borderBottom: "1px solid rgba(139,92,246,0.25)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "0 24px",
          }}
        >
          <div
            style={{
              height: 64,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <button
              onClick={() => navigate(createPageUrl("Studio"))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#9CA3AF",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                transition: "color 0.2s",
                padding: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F0FF")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #8B5CF6, #F18B6A)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Film size={18} color="#fff" />
              </div>
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                    background: "linear-gradient(90deg, #C084FC, #F18B6A)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    lineHeight: 1.2,
                  }}
                >
                  {getModeTitle()}
                </h1>
                <p style={{ margin: 0, fontSize: 11, color: "#6B7280" }}>
                  Pick your AI engine
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div
            style={{
              paddingBottom: 16,
              position: "relative",
            }}
          >
            <Search
              size={16}
              color="#6B7280"
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models…"
              style={{
                width: "100%",
                padding: "11px 16px 11px 40px",
                borderRadius: 12,
                border: "1px solid rgba(139,92,246,0.25)",
                background: "rgba(255,255,255,0.03)",
                color: "#F0F0FF",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(139,92,246,0.6)";
                e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(139,92,246,0.25)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>
        </div>
      </header>

      {/* ── INTRO BADGE ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 8px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 999,
            background: "rgba(139,92,246,0.08)",
            border: "1px solid rgba(139,92,246,0.2)",
            marginBottom: 4,
          }}
        >
          <Sparkles size={13} color="#C084FC" />
          <span style={{ fontSize: 12, color: "#C084FC", fontWeight: 600 }}>
            {filteredModels.length} models available
          </span>
        </div>
      </div>

      {/* ── MODEL LIST ── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "12px 24px 48px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredModels.map((model) => {
            const isHovered = hoveredModel === model.id;
            return (
              <div
                key={model.id}
                onClick={() => handleModelSelect(model)}
                onMouseEnter={() => setHoveredModel(model.id)}
                onMouseLeave={() => setHoveredModel(null)}
                style={{
                  padding: "20px 24px",
                  background: isHovered
                    ? "linear-gradient(135deg, #1A1A2E, #16162A)"
                    : "#12121C",
                  border: isHovered
                    ? "1px solid rgba(139,92,246,0.5)"
                    : "1px solid rgba(139,92,246,0.12)",
                  borderRadius: 18,
                  cursor: "pointer",
                  transition: "all 0.22s ease",
                  transform: isHovered ? "translateY(-2px)" : "none",
                  boxShadow: isHovered
                    ? "0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(139,92,246,0.1)"
                    : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: isHovered
                      ? "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(241,139,106,0.1))"
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isHovered ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                    flexShrink: 0,
                    transition: "all 0.22s",
                  }}
                >
                  {model.icon}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#F0F0FF" }}>
                      {model.name}
                    </h3>
                    {model.tag && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: `${model.tagColor}18`,
                          color: model.tagColor!,
                          border: `1px solid ${model.tagColor}35`,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        {model.tag}
                      </span>
                    )}
                  </div>

                  <p style={{ margin: "0 0 10px", fontSize: 13, color: "#6B7280", lineHeight: 1.4 }}>
                    {model.description}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {/* Duration */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <Clock size={11} color="#9CA3AF" />
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>{model.duration}</span>
                    </div>
                    {/* Credits */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: "rgba(245,158,11,0.06)",
                        border: "1px solid rgba(245,158,11,0.15)",
                      }}
                    >
                      <Coins size={11} color="#F59E0B" />
                      <span style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600 }}>{model.credits} credits</span>
                    </div>
                    {/* Capabilities */}
                    {model.capabilities.map((cap) => {
                      const style = capabilityColors[cap] || { bg: "rgba(255,255,255,0.06)", color: "#9CA3AF" };
                      return (
                        <span
                          key={cap}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 8,
                            background: style.bg,
                            color: style.color,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {cap}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Arrow */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: isHovered ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isHovered ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.07)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.22s",
                  }}
                >
                  <ChevronRight size={16} color={isHovered ? "#C084FC" : "#4B5563"} />
                </div>
              </div>
            );
          })}
        </div>

        {filteredModels.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "80px 40px",
              color: "#4B5563",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <p style={{ fontSize: 16, margin: 0 }}>
              No models found for "<span style={{ color: "#9CA3AF" }}>{searchQuery}</span>"
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
