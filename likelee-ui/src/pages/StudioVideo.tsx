import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  StudioAssetPicker,
  StudioAsset,
} from "@/components/studio/StudioAssetPicker";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
    id: "fal-ai/sora-2/image-to-video",
    name: "Sora 2",
    cost: 30,
    description: "OpenAI's latest cinematic engine (Image-to-Video)",
    duration: [5, 10],
    icon: "🎥",
    tag: "Beta",
    tagColor: "#F59E0B",
    supportsImage: true,
    requiresImage: true,
    supportsAudio: false,
    supportsExternalAudio: false,
  },
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

const StudioVideo = () => {
  const [prompt, setPrompt] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<StudioAsset[]>([]);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(videoModels[0].id);
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [fps, setFps] = useState(24);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [enableAudio, setEnableAudio] = useState(true);
  const [resolution, setResolution] = useState("720p");
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
      queryClient.invalidateQueries({
        queryKey: ["studio", "generations", "video"],
      });
      pollJobStatus(result.generation_id);
    },
    onError: (error: any) => {
      const errorMessage = error.message?.toLowerCase();
      const statusCode = error.status;
      if (
        errorMessage?.includes("insufficient credits") ||
        statusCode === 402
      ) {
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
        queryClient.invalidateQueries({
          queryKey: ["studio", "generations", "video"],
        });
        return;
      }
      try {
        const statusResult = await getJobStatus(jobId);
        const isDone =
          statusResult.status === "failed" ||
          (statusResult.status === "completed" &&
            (statusResult.output_urls ?? []).length > 0);
        if (isDone) {
          clearInterval(interval);
          setGeneratingJobId(null);
          queryClient.invalidateQueries({
            queryKey: ["studio", "generations", "video"],
          });
          queryClient.invalidateQueries({ queryKey: ["studio", "wallet"] });
        }
      } catch (error) {
        clearInterval(interval);
        setGeneratingJobId(null);
      }
    }, 3000);
  };

  // Auto-poll for jobs that are in "processing" state (useful after refresh)
  useEffect(() => {
    const processingJob = generations?.find((g) => g.status === "processing");
    if (processingJob && !generatingJobId) {
      console.log(
        "Found processing job in history, resuming poll:",
        processingJob.id,
      );
      setGeneratingJobId(processingJob.id);
      pollJobStatus(processingJob.id);
    }
  }, [generations, generatingJobId]);

  const selectedModelData = videoModels.find((m) => m.id === selectedModel);
  const modelRequiresImage = selectedModelData?.requiresImage ?? false;
  const modelSupportsImage = selectedModelData?.supportsImage ?? false;

  // Derived from selectedAssets
  const primaryImage = selectedAssets.find((a) => a.type === "image");
  const audioAsset = selectedAssets.find((a) => a.type === "audio");
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
      const isMiniMaxI2V =
        selectedModel === "fal-ai/minimax/video-01-live/image-to-video";
      const isVeo = selectedModel.includes("veo");

      if (isVeo) {
        const validAspect = ["16:9", "9:16"].includes(aspectRatio)
          ? aspectRatio
          : "16:9";
        const durationValue =
          typeof duration === "number" ? duration : parseInt(duration);
        const durationEnum =
          durationValue <= 4 ? "4s" : durationValue <= 6 ? "6s" : "8s";
        return {
          prompt: prompt || undefined,
          image_url: imageUrl || undefined,
          aspect_ratio: validAspect,
          duration: durationEnum,
          generate_audio: enableAudio, // Use state instead of literal true
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

      if (isVeo) {
        return {
          first_frame_image: imageUrl,
          prompt: prompt || undefined,
          generate_audio: enableAudio,
          aspect_ratio: aspectRatio,
          resolution: resolution,
        };
      }

      if (isLuma) {
        return {
          prompt: prompt || undefined,
          aspect_ratio: aspectRatio,
          resolution: resolution,
          ...(imageUrl ? { image_url: imageUrl } : {}),
        };
      }

      if (isVidu) {
        return {
          prompt: prompt || undefined,
          aspect_ratio: aspectRatio,
          duration: `${duration}s`,
          resolution: resolution,
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
        enable_audio: enableAudio,
        resolution: resolution,
      };
    };

    generateMutation.mutate(buildInputParams());
  };

  const credits = wallet?.balance || 0;
  const creditColor =
    credits >= 30 ? "#10B981" : credits >= 10 ? "#F59E0B" : "#EF4444";

  const isGenerating = generateMutation.isPending || !!generatingJobId;
  const canGenerate =
    !isGenerating && (modelRequiresImage ? !!imageUrl : !!(prompt || imageUrl));

  return (
    <div
      style={{
        background: "#0A0A0F",
        minHeight: "100vh",
        color: "#fff",
        fontFamily: "'Inter', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── STUDIO HEADER ── */}
      <header
        style={{
          height: 80,
          background: "#0A0A0F",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 100,
          position: "sticky",
          top: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
            }}
            onClick={() => navigate(createPageUrl("Studio"))}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                width: 40,
                height: 40,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
              }}
            >
              <Film size={22} color="#fff" />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: "-0.02em",
                }}
              >
                StudioVideo
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#10B981",
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#94A3B8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  AI Engine Active
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => setShowTransactions(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <Coins size={16} color="#F59E0B" />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                {credits}
              </span>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>Credits</span>
            </button>

            <button
              onClick={() => navigate(createPageUrl("StudioSubscribe"))}
              style={{
                padding: "10px 20px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #F18B6A 0%, #E07A5A 100%)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(241,139,106,0.25)",
                transition: "all 0.2s",
              }}
            >
              + Add Credits
            </button>
          </div>
        </div>
      </header>

      <WalletTransactionsDialog
        open={showTransactions}
        onOpenChange={setShowTransactions}
      />

      {/* ── SPLIT VIEW CONTAINER ── */}
      {/* ── SPLIT VIEW CONTAINER ── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          background: "#0A0A0F",
        }}
      >
        {/* ── LEFT: SIDEBAR (Scrollable CONFIG) ── */}
        <aside
          style={{
            width: 420,
            flexShrink: 0,
            background: "#111116",
            borderRight: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "10px 0 30px rgba(0,0,0,0.2)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "32px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 32,
            }}
          >
            {/* Title */}
            <div>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#fff",
                  marginBottom: 6,
                  letterSpacing: "-0.02em",
                }}
              >
                Configuration
              </h2>
              <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.5 }}>
                Tweak parameters to perfect your AI generation.
              </p>
            </div>

            {/* ── MODEL SELECTOR ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#6B7280",
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Select AI Model
                </label>
                <Select
                  value={selectedModel}
                  onValueChange={(v) => {
                    setSelectedModel(v);
                    const m = videoModels.find((m) => m.id === v);
                    if (m?.duration?.[0]) setDuration(m.duration[0]);
                  }}
                >
                  <SelectTrigger
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 12,
                      color: "#fff",
                      height: 52,
                      padding: "0 16px",
                      boxShadow: "none",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <span style={{ fontSize: 20 }}>
                        {selectedModelData?.icon}
                      </span>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {selectedModelData?.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#94A3B8" }}>
                          {selectedModelData?.cost} credits
                        </div>
                      </div>
                    </div>
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      background: "#111116",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 12,
                      boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                    }}
                  >
                    {videoModels.map((model) => (
                      <SelectItem
                        key={model.id}
                        value={model.id}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          color: "#fff",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <span style={{ fontSize: 20 }}>{model.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                color: "#fff",
                                fontSize: 14,
                              }}
                            >
                              {model.name}
                            </div>
                            <div style={{ fontSize: 11, color: "#94A3B8" }}>
                              {model.cost} credits · {model.description}
                            </div>
                          </div>
                          {model.tag && (
                            <span
                              style={{
                                marginLeft: "auto",
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 999,
                                background: `${model.tagColor}15`,
                                color: model.tagColor,
                                border: `1px solid ${model.tagColor}30`,
                              }}
                            >
                              {model.tag}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ── PROMPT AREA ── */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginBottom: 10,
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#94A3B8",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Prompt
                  </label>
                  <span
                    style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500 }}
                  >
                    {prompt.length} / 1000
                  </span>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
                  placeholder={promptSuggestions[suggestionIdx]}
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 14,
                    color: "#fff",
                    minHeight: 120,
                    padding: "16px",
                    fontSize: 14,
                    lineHeight: 1.6,
                    resize: "none",
                    boxShadow: "none",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.background = "rgba(255, 255, 255, 0.05)";
                    e.target.style.borderColor = "#8B5CF6";
                    e.target.style.boxShadow =
                      "0 0 0 4px rgba(139,92,246,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.background = "rgba(255, 255, 255, 0.02)";
                    e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* ── ASSETS ── */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#94A3B8",
                    marginBottom: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Assets
                </label>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {selectedAssets.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {selectedAssets.map((asset, index) => {
                          const isImage = asset.type === "image";
                          const label = isImage
                            ? index === 0
                              ? "Start Frame"
                              : index === 1
                                ? "End Frame"
                                : "Reference"
                            : "Audio";
                          return (
                            <div
                              key={asset.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "10px",
                                background: "rgba(255, 255, 255, 0.02)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                borderRadius: 12,
                                position: "relative",
                              }}
                            >
                              {isImage ? (
                                <img
                                  src={asset.url}
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 8,
                                    objectFit: "cover",
                                  }}
                                  alt=""
                                />
                              ) : (
                                <div
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 8,
                                    background: "rgba(139,92,246,0.1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Film size={20} color="#8B5CF6" />
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                  }}
                                >
                                  <Badge
                                    variant="outline"
                                    style={{
                                      height: 18,
                                      fontSize: 9,
                                      fontWeight: 700,
                                      padding: "0 6px",
                                      background: "rgba(255, 255, 255, 0.05)",
                                      color: "#94A3B8",
                                      border:
                                        "1px solid rgba(255, 255, 255, 0.1)",
                                    }}
                                  >
                                    {label}
                                  </Badge>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: "#fff",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {asset.name}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  setSelectedAssets((prev) =>
                                    prev.filter((a) => a.id !== asset.id),
                                  )
                                }
                                style={{
                                  color: "#94A3B8",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: 4,
                                }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {selectedAssets.filter((a) => a.type === "image")
                        .length === 2 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const images = selectedAssets.filter(
                              (a) => a.type === "image",
                            );
                            const nonImages = selectedAssets.filter(
                              (a) => a.type !== "image",
                            );
                            setSelectedAssets([
                              ...images.reverse(),
                              ...nonImages,
                            ]);
                          }}
                          style={{
                            height: 32,
                            fontSize: 11,
                            gap: 6,
                            borderRadius: 8,
                          }}
                        >
                          <Zap size={12} />
                          Swap Frames
                        </Button>
                      )}
                    </div>
                  ) : null}

                  <button
                    onClick={() => setAssetPickerOpen(true)}
                    style={{
                      width: "100%",
                      padding: "20px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "2px dashed rgba(255, 255, 255, 0.1)",
                      borderRadius: 14,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#8B5CF6";
                      e.currentTarget.style.background =
                        "rgba(139,92,246,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(255, 255, 255, 0.1)";
                      e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.02)";
                    }}
                  >
                    <Upload size={20} color="#94A3B8" />
                    <div style={{ textAlign: "center" }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#fff",
                        }}
                      >
                        Add Media
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: "#94A3B8" }}>
                        Upload or select legacy assets
                      </p>
                    </div>
                  </button>
                </div>

                {/* ── SETTINGS: ASPECT RATIO & DURATION ── */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#94A3B8",
                        marginBottom: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Orientation
                    </label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger
                        style={{
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: 12,
                          height: 48,
                          boxShadow: "none",
                          color: "#fff",
                        }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        style={{
                          background: "#111116",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: 12,
                        }}
                      >
                        {aspectRatios.map((ar) => (
                          <SelectItem
                            key={ar.value}
                            value={ar.value}
                            style={{ borderRadius: 8, color: "#fff" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <div
                                className={`${ar.shape} bg-slate-700 rounded-sm border border-slate-600`}
                              />
                              <span>
                                {ar.label}{" "}
                                <span style={{ opacity: 0.5, fontSize: 11 }}>
                                  ({ar.hint})
                                </span>
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#94A3B8",
                        marginBottom: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Duration
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        height: 48,
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: 12,
                        padding: "0 12px",
                      }}
                    >
                      <input
                        type="range"
                        min={
                          videoModels.find((m) => m.id === selectedModel)
                            ?.duration?.[0] || 5
                        }
                        max={
                          videoModels.find((m) => m.id === selectedModel)
                            ?.duration?.[1] || 10
                        }
                        step={1}
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        style={{
                          flex: 1,
                          accentColor: "#8B5CF6",
                          cursor: "pointer",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#fff",
                          minWidth: 32,
                        }}
                      >
                        {duration}s
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── ADDITIONAL CONTROLS: AUDIO & RESOLUTION ── */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                  padding: "8px 0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "rgba(255, 255, 255, 0.02)",
                    padding: "16px",
                    borderRadius: 16,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <Label
                      htmlFor="audio-toggle"
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Generate Audio
                    </Label>
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>
                      Model-generated synchronized sound
                    </span>
                  </div>
                  <Switch
                    id="audio-toggle"
                    checked={enableAudio}
                    onCheckedChange={setEnableAudio}
                    disabled={!selectedModelData?.supportsAudio}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#94A3B8",
                      marginBottom: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Output Quality
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["480p", "720p", "1080p"].map((res) => (
                      <button
                        key={res}
                        onClick={() => setResolution(res)}
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: 10,
                          border:
                            resolution === res
                              ? "1px solid #8B5CF6"
                              : "1px solid rgba(255,255,255,0.1)",
                          background:
                            resolution === res
                              ? "rgba(139,92,246,0.15)"
                              : "rgba(255,255,255,0.05)",
                          color: resolution === res ? "#fff" : "#94A3B8",
                          fontSize: 13,
                          fontWeight: 600,
                          transition: "all 0.2s",
                          cursor: "pointer",
                        }}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Footer (Generate Button) */}
          <div
            style={{
              padding: "24px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              background: "#111116",
            }}
          >
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                background: "rgba(139,92,246,0.05)",
                border: "1px solid rgba(139,92,246,0.1)",
                borderRadius: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "#94A3B8" }}>
                Estimated Cost
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#8B5CF6" }}>
                {selectedModelData?.cost} Credits
              </span>
            </div>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{
                width: "100%",
                height: 54,
                borderRadius: 14,
                border: "none",
                background: canGenerate
                  ? "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
                  : "rgba(255, 255, 255, 0.05)",
                color: canGenerate ? "#fff" : "#94A3B8",
                fontSize: 16,
                fontWeight: 700,
                cursor: canGenerate ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: canGenerate
                  ? "0 4px 12px rgba(139,92,246,0.2)"
                  : "none",
                transition: "all 0.2s",
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2
                    size={18}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  Generating...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Generate Video
                </>
              )}
            </button>
          </div>
        </aside>

        {/* ── RIGHT: PREVIEW AREA (The Stage) ── */}
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            background: "#0A0A0F",
            overflow: "hidden",
          }}
        >
          {/* Header for preview */}
          <div
            style={{
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              background: "#111116",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                margin: 0,
              }}
            >
              Preview Output
            </h3>
            <div style={{ display: "flex", gap: 12 }}>
              <Badge
                variant="outline"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "none",
                  color: "#94A3B8",
                }}
              >
                {aspectRatio}
              </Badge>
              <Badge
                variant="outline"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "none",
                  color: "#94A3B8",
                }}
              >
                {duration}s
              </Badge>
            </div>
          </div>

          {/* Workspace content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                padding: "40px 40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 450,
              }}
            >
              <Card
                style={{
                  width: "100%",
                  maxWidth: 800,
                  aspectRatio:
                    aspectRatio === "16:9"
                      ? "16/9"
                      : aspectRatio === "9:16"
                        ? "9/16"
                        : "1/1",
                  background: "#111116",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 24,
                  boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                  overflow: "hidden",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {!isGenerating && !generatingJobId ? (
                  (() => {
                    const lastCompleted = generations?.find(
                      (g) => g.status === "completed" && g.output_urls?.[0],
                    );
                    return lastCompleted ? (
                      <video
                        key={lastCompleted.id}
                        src={lastCompleted.output_urls[0]}
                        controls
                        autoPlay
                        loop
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <div style={{ textAlign: "center", padding: 40 }}>
                        <div
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 24,
                            background: "rgba(139,92,246,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 24px",
                          }}
                        >
                          <ImageIcon size={32} color="#8B5CF6" />
                        </div>
                        <h4
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: "#fff",
                            marginBottom: 8,
                          }}
                        >
                          Ready to Create
                        </h4>
                        <p
                          style={{
                            fontSize: 14,
                            color: "#94A3B8",
                            maxWidth: 280,
                            margin: "0 auto",
                          }}
                        >
                          Configure parameters and click "Generate Video" to
                          start.
                        </p>
                      </div>
                    );
                  })()
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 40,
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {/* Check if the job we are waiting for is in the generations list and completed */}
                    {generations?.find((g) => g.id === generatingJobId)
                      ?.status === "completed" &&
                    generations?.find((g) => g.id === generatingJobId)
                      ?.output_urls?.[0] ? (
                      <video
                        src={
                          generations?.find((g) => g.id === generatingJobId)
                            ?.output_urls[0]
                        }
                        controls
                        autoPlay
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <div>
                        <div
                          style={{
                            position: "relative",
                            width: 100,
                            height: 100,
                            margin: "0 auto 24px",
                          }}
                        >
                          <Loader2
                            size={48}
                            className="animate-spin"
                            style={{
                              position: "absolute",
                              top: "25%",
                              left: "25%",
                              color: "#8B5CF6",
                            }}
                          />
                          <svg
                            style={{
                              transform: "rotate(-90deg)",
                              width: "100%",
                              height: "100%",
                            }}
                          >
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              fill="none"
                              stroke="rgba(255, 255, 255, 0.05)"
                              strokeWidth="6"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              fill="none"
                              stroke="#8B5CF6"
                              strokeWidth="6"
                              strokeDasharray="282.7"
                              strokeDashoffset={282.7 * (1 - 0.45)}
                              strokeLinecap="round"
                              className="animate-pulse"
                            />
                          </svg>
                        </div>
                        <h4
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: "#fff",
                            marginBottom: 8,
                          }}
                        >
                          Generating Video...
                        </h4>
                        <p style={{ fontSize: 13, color: "#94A3B8" }}>
                          Processing your request on the AI cluster.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* ── RECENT ARTIFACTS GALLERY ── */}
            <div style={{ padding: "0 40px 60px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 24,
                  paddingBottom: 16,
                  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Sparkles size={18} color="#8B5CF6" />
                  Recent Artifacts
                </h2>
                <Badge
                  variant="outline"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#94A3B8",
                  }}
                >
                  {generations?.length || 0} Total
                </Badge>
              </div>

              {generations && generations.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: 20,
                  }}
                >
                  {generations.map((gen) => (
                    <Card
                      key={gen.id}
                      style={{
                        background: "#16161D",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 16,
                        overflow: "hidden",
                        transition: "transform 0.2s, border-color 0.2s",
                        cursor:
                          gen.status === "completed" ? "pointer" : "default",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(139,92,246,0.3)";
                        e.currentTarget.style.transform = "translateY(-4px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.06)";
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          aspectRatio: "16/9",
                          background: "#000",
                        }}
                      >
                        {gen.status === "completed" && gen.output_urls?.[0] ? (
                          <video
                            src={gen.output_urls[0]}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            onMouseEnter={(e) =>
                              (e.target as HTMLVideoElement).play()
                            }
                            onMouseLeave={(e) => {
                              (e.target as HTMLVideoElement).pause();
                              (e.target as HTMLVideoElement).currentTime = 0;
                            }}
                            muted
                            loop
                          />
                        ) : gen.status === "processing" ? (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 12,
                              background: "rgba(139,92,246,0.05)",
                            }}
                          >
                            <Loader2
                              size={24}
                              className="animate-spin"
                              color="#8B5CF6"
                            />
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#8B5CF6",
                                textTransform: "uppercase",
                              }}
                            >
                              Evolving...
                            </span>
                          </div>
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              background: "rgba(239, 68, 68, 0.05)",
                            }}
                          >
                            <X size={24} color="#EF4444" />
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#EF4444",
                                textTransform: "uppercase",
                              }}
                            >
                              Failed
                            </span>
                          </div>
                        )}

                        <div
                          style={{
                            position: "absolute",
                            top: 8,
                            left: 8,
                            display: "flex",
                            gap: 6,
                          }}
                        >
                          <Badge
                            variant="outline"
                            style={{
                              background: "rgba(0,0,0,0.5)",
                              border: "none",
                              color: "#fff",
                              fontSize: 9,
                            }}
                          >
                            {videoModels.find((m) => m.id === gen.model)
                              ?.name || "AI Video"}
                          </Badge>
                        </div>
                      </div>
                      <div style={{ padding: 12 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: "#94A3B8",
                            lineHeight: 1.4,
                            height: 34,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {gen.input_params?.prompt || "No prompt provided"}
                        </p>
                        <div
                          style={{
                            marginTop: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              color: "#4B5563",
                              fontWeight: 600,
                            }}
                          >
                            {new Date(gen.created_at).toLocaleDateString()}
                          </span>
                          {gen.status === "completed" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(gen.output_urls?.[0], "_blank");
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#6366F1",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <Download size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <Film
                    size={48}
                    color="rgba(255,255,255,0.05)"
                    style={{ margin: "0 auto 16px" }}
                  />
                  <p style={{ color: "#4B5563", fontSize: 14 }}>
                    No generations yet. Start by creating a video.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── SPIN KEYFRAMES ── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── NO CREDITS MODAL ── */}
      {showSubscriptionModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              background: "#12121C",
              border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: 24,
              padding: 40,
              textAlign: "center",
              boxShadow:
                "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.15)",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                background: "linear-gradient(135deg, #7C3AED, #F18B6A)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                fontSize: 32,
              }}
            >
              🪙
            </div>
            <h3
              style={{
                margin: "0 0 10px",
                fontSize: 22,
                fontWeight: 700,
                color: "#F0F0FF",
              }}
            >
              You're out of credits
            </h3>
            <p
              style={{
                margin: "0 0 32px",
                fontSize: 14,
                color: "#6B7280",
                lineHeight: 1.6,
              }}
            >
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
                onClick={() => {
                  setShowSubscriptionModal(false);
                  navigate(createPageUrl("StudioSubscribe"));
                }}
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

      <StudioAssetPicker
        open={assetPickerOpen}
        onClose={() => setAssetPickerOpen(false)}
        selectedAssets={selectedAssets}
        onChange={setSelectedAssets}
        allowedTypes={["image", "audio"]}
      />
    </div>
  );
};

export default StudioVideo;
