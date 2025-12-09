import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Film,
  Upload,
  Loader2,
  Download,
  Coins,
  ArrowLeft,
  Play,
  Sparkles,
  ChevronDown,
  Clock,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl } from "@/utils";

const imageToVideoModels = [
  {
    id: "pollo-1.6",
    name: "Pollo Image 1.6",
    icon: "🎬",
    description: "Pollo AI's advanced, versatile model",
    duration: "45 sec",
    badges: ["New"],
  },
  {
    id: "google-nano-banana",
    name: "Google Nano Banana",
    icon: "🍌",
    description: "Ultra-high character consistency",
    duration: "90 sec",
    badges: [],
  },
  {
    id: "midjourney",
    name: "Midjourney",
    icon: "🎨",
    description: "Flexible, detailed and vibrant image generation",
    duration: "60 sec",
    badges: ["New"],
  },
  {
    id: "seedream-4.0",
    name: "Seedream 4.0",
    icon: "📊",
    description: "Support images with cohesive styles",
    duration: "40 sec",
    badges: ["New"],
  },
  {
    id: "flux-dev",
    name: "Flux Dev",
    icon: "⚡",
    description: "For short and basic scenes",
    duration: "30 sec",
    badges: [],
  },
  {
    id: "qwen-image",
    name: "Qwen Image",
    icon: "🎭",
    description: "High quality image generation",
    duration: "35 sec",
    badges: ["New"],
  },
];

const aspectRatios = [
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "3:2", label: "3:2" },
  { value: "2:3", label: "2:3" },
  { value: "3:4", label: "3:4" },
  { value: "4:3", label: "4:3" },
  { value: "9:16", label: "9:16" },
];

export default function StudioImageToVideo() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedModel, setSelectedModel] = useState(imageToVideoModels[0].id);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [outputNumber, setOutputNumber] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [translatePrompt, setTranslatePrompt] = useState(false);
  const [generatingJobId, setGeneratingJobId] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: credits } = useQuery({
    queryKey: ["credits", user?.email],
    queryFn: async () => {
      const result = await base44.entities.StudioCredits.filter({
        user_email: user.email,
      });
      return result[0] || { credits_balance: 0, plan_type: "free" };
    },
    enabled: !!user,
  });

  const { data: generations } = useQuery({
    queryKey: ["generations", user?.email],
    queryFn: () =>
      base44.entities.StudioGeneration.filter(
        { user_email: user.email, generation_type: "video" },
        "-created_date",
        20,
      ),
    enabled: !!user,
  });

  const generateMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result } = await base44.functions.invoke(
        "imageToVideo",
        data,
      );
      return result;
    },
    onSuccess: async (result) => {
      setGeneratingJobId(result.job_id);

      await base44.entities.StudioGeneration.create({
        user_email: user.email,
        generation_type: "video",
        model: selectedModel,
        prompt: prompt,
        input_image_url: imageUrl,
        job_id: result.job_id,
        status: "processing",
        credits_used: result.credits_used || 14,
        settings: { aspect_ratio: aspectRatio, output_number: outputNumber },
      });

      queryClient.invalidateQueries({ queryKey: ["generations"] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      pollJobStatus(result.job_id);
    },
    onError: (error) => {
      if (
        error.message?.includes("Insufficient credits") ||
        error.response?.status === 402
      ) {
        setShowSubscriptionModal(true);
      }
    },
  });

  const pollJobStatus = async (jobId) => {
    const interval = setInterval(async () => {
      try {
        const { data: statusResult } = await base44.functions.invoke(
          "checkJobStatus",
          {
            job_id: jobId,
            model: "fal-ai/fast-svd/image-to-video",
          },
        );

        if (statusResult.status === "completed") {
          clearInterval(interval);
          setGeneratingJobId(null);

          const generations = await base44.entities.StudioGeneration.filter({
            job_id: jobId,
          });
          if (generations[0]) {
            await base44.entities.StudioGeneration.update(generations[0].id, {
              status: "completed",
              output_url: statusResult.result.video?.url,
            });
          }

          queryClient.invalidateQueries({ queryKey: ["generations"] });
        } else if (statusResult.status === "failed") {
          clearInterval(interval);
          setGeneratingJobId(null);
        }
      } catch (error) {
        console.error("Polling error:", error);
        clearInterval(interval);
        setGeneratingJobId(null);
      }
    }, 3000);
  };

  const handleGenerate = () => {
    if (!imageUrl) {
      toast({
        title: "Upload Required",
        description: "Please upload an image first",
      });
      return;
    }

    if (!credits || credits.credits_balance < 14) {
      setShowSubscriptionModal(true);
      return;
    }

    generateMutation.mutate({
      image_url: imageUrl,
      prompt: prompt || undefined,
    });
  };

  const handleUpload = async (file) => {
    const { data } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(data.file_url);
  };

  const selectedModelData = imageToVideoModels.find(
    (m) => m.id === selectedModel,
  );

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100vh", color: "#fff" }}>
      {/* Header */}
      <header className="px-6 py-4 border-b border-white/10 bg-[#0A0A0F]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("Studio"))}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">
                {credits?.credits_balance || 0} credits
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[400px_1fr] gap-8">
          {/* Left Sidebar */}
          <div className="space-y-6">
            <Card className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-6">
              <h2 className="text-xl font-bold text-white">Image to Video</h2>

              {/* Model Selector */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Model
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-left flex items-center justify-between hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {selectedModelData?.icon}
                      </span>
                      <div>
                        <div className="text-white font-medium">
                          {selectedModelData?.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {selectedModelData?.description}
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform ${showModelDropdown ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showModelDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1F] border border-white/10 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto">
                      {imageToVideoModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            setSelectedModel(model.id);
                            setShowModelDropdown(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-white/5 transition-colors flex items-start gap-3 border-b border-white/5 last:border-0"
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 ${
                              selectedModel === model.id
                                ? "border-[#F18B6A] bg-[#F18B6A]"
                                : "border-white/30"
                            }`}
                          >
                            {selectedModel === model.id && (
                              <div className="w-2.5 h-2.5 rounded-full bg-white m-auto mt-0.5" />
                            )}
                          </div>
                          <div className="text-2xl flex-shrink-0">
                            {model.icon}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium text-sm">
                                {model.name}
                              </span>
                              {model.badges.map((badge, idx) => (
                                <Badge
                                  key={idx}
                                  className="bg-green-500/20 text-green-400 text-xs"
                                >
                                  {badge}
                                </Badge>
                              ))}
                            </div>
                            <div className="text-xs text-gray-400 mb-2">
                              {model.description}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              {model.duration}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Image
                </label>
                {imageUrl ? (
                  <div className="relative">
                    <img
                      src={imageUrl}
                      alt="Upload"
                      className="w-full rounded-lg border border-white/10"
                    />
                    <button
                      onClick={() => setImageUrl("")}
                      className="absolute top-2 right-2 px-3 py-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg text-xs text-white"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="w-full h-48 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center hover:border-white/40 transition-colors">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-400">
                        Click to upload an image
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG, WEBP up to 10MB
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] && handleUpload(e.target.files[0])
                      }
                    />
                  </label>
                )}
              </div>

              {/* Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">
                    Prompt (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      Translate Prompt
                    </span>
                    <button
                      onClick={() => setTranslatePrompt(!translatePrompt)}
                      className={`w-10 h-5 rounded-full transition-colors ${translatePrompt ? "bg-[#F18B6A]" : "bg-white/20"}`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transition-transform ${translatePrompt ? "translate-x-5" : "translate-x-0.5"}`}
                      />
                    </button>
                  </div>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the motion you want..."
                  className="bg-white/5 border-white/10 text-white min-h-24 resize-none"
                  maxLength={2000}
                />
                <div className="flex items-center justify-between mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Generate with AI
                  </Button>
                  <span className="text-xs text-gray-500">
                    {prompt.length} / 2000
                  </span>
                </div>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="block text-sm font-medium mb-3 text-white">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {aspectRatios.map((ratio) => (
                    <button
                      key={ratio.value}
                      onClick={() => setAspectRatio(ratio.value)}
                      className={`aspect-square rounded-lg border-2 transition-all ${
                        aspectRatio === ratio.value
                          ? "border-[#F18B6A] bg-[#F18B6A]/20"
                          : "border-white/10 bg-white/5 hover:border-white/30"
                      }`}
                    >
                      <div className="text-xs font-medium text-white">
                        {ratio.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Output Number */}
              <div>
                <label className="block text-sm font-medium mb-3 text-white">
                  Output Video Number
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => setOutputNumber(num)}
                      className={`py-3 rounded-lg border-2 transition-all text-lg font-medium ${
                        outputNumber === num
                          ? "border-[#F18B6A] bg-[#F18B6A]/20 text-white"
                          : "border-white/10 bg-white/5 text-gray-400 hover:border-white/30"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-white font-medium"
              >
                <span>Advanced</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                />
              </button>

              {showAdvanced && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-sm mb-2 text-gray-300">
                      Motion Intensity
                    </label>
                    <Slider
                      defaultValue={[127]}
                      max={255}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-gray-300">
                      FPS
                    </label>
                    <Slider
                      defaultValue={[24]}
                      min={6}
                      max={30}
                      step={6}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* Credits & Create Button */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-400">
                    Credits required:
                  </span>
                  <span className="text-lg font-bold text-white">
                    14 Credits
                  </span>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={
                    !imageUrl || generateMutation.isPending || !!generatingJobId
                  }
                  className="w-full h-12 bg-gradient-to-r from-[#F18B6A] to-[#E07A5A] hover:opacity-90 text-white font-medium text-base"
                >
                  {generateMutation.isPending || generatingJobId ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* Right: Generation History */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input type="checkbox" className="rounded" />
                  Favorites
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {generations?.map((gen) => (
                <Card
                  key={gen.id}
                  className="p-3 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-xs px-2 py-1 bg-white/10 rounded text-gray-300">
                      Pollo.ai
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(gen.created_date).toLocaleDateString()}
                    </div>
                  </div>

                  {gen.status === "completed" && gen.output_url ? (
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-3">
                      <video
                        src={gen.output_url}
                        controls
                        className="w-full h-full"
                        poster={gen.input_image_url}
                      />
                    </div>
                  ) : gen.status === "processing" ? (
                    <div className="aspect-video bg-white/5 rounded-lg flex items-center justify-center mb-3">
                      <Loader2 className="w-8 h-8 animate-spin text-[#F18B6A]" />
                    </div>
                  ) : (
                    <div className="aspect-video bg-white/5 rounded-lg flex items-center justify-center mb-3">
                      <span className="text-xs text-red-400">Failed</span>
                    </div>
                  )}

                  {gen.prompt && (
                    <p className="text-xs text-gray-400 line-clamp-2">
                      {gen.prompt}
                    </p>
                  )}
                </Card>
              ))}

              {!generations?.length && (
                <div className="col-span-2 text-center py-20">
                  <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">
                    No videos yet. Create your first one!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 bg-[#1A1A1F] border-2 border-white/20 rounded-xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#F18B6A] to-[#E07A5A] rounded-full flex items-center justify-center mx-auto mb-6">
                <Coins className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                No Credits Available
              </h3>
              <p className="text-gray-400 mb-8">
                You need credits to generate videos. Subscribe to one of our
                plans to start creating!
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowSubscriptionModal(false)}
                  className="flex-1 border-white/10 hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowSubscriptionModal(false);
                    navigate(createPageUrl("StudioSubscribe"));
                  }}
                  className="flex-1 bg-gradient-to-r from-[#F18B6A] to-[#E07A5A] hover:opacity-90"
                >
                  Get Credits
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
