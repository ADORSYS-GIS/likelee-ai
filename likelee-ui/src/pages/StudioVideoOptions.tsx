import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Film,
  ArrowLeft,
  Clock,
  Coins,
  Search,
  Image as ImageFrame,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const videoModels = [
  {
    id: "fal-ai/runway-gen3/turbo/text-to-video",
    name: "Runway Gen-3 Turbo",
    icon: "🎬",
    description: "Fast, high-quality video generation",
    duration: "5-10 sec",
    credits: "15+",
    badges: ["Hot"],
  },
  {
    id: "fal-ai/luma-dream-machine",
    name: "Luma Dream Machine",
    icon: "💫",
    description: "Cinematic AI video creation",
    duration: "5 sec",
    credits: "12+",
    badges: ["New"],
  },
  {
    id: "fal-ai/kling-video/v1/pro/text-to-video",
    name: "Kling AI Pro",
    icon: "⚡",
    description: "Professional grade video with emotional depth",
    duration: "5-10 sec",
    credits: "30+",
    badges: [],
  },
  {
    id: "fal-ai/kling-video/v1/standard/text-to-video",
    name: "Kling AI Standard",
    icon: "⚡",
    description: "Enhanced visual realism and motion fluidity",
    duration: "5-10 sec",
    credits: "20+",
    badges: [],
  },
  {
    id: "fal-ai/hunyuan-video",
    name: "Hunyuan Video",
    icon: "🎭",
    description: "Tencent's powerful video model",
    duration: "2-5 sec",
    credits: "25+",
    badges: ["Audio"],
  },
  {
    id: "fal-ai/fast-animatediff/text-to-video",
    name: "Fast AnimateDiff",
    icon: "🎨",
    description: "Quick animation generation",
    duration: "3 sec",
    credits: "10+",
    badges: [],
  },
  {
    id: "fal-ai/fast-svd/text-to-video",
    name: "Stable Video Diffusion",
    icon: "🌊",
    description: "Stable fluid motion and lifelike dynamics",
    duration: "3-5 sec",
    credits: "8+",
    badges: [],
  },
  {
    id: "fal-ai/fast-svd/image-to-video",
    name: "SVD Image-to-Video",
    icon: "🖼️",
    description: "Animate images into smooth videos",
    duration: "3-5 sec",
    credits: "8+",
    badges: ["End frame"],
  },
];

export default function StudioVideoOptions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedModel, setSelectedModel] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const modelId = searchParams.get("model");
  const modelName = searchParams.get("name");
  const mode = searchParams.get("mode") || "text-to-video";

  const filteredModels = videoModels.filter(
    (model) =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleModelSelect = (model) => {
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
    <div style={{ background: "#0A0A0F", minHeight: "100vh", color: "#fff" }}>
      {/* Header */}
      <header className="px-6 py-6 border-b border-white/10 bg-[#0A0A0F]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate(createPageUrl("Studio"))}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <Film className="w-6 h-6 text-[#F18B6A]" />
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {getModeTitle()}
                  </h1>
                  <p className="text-sm text-gray-400">
                    Choose a model to get started
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
        </div>
      </header>

      {/* Model Selection Grid */}
      <section className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-3">
            {filteredModels.map((model) => (
              <Card
                key={model.id}
                onClick={() => handleModelSelect(model)}
                className={`p-6 bg-white/5 border-2 ${
                  selectedModel?.id === model.id
                    ? "border-[#F18B6A]"
                    : "border-white/10"
                } hover:border-white/30 rounded-xl cursor-pointer transition-all group`}
              >
                <div className="flex items-start gap-4">
                  {/* Radio Button */}
                  <div
                    className={`w-6 h-6 rounded-full border-2 ${
                      selectedModel?.id === model.id
                        ? "border-[#F18B6A] bg-[#F18B6A]"
                        : "border-white/30"
                    } flex items-center justify-center flex-shrink-0 mt-1`}
                  >
                    {selectedModel?.id === model.id && (
                      <div className="w-3 h-3 rounded-full bg-white" />
                    )}
                  </div>

                  {/* Model Icon */}
                  <div className="text-4xl flex-shrink-0">{model.icon}</div>

                  {/* Model Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-bold text-white">
                        {model.name}
                      </h3>
                      {model.badges.map((badge, idx) => (
                        <Badge
                          key={idx}
                          className={
                            badge === "Hot"
                              ? "bg-pink-500/20 text-pink-400 border-pink-500/30"
                              : badge === "New"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : badge === "Audio"
                                  ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                                  : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          }
                        >
                          {badge}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-gray-400 mb-4">{model.description}</p>

                    {/* Model Stats */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-300">
                          {model.duration}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                        <Coins className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-sm text-gray-300">
                          {model.credits} credits
                        </span>
                      </div>

                      {model.badges.includes("End frame") && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                          <ImageFrame className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-sm text-gray-300">
                            End frame
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow indicator on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-[#F18B6A]/20 flex items-center justify-center">
                      <ArrowLeft className="w-4 h-4 text-[#F18B6A] rotate-180" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredModels.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">
                No models found matching "{searchQuery}"
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
