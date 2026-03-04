import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { StudioAssetPicker, StudioAsset } from "@/components/studio/StudioAssetPicker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Film,
  Upload,
  Loader2,
  Download,
  Coins,
  ArrowLeft,
  Sparkles,
  Zap,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  X,
  Play,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/use-toast";
import { getUserFriendlyError } from "@/utils";
import WalletTransactionsDialog from "@/components/WalletTransactionsDialog";
import {
  generate as studioGenerate,
  getJobStatus,
  getWallet,
  inferProviderFromModel,
  listGenerations,
  type StudioGenerationRow,
} from "@/api/studio";

const videoModels = [
  // ── TEXT-TO-VIDEO ──────────────────────────────────────────────
  {
    id: "fal-ai/veo3.1",
    name: "Google Veo 3.1",
    cost: 20,
    description: "State-of-the-art video with synchronized audio",
    duration: [4, 6, 8],
    icon: "🎬",
    tag: "Pro",
    tagColor: "#EC4899",
    supportsImage: false,
    requiresImage: false,
    supportsAudio: true,
    supportsExternalAudio: false,
  },
  {
    id: "fal-ai/minimax/video-01-live",
    name: "MiniMax Video 01",
    cost: 10,
    description: "Fast text-to-video with prompt optimization",
    duration: [5],
    icon: "✨",
    tag: "New",
    tagColor: "#10B981",
    supportsImage: false,
    requiresImage: false,
    supportsAudio: false,
    supportsExternalAudio: false,
  },
  {
    id: "fal-ai/hunyuan-video",
    name: "Hunyuan Video",
    cost: 15,
    description: "Tencent's powerful open-source model",
    duration: [2, 5],
    icon: "🎭",
    tag: null,
    tagColor: null,
    supportsImage: false,
    requiresImage: false,
    supportsAudio: false,
    supportsExternalAudio: false,
  },
  {
    id: "fal-ai/mochi-v1",
    name: "Mochi 1",
    cost: 12,
    description: "Open-source video with high-fidelity motion",
    duration: [3, 5],
    icon: "🔥",
    tag: "Open",
    tagColor: "#F59E0B",
    supportsImage: false,
    requiresImage: false,
    supportsAudio: false,
    supportsExternalAudio: false,
  },
  {
    id: "fal-ai/ltx-video",
    name: "LTX Video",
    cost: 5,
    description: "Ultra-fast open-source text-to-video",
    duration: [3, 5],
    icon: "⚡",
    tag: "Fast",
    tagColor: "#10B981",
    supportsImage: false,
    requiresImage: false,
    supportsAudio: false,
    supportsExternalAudio: false,
  },
  // ── IMAGE-TO-VIDEO ─────────────────────────────────────────────
  {
    id: "fal-ai/veo3.1/image-to-video",
    name: "Veo 3.1 · Image→Video",
    cost: 25,
    description: "DeepMind's flagship image-to-video with audio",
    duration: [4, 6, 8],
    icon: "🖼️",
    tag: "State-of-the-art",
    tagColor: "#EC4899",
    supportsImage: true,
    requiresImage: true,
    supportsAudio: true,
    supportsExternalAudio: false,
  },
  {
    id: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
    name: "Kling 2.6 Pro · Image→Video",
    cost: 30,
    description: "Top-tier fluidity with native lip-sync",
    duration: [5, 10],
    icon: "🎞️",
    tag: "Adv",
    tagColor: "#6366F1",
    supportsImage: true,
    requiresImage: true,
    supportsAudio: true,
    supportsExternalAudio: false,
  },
  {
    id: "fal-ai/wan/v2.2-a14b/image-to-video",
    name: "Wan 2.1 · Image→Video",
    cost: 15,
    description: "High motion diversity and cinematic results",
    duration: [5],
    icon: "🌅",
    tag: "Wan",
    tagColor: "#10B981",
    supportsImage: true,
    requiresImage: true,
    supportsAudio: true,
    supportsExternalAudio: true,
  },
  {
    id: "fal-ai/minimax/hailuo-02/standard/image-to-video",
    name: "MiniMax 02 · Image→Video",
    cost: 15,
    description: "Advanced motion with 768p resolution",
    duration: [5],
    icon: "✨",
    tag: "MiniMax",
    tagColor: "#6366F1",
    supportsImage: true,
    requiresImage: true,
    supportsAudio: true,
    supportsExternalAudio: true,
  },
  {
    id: "fal-ai/seedance-v2",
    name: "Seedance 2.0",
    cost: 20,
    description: "Bytedance's cinematic model with native audio",
    duration: [5],
    icon: "🌱",
    tag: "Sync",
    tagColor: "#10B981",
    supportsImage: true,
    requiresImage: false,
    supportsAudio: true,
    supportsExternalAudio: true,
  },
  {
    id: "fal-ai/kling-video/v1.6/pro/image-to-video",
    name: "Kling 1.6 Pro",
    cost: 18,
    description: "Animate any photo into a fluid cinematic clip",
    duration: [5, 10],
    icon: "🖼️",
    tag: "Legacy",
    tagColor: "#4B5563",
    supportsImage: true,
    requiresImage: true,
    supportsAudio: false,
  },
];

const aspectRatios = [
  { value: "16:9", label: "16:9", shape: "w-10 h-6", hint: "Landscape" },
  { value: "9:16", label: "9:16", shape: "w-6 h-10", hint: "Portrait" },
  { value: "1:1", label: "1:1", shape: "w-8 h-8", hint: "Square" },
  { value: "4:3", label: "4:3", shape: "w-10 h-8", hint: "Classic" },
  { value: "21:9", label: "21:9", shape: "w-14 h-6", hint: "Cinematic" },
];

const promptSuggestions = [
  "A drone shot flying over a neon-lit cyberpunk city at night, rain and reflections…",
  "A lone astronaut floating through a vivid nebula of purple and gold dust…",
  "Slow motion waves crashing on a black sand beach at golden hour…",
  "A futuristic racing car speeding through a glowing tunnel…",
  "Cherry blossom petals falling in slow motion over a serene Japanese garden…",
];

export default function StudioVideo() {
  const [prompt, setPrompt] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<StudioAsset[]>([]);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(videoModels[0].id);
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [fps, setFps] = useState(24);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [generatingJobId, setGeneratingJobId] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const urlModel = searchParams.get("model");

  useEffect(() => {
    if (urlModel && videoModels.some((model) => model.id === urlModel)) {
      setSelectedModel(urlModel);
      const modelData = videoModels.find((m) => m.id === urlModel);
      if (modelData && modelData.duration && modelData.duration.length > 0) {
        setDuration(modelData.duration[0]);
      }
    }
  }, [urlModel]);

  // Cycle prompt suggestions
  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIdx((i) => (i + 1) % promptSuggestions.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const { data: wallet } = useQuery({
    queryKey: ["studio", "wallet"],
    queryFn: () => getWallet(),
  });

  const { data: generations } = useQuery({
    queryKey: ["studio", "generations", "video"],
    queryFn: () => listGenerations({ generation_type: "video", limit: 20 }),
  });

  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      const provider = inferProviderFromModel(selectedModel);
      return await studioGenerate({
        provider,
        model: selectedModel,
        generation_type: "video",
        input_params: data,
      });
    },
    onSuccess: async (result) => {
      setGeneratingJobId(result.generation_id);
      queryClient.invalidateQueries({ queryKey: ["studio", "wallet"] });
      queryClient.invalidateQueries({ queryKey: ["studio", "generations", "video"] });
      pollJobStatus(result.generation_id);
    },
    onError: (error: any) => {
      const errorMessage = error.message?.toLowerCase();
      const statusCode = error.status;
      if (errorMessage?.includes("insufficient credits") || statusCode === 402) {
        setShowSubscriptionModal(true);
      } else {
        toast({
          title: "Error",
          description: getUserFriendlyError(error),
          variant: "destructive",
        });
      }
    },
  });

  const pollJobStatus = async (jobId) => {
    let retries = 0;
    const MAX_RETRIES = 60; // 3 min cap
    const interval = setInterval(async () => {
      retries++;
      if (retries > MAX_RETRIES) {
        clearInterval(interval);
        setGeneratingJobId(null);
        queryClient.invalidateQueries({ queryKey: ["studio", "generations", "video"] });
        return;
      }
      try {
        const statusResult = await getJobStatus(jobId);
        const isDone = statusResult.status === "failed" ||
          (statusResult.status === "completed" && (statusResult.output_urls ?? []).length > 0);
        if (isDone) {
          clearInterval(interval);
          setGeneratingJobId(null);
          queryClient.invalidateQueries({ queryKey: ["studio", "generations", "video"] });
          queryClient.invalidateQueries({ queryKey: ["studio", "wallet"] });
        }
      } catch (error) {
        clearInterval(interval);
        setGeneratingJobId(null);
      }
    }, 3000);
  };

  const selectedModelData = videoModels.find((m) => m.id === selectedModel);
  const modelRequiresImage = selectedModelData?.requiresImage ?? false;
  const modelSupportsImage = selectedModelData?.supportsImage ?? false;

  // Derived from selectedAssets
  const primaryImage = selectedAssets.find(a => a.type === "image");
  const audioAsset = selectedAssets.find(a => a.type === "audio");
  const imageUrl = primaryImage?.url ?? "";

  const handleGenerate = () => {
    if (!prompt && !imageUrl && !modelRequiresImage) {
      toast({
        title: "Input Required",
        description: "Please write a prompt or add a reference image.",
        variant: "destructive",
      });
      return;
    }
    if (modelRequiresImage && !imageUrl) {
      toast({
        title: "Image Required",
        description: `${selectedModelData?.name} needs a reference image. Add one via Assets.`,
        variant: "destructive",
      });
      return;
    }
    if (!wallet || wallet.balance < (selectedModelData?.cost || 10)) {
      setShowSubscriptionModal(true);
      return;
    }

    const buildInputParams = () => {
      const isVeo3 = selectedModel.includes("veo3");
      const isKling = selectedModel.includes("kling-video");
      const isWan = selectedModel.includes("wan");
      const isMiniMax02 = selectedModel.includes("minimax/hailuo-02");
      const isSeedance = selectedModel.includes("seedance");
      const isVidu = selectedModel.includes("vidu");
      const isLuma = selectedModel === "fal-ai/luma-dream-machine";
      const isMiniMaxI2V = selectedModel === "fal-ai/minimax/video-01-live/image-to-video";

      if (isVeo3) {
        const validAspect = ["16:9", "9:16"].includes(aspectRatio) ? aspectRatio : "16:9";
        const durationValue = typeof duration === "number" ? duration : parseInt(duration);
        const durationEnum = durationValue <= 4 ? "4s" : durationValue <= 6 ? "6s" : "8s";
        return {
          prompt: prompt || undefined,
          image_url: imageUrl || undefined,
          aspect_ratio: validAspect,
          duration: durationEnum,
          generate_audio: true, // Native audio requested
          auto_fix: true,
        };
      }

      if (isKling) {
        return {
          image_url: imageUrl || undefined,
          prompt: prompt || undefined,
          duration,
          aspect_ratio: aspectRatio,
          generate_audio: true, // Native audio requested for v2.6+
        };
      }

      if (isWan) {
        return {
          image_url: imageUrl || undefined,
          prompt: prompt || undefined,
          aspect_ratio: aspectRatio,
          ...(audioAsset ? { audio_url: audioAsset.url } : {}),
        };
      }

      if (isMiniMax02) {
        return {
          image_url: imageUrl,
          prompt: prompt || undefined,
          aspect_ratio: aspectRatio,
          ...(audioAsset ? { audio_url: audioAsset.url } : {}),
        };
      }

      if (isSeedance) {
        return {
          image_url: imageUrl || undefined,
          prompt: prompt || undefined,
          aspect_ratio: aspectRatio,
          ...(audioAsset ? { audio_url: audioAsset.url } : {}),
        };
      }

      if (isMiniMaxI2V) {
        return {
          first_frame_image: imageUrl,
          prompt: prompt || undefined,
          generate_audio: true,
        };
      }

      if (isLuma) {
        return {
          prompt: prompt || undefined,
          aspect_ratio: aspectRatio,
          ...(imageUrl ? { image_url: imageUrl } : {}),
        };
      }

      if (isVidu) {
        return {
          prompt: prompt || undefined,
          aspect_ratio: aspectRatio,
          duration: `${duration}s`,
          ...(imageUrl ? { image_url: imageUrl } : {}),
        };
      }

      return {
        prompt: prompt || undefined,
        image_url: imageUrl || undefined,
        audio_url: audioAsset?.url || undefined,
        duration,
        aspect_ratio: aspectRatio,
        fps,
        guidance_scale: guidanceScale,
      };
    };

    generateMutation.mutate(buildInputParams());
  };

  const credits = wallet?.balance || 0;
  const creditColor =
    credits >= 30 ? "#10B981" : credits >= 10 ? "#F59E0B" : "#EF4444";

  const isGenerating = generateMutation.isPending || !!generatingJobId;
  const canGenerate = !isGenerating && (modelRequiresImage ? !!imageUrl : !!(prompt || imageUrl));

  return (
    <div
      style={{
        background: "#09090F",
        minHeight: "100vh",
        color: "#F0F0FF",
        fontFamily: "'Inter', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── STUDIO HEADER ── */}
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
            maxWidth: 1400,
            margin: "0 auto",
            padding: "0 24px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          {/* Left: Back + Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F0FF")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
            >
              <ArrowLeft size={16} />
              <span>Studio</span>
            </button>
            <div
              style={{
                width: 1,
                height: 24,
                background: "rgba(255,255,255,0.1)",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                  AI Video Studio
                </h1>
                <p style={{ margin: 0, fontSize: 11, color: "#6B7280", lineHeight: 1 }}>
                  {selectedModelData?.name || "Select a model"}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Credits + Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Credit Pills */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${creditColor}40`,
              }}
            >
              <Coins size={14} color={creditColor} />
              <span style={{ fontSize: 14, fontWeight: 600, color: creditColor }}>
                {credits}
              </span>
              <span style={{ fontSize: 12, color: "#6B7280" }}>credits</span>
            </div>

            <button
              onClick={() => setShowTransactions(true)}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#9CA3AF",
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "#F0F0FF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.color = "#9CA3AF";
              }}
            >
              Transactions
            </button>

            <button
              onClick={() => navigate(createPageUrl("StudioSubscribe"))}
              style={{
                padding: "7px 16px",
                borderRadius: 8,
                background: "linear-gradient(135deg, #7C3AED, #8B5CF6)",
                border: "none",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(139,92,246,0.3)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow = "0 0 24px rgba(139,92,246,0.5)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow = "0 0 16px rgba(139,92,246,0.3)")
              }
            >
              + Add Credits
            </button>
          </div>
        </div>
      </header>

      <WalletTransactionsDialog open={showTransactions} onOpenChange={setShowTransactions} />

      {/* ── MAIN WORKSPACE ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          maxWidth: 1400,
          width: "100%",
          margin: "0 auto",
          padding: "24px",
          gap: 24,
          boxSizing: "border-box",
        }}
      >
        {/* ── LEFT: PROMPT FORGE ── */}
        <div
          style={{
            width: 420,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          <div
            style={{
              background: "linear-gradient(180deg, #12121C 0%, #10101A 100%)",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: 20,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Panel Header */}
            <div
              style={{
                padding: "20px 24px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(241,139,106,0.05))",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={16} color="#C084FC" />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    background: "linear-gradient(90deg, #C084FC, #F18B6A)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Prompt Forge
                </span>
              </div>
            </div>

            <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>

              {/* ── MODEL SELECTOR ── */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9CA3AF", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  AI Model
                </label>
                <Select value={selectedModel} onValueChange={(v) => {
                  setSelectedModel(v);
                  const m = videoModels.find((m) => m.id === v);
                  if (m?.duration?.[0]) setDuration(m.duration[0]);
                }}>
                  <SelectTrigger
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(139,92,246,0.3)",
                      borderRadius: 12,
                      color: "#F0F0FF",
                      height: 48,
                      paddingLeft: 14,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{selectedModelData?.icon}</span>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedModelData?.name}</div>
                        <div style={{ fontSize: 11, color: "#6B7280" }}>{selectedModelData?.cost} credits</div>
                      </div>
                    </div>
                  </SelectTrigger>
                  <SelectContent style={{ background: "#1A1A2E", border: "1px solid rgba(139,92,246,0.3)" }}>
                    {videoModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                          <span style={{ fontSize: 20 }}>{model.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: "#F0F0FF", fontSize: 14 }}>{model.name}</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                              {model.cost} credits · {model.description}
                            </div>
                          </div>
                          {model.tag && (
                            <span style={{
                              marginLeft: "auto",
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: `${model.tagColor}20`,
                              color: model.tagColor,
                              border: `1px solid ${model.tagColor}40`,
                            }}>
                              {model.tag}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ── PROMPT TEXTAREA ── */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9CA3AF", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Describe Your Vision
                </label>
                <div style={{ position: "relative" }}>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={promptSuggestions[suggestionIdx]}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1.5px solid rgba(139,92,246,0.25)",
                      borderRadius: 14,
                      color: "#F0F0FF",
                      minHeight: 140,
                      resize: "none",
                      fontSize: 14,
                      lineHeight: 1.6,
                      padding: "14px 16px",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(139,92,246,0.7)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1), 0 0 20px rgba(139,92,246,0.08)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(139,92,246,0.25)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: "#4B5563" }}>
                      {prompt.length} chars
                    </span>
                  </div>
                </div>
              </div>

              {/* ── ASSETS SECTION ── */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9CA3AF", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Assets{" "}
                  {modelRequiresImage ? (
                    <span style={{ color: "#6366F1", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>(image required)</span>
                  ) : modelSupportsImage ? (
                    <span style={{ color: "#4B5563", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(image optional)</span>
                  ) : (
                    <span style={{ color: "#4B5563", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(text-to-video model)</span>
                  )}
                </label>
                {!modelSupportsImage && !selectedModelData?.supportsAudio && (
                  <p style={{ margin: "0 0 8px", fontSize: 11, color: "#6B7280" }}>
                    The selected model generates from text only. Switch to an Image→Video model to use image assets.
                  </p>
                )}


                {/* ── Selected assets chips (with compat badge) ── */}
                {selectedAssets.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                    {selectedAssets.map(asset => {
                      const isSupported =
                        asset.type === "image" ? !!modelSupportsImage :
                          asset.type === "audio" ? !!selectedModelData?.supportsExternalAudio :
                            false;

                      const isNativeOnly =
                        asset.type === "audio" &&
                        selectedModelData?.supportsAudio &&
                        !selectedModelData?.supportsExternalAudio;

                      return (
                        <div
                          key={asset.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: isSupported ? "rgba(139,92,246,0.08)" : isNativeOnly ? "rgba(245,158,11,0.06)" : "rgba(239,68,68,0.04)",
                            border: `1px solid ${isSupported ? "rgba(139,92,246,0.25)" : isNativeOnly ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.2)"}`,
                            borderRadius: 10,
                            padding: "8px 10px",
                          }}
                        >
                          {asset.type === "image" ? (
                            <img
                              src={asset.url}
                              alt={asset.name}
                              style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span>🎵</span>
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, color: "#E5E7EB", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.name}</p>
                            {asset.campaign_name && (
                              <p style={{ margin: 0, fontSize: 10, color: "#6B7280" }}>{asset.campaign_name}</p>
                            )}
                            <p style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 600, color: isSupported ? "#10B981" : isNativeOnly ? "#F59E0B" : "#EF4444" }}>
                              {isSupported ? "✓ Will be used" : isNativeOnly ? "⚠ Model generates its own AI sound (ignores this file)" : "✕ Not supported by this model"}
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedAssets(prev => prev.filter(a => a.id !== asset.id))}
                            style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer", padding: 4, flexShrink: 0 }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Add Assets button ── */}
                <button
                  onClick={() => setAssetPickerOpen(true)}
                  style={{
                    width: "100%",
                    border: "2px dashed rgba(255,255,255,0.1)",
                    borderRadius: 14,
                    padding: "20px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.02)",
                    transition: "all 0.2s",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Upload size={16} color="#8B5CF6" />
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>
                    {selectedAssets.length > 0 ? "Add more assets" : "Upload or pick from"}{" "}
                    <span style={{ color: "#C084FC", fontWeight: 600 }}>Licensed Assets</span>
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "#4B5563" }}>
                    Images (PNG, JPG, WEBP) · Audio (MP3, WAV, M4A)
                  </p>
                </button>

                {/* Asset Picker Modal */}
                <StudioAssetPicker
                  open={assetPickerOpen}
                  onClose={() => setAssetPickerOpen(false)}
                  selectedAssets={selectedAssets}
                  onChange={setSelectedAssets}
                />
              </div>


              {/* ── DURATION ── */}
              {selectedModelData && selectedModelData.duration.length > 1 && (
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9CA3AF", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Duration
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {selectedModelData.duration.map((d) => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        style={{
                          flex: 1,
                          padding: "10px 0",
                          borderRadius: 10,
                          border: duration === d
                            ? "1.5px solid rgba(139,92,246,0.7)"
                            : "1.5px solid rgba(255,255,255,0.08)",
                          background: duration === d
                            ? "rgba(139,92,246,0.15)"
                            : "rgba(255,255,255,0.03)",
                          color: duration === d ? "#C084FC" : "#6B7280",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── ASPECT RATIO ── */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9CA3AF", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Aspect Ratio
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {aspectRatios.map((ar) => (
                    <button
                      key={ar.value}
                      onClick={() => setAspectRatio(ar.value)}
                      style={{
                        flex: "1 1 0",
                        minWidth: 60,
                        padding: "10px 6px 8px",
                        borderRadius: 10,
                        border: aspectRatio === ar.value
                          ? "1.5px solid rgba(139,92,246,0.7)"
                          : "1.5px solid rgba(255,255,255,0.08)",
                        background: aspectRatio === ar.value
                          ? "rgba(139,92,246,0.15)"
                          : "rgba(255,255,255,0.03)",
                        color: aspectRatio === ar.value ? "#C084FC" : "#6B7280",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div style={{
                        width: ar.value === "9:16" ? 12 : ar.value === "1:1" ? 16 : ar.value === "4:3" ? 20 : ar.value === "21:9" ? 28 : 24,
                        height: ar.value === "9:16" ? 20 : ar.value === "1:1" ? 16 : ar.value === "4:3" ? 15 : ar.value === "21:9" ? 12 : 14,
                        borderRadius: 3,
                        border: `2px solid ${aspectRatio === ar.value ? "#C084FC" : "#4B5563"}`,
                        transition: "border-color 0.2s",
                      }} />
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.02em" }}>{ar.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── ADVANCED SETTINGS ── */}
              <div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.02)",
                    color: "#9CA3AF",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <span>Advanced Settings</span>
                  {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showAdvanced && (
                  <div style={{ marginTop: 12, padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF" }}>FPS</label>
                        <span style={{ fontSize: 12, color: "#C084FC", fontWeight: 600 }}>{fps}</span>
                      </div>
                      <Slider value={[fps]} onValueChange={([v]) => setFps(v)} min={6} max={30} step={6} className="w-full" />
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF" }}>Guidance Scale</label>
                        <span style={{ fontSize: 12, color: "#C084FC", fontWeight: 600 }}>{guidanceScale.toFixed(1)}</span>
                      </div>
                      <Slider value={[guidanceScale]} onValueChange={([v]) => setGuidanceScale(v)} min={1} max={15} step={0.5} className="w-full" />
                    </div>
                  </div>
                )}
              </div>

              {/* ── GENERATE CTA ── */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                style={{
                  width: "100%",
                  height: 54,
                  borderRadius: 14,
                  border: "none",
                  background: canGenerate
                    ? "linear-gradient(135deg, #7C3AED 0%, #8B5CF6 40%, #F18B6A 100%)"
                    : "rgba(255,255,255,0.06)",
                  color: canGenerate ? "#fff" : "#4B5563",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: canGenerate ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  boxShadow: canGenerate ? "0 4px 24px rgba(139,92,246,0.4)" : "none",
                  transition: "all 0.3s",
                  letterSpacing: "0.02em",
                }}
                onMouseEnter={(e) => {
                  if (canGenerate) {
                    e.currentTarget.style.boxShadow = "0 4px 32px rgba(139,92,246,0.6)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (canGenerate) {
                    e.currentTarget.style.boxShadow = "0 4px 24px rgba(139,92,246,0.4)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                    Generating your video…
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    Generate · {selectedModelData?.cost} credits
                  </>
                )}
              </button>

            </div>
          </div>
        </div>

        {/* ── RIGHT: VIDEO GALLERY ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>

          {/* Gallery Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Film size={20} color="#C084FC" />
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#F0F0FF" }}>
                Recent Creations
              </h2>
              {generations && generations.length > 0 && (
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "2px 10px",
                  borderRadius: 999,
                  background: "rgba(139,92,246,0.15)",
                  color: "#C084FC",
                  border: "1px solid rgba(139,92,246,0.3)",
                }}>
                  {generations.length}
                </span>
              )}
            </div>
            {isGenerating && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(139,92,246,0.1)",
                border: "1px solid rgba(139,92,246,0.3)",
              }}>
                <Loader2 size={14} color="#C084FC" style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 12, color: "#C084FC", fontWeight: 600 }}>Creating…</span>
              </div>
            )}
          </div>

          {/* Gallery Grid */}
          {generations && generations.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 16,
              }}
            >
              {(generations as StudioGenerationRow[]).map((gen) => {
                const model = videoModels.find((m) => m.id === gen.model);
                const statusColor =
                  gen.status === "completed"
                    ? "#10B981"
                    : gen.status === "failed"
                      ? "#EF4444"
                      : "#8B5CF6";

                return (
                  <div
                    key={gen.id}
                    style={{
                      background: "#12121C",
                      border: "1px solid rgba(139,92,246,0.15)",
                      borderRadius: 16,
                      overflow: "hidden",
                      transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(139,92,246,0.15)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Status bar */}
                    <div style={{ height: 3, background: `${statusColor}40`, position: "relative" }}>
                      <div style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        height: "100%",
                        width: gen.status === "completed" ? "100%" : gen.status === "processing" ? "60%" : "100%",
                        background: statusColor,
                        transition: "width 1s ease",
                      }} />
                    </div>

                    <div style={{ padding: 16 }}>
                      {/* Card header */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 14 }}>{model?.icon || "🎬"}</span>
                            <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>
                              {model?.name || gen.model}
                            </span>
                          </div>
                          {gen.input_params?.prompt && (
                            <p style={{
                              margin: 0,
                              fontSize: 13,
                              color: "#D1D5DB",
                              lineHeight: 1.4,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}>
                              {gen.input_params.prompt}
                            </p>
                          )}
                        </div>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 999,
                          background: `${statusColor}15`,
                          color: statusColor,
                          border: `1px solid ${statusColor}30`,
                          flexShrink: 0,
                          textTransform: "capitalize",
                        }}>
                          {gen.status}
                        </span>
                      </div>

                      {/* Video / State */}
                      {gen.status === "completed" && gen.output_urls?.[0] && (
                        <div>
                          <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", position: "relative" }}>
                            <video
                              src={gen.output_urls[0]}
                              controls
                              style={{ width: "100%", display: "block", maxHeight: 220, objectFit: "cover" }}
                            />
                          </div>
                          <button
                            onClick={() => window.open(gen.output_urls?.[0], "_blank")}
                            style={{
                              marginTop: 10,
                              width: "100%",
                              padding: "9px 0",
                              borderRadius: 10,
                              border: "1px solid rgba(139,92,246,0.3)",
                              background: "rgba(139,92,246,0.08)",
                              color: "#C084FC",
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(139,92,246,0.16)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(139,92,246,0.08)";
                            }}
                          >
                            <Download size={14} />
                            Download
                          </button>
                        </div>
                      )}

                      {gen.status === "processing" && (
                        <div style={{
                          borderRadius: 10,
                          border: "1px solid rgba(139,92,246,0.15)",
                          background: "rgba(139,92,246,0.05)",
                          padding: "36px 0",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 10,
                        }}>
                          <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            background: "rgba(139,92,246,0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                            <Loader2 size={22} color="#8B5CF6" style={{ animation: "spin 1s linear infinite" }} />
                          </div>
                          <p style={{ margin: 0, fontSize: 13, color: "#8B5CF6", fontWeight: 600 }}>Rendering…</p>
                          <p style={{ margin: 0, fontSize: 11, color: "#4B5563" }}>This may take a moment</p>
                        </div>
                      )}

                      {gen.status === "failed" && (
                        <div style={{
                          borderRadius: 10,
                          border: "1px solid rgba(239,68,68,0.2)",
                          background: "rgba(239,68,68,0.05)",
                          padding: "20px 0",
                          textAlign: "center",
                        }}>
                          <p style={{ margin: 0, fontSize: 13, color: "#EF4444" }}>Generation failed</p>
                        </div>
                      )}

                      {/* Footer */}
                      <div style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Coins size={11} color="#F59E0B" />
                          <span style={{ fontSize: 11, color: "#6B7280" }}>{gen.credits_used} credits</span>
                        </div>
                        <span style={{ fontSize: 11, color: "#4B5563" }}>
                          {new Date(gen.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 40px",
              textAlign: "center",
              background: "linear-gradient(135deg, #12121C, #10101A)",
              borderRadius: 20,
              border: "1px dashed rgba(139,92,246,0.2)",
            }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(241,139,106,0.1))",
                border: "1px solid rgba(139,92,246,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                fontSize: 36,
              }}>
                🎬
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#D1D5DB" }}>
                Your studio awaits
              </h3>
              <p style={{ margin: "0 0 28px", fontSize: 14, color: "#4B5563", maxWidth: 320, lineHeight: 1.6 }}>
                Write a prompt in the Prompt Forge panel and hit Generate to create your first AI video.
              </p>
              <button
                onClick={() => document.querySelector("textarea")?.focus()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 24px",
                  borderRadius: 12,
                  border: "1px solid rgba(139,92,246,0.4)",
                  background: "rgba(139,92,246,0.1)",
                  color: "#C084FC",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139,92,246,0.18)";
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(139,92,246,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(139,92,246,0.1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <Sparkles size={16} />
                Start Creating
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SPIN KEYFRAMES ── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── NO CREDITS MODAL ── */}
      {showSubscriptionModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(10px)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}>
          <div style={{
            maxWidth: 420,
            width: "100%",
            background: "#12121C",
            border: "1px solid rgba(139,92,246,0.3)",
            borderRadius: 24,
            padding: 40,
            textAlign: "center",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.15)",
          }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(135deg, #7C3AED, #F18B6A)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: 32,
            }}>
              🪙
            </div>
            <h3 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 700, color: "#F0F0FF" }}>
              You're out of credits
            </h3>
            <p style={{ margin: "0 0 32px", fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>
              Top up your wallet to keep creating amazing AI videos.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowSubscriptionModal(false)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#9CA3AF",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowSubscriptionModal(false); navigate(createPageUrl("StudioSubscribe")); }}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #7C3AED, #8B5CF6)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
                }}
              >
                Get Credits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
