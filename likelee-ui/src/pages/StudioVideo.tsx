import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Plus,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";

const videoModels = [
  {
    id: "fal-ai/runway-gen3/turbo/text-to-video",
    name: "Runway Gen-3 Turbo",
    cost: 15,
    description: "Fast, high-quality video generation",
    duration: [5, 10],
  },
  {
    id: "fal-ai/luma-dream-machine",
    name: "Luma Dream Machine",
    cost: 12,
    description: "Cinematic AI video creation",
    duration: [5],
  },
  {
    id: "fal-ai/kling-video/v1/standard/text-to-video",
    name: "Kling AI Standard",
    cost: 20,
    description: "High-quality Chinese model",
    duration: [5, 10],
  },
  {
    id: "fal-ai/kling-video/v1/pro/text-to-video",
    name: "Kling AI Pro",
    cost: 30,
    description: "Professional grade video",
    duration: [5, 10],
  },
  {
    id: "fal-ai/hunyuan-video",
    name: "Hunyuan Video",
    cost: 25,
    description: "Tencent's powerful video model",
    duration: [2, 5],
  },
  {
    id: "fal-ai/fast-animatediff/text-to-video",
    name: "Fast AnimateDiff",
    cost: 10,
    description: "Quick animation generation",
    duration: [3],
  },
  {
    id: "fal-ai/fast-svd/text-to-video",
    name: "Stable Video Diffusion",
    cost: 8,
    description: "Stable and reliable",
    duration: [3, 5],
  },
];

const aspectRatios = [
  { value: "16:9", label: "16:9 Landscape" },
  { value: "9:16", label: "9:16 Portrait" },
  { value: "1:1", label: "1:1 Square" },
  { value: "4:3", label: "4:3 Classic" },
  { value: "21:9", label: "21:9 Cinematic" },
];

export default function StudioVideo() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedModel, setSelectedModel] = useState(videoModels[0].id);
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [fps, setFps] = useState(24);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [generatingJobId, setGeneratingJobId] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

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
        "generateVideo",
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
        input_image_url: imageUrl || null,
        job_id: result.job_id,
        status: "processing",
        credits_used: result.credits_used,
        settings: {
          duration,
          aspect_ratio: aspectRatio,
          fps,
          guidance_scale: guidanceScale,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["generations"] });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      pollJobStatus(result.job_id);
    },
    onError: (error) => {
      console.error("Generation error:", error);
      const errorMessage = error.message?.toLowerCase();
      const statusCode = error.response?.status;
      if (
        errorMessage?.includes("insufficient credits") ||
        statusCode === 402
      ) {
        setShowSubscriptionModal(true);
      } else {
        alert(
          `Generation failed: ${error.message || "An unknown error occurred."}`,
        );
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
            model: selectedModel,
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
              output_url:
                statusResult.result.video?.url ||
                statusResult.result.images?.[0]?.url,
            });
          }

          queryClient.invalidateQueries({ queryKey: ["generations"] });
        } else if (statusResult.status === "failed") {
          clearInterval(interval);
          setGeneratingJobId(null);

          const generations = await base44.entities.StudioGeneration.filter({
            job_id: jobId,
          });
          if (generations[0]) {
            await base44.entities.StudioGeneration.update(generations[0].id, {
              status: "failed",
            });
          }

          queryClient.invalidateQueries({ queryKey: ["generations"] });
        }
      } catch (error) {
        console.error("Polling error:", error);
        clearInterval(interval);
        setGeneratingJobId(null);
      }
    }, 3000);
  };

  const selectedModelData = videoModels.find((m) => m.id === selectedModel);

  const handleGenerate = () => {
    if (!prompt && !imageUrl) {
      alert("Please provide a prompt or a reference image.");
      return;
    }

    if (!credits || credits.credits_balance < (selectedModelData?.cost || 10)) {
      setShowSubscriptionModal(true);
      return;
    }

    generateMutation.mutate({
      prompt: prompt || undefined,
      image_url: imageUrl || undefined,
      model: selectedModel,
      duration: duration,
      aspect_ratio: aspectRatio,
      fps: fps,
      guidance_scale: guidanceScale,
    });
  };

  const handleUpload = async (file) => {
    if (!file) return;
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(data.file_url);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload image. Please try again.");
    }
  };

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100vh", color: "#fff" }}>
      <header className="px-6 py-6 border-b border-white/10 bg-[#0A0A0F]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("Studio"))}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Studio
            </Button>
            <div className="flex items-center gap-3">
              <Film className="w-6 h-6 text-[#F18B6A]" />
              <h1 className="text-2xl font-bold text-white">
                AI Video Generator
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">
                {credits?.credits_balance || 0} credits
              </span>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("StudioSubscribe"))}
              className="border-white/10 hover:bg-white/5"
            >
              Add Credits
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 bg-white/5 border border-white/10 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#F18B6A]" />
                Generation Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Model
                  </label>
                  <Select
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {videoModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div>
                            <div className="font-medium">{model.name}</div>
                            <div className="text-xs text-gray-400">
                              {model.cost} credits • {model.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Prompt
                  </label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the video you want to create..."
                    className="bg-white/5 border-white/10 text-white min-h-32 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Reference Image (Optional)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Image URL..."
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <label className="cursor-pointer">
                      <Button
                        variant="outline"
                        className="border-white/10"
                        asChild
                      >
                        <span>
                          <Upload className="w-4 h-4" />
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          e.target.files?.[0] && handleUpload(e.target.files[0])
                        }
                      />
                    </label>
                  </div>
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Reference"
                      className="mt-3 w-full rounded-lg border border-white/10"
                    />
                  )}
                </div>

                {selectedModelData && selectedModelData.duration.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Duration: {duration}s
                    </label>
                    <Select
                      value={duration.toString()}
                      onValueChange={(v) => setDuration(Number(v))}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedModelData.duration.map((d) => (
                          <SelectItem key={d} value={d.toString()}>
                            {d} seconds
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Aspect Ratio
                  </label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aspectRatios.map((ar) => (
                        <SelectItem key={ar.value} value={ar.value}>
                          {ar.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <details className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <summary className="cursor-pointer text-sm font-medium text-gray-300">
                    Advanced Settings
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        FPS: {fps}
                      </label>
                      <Slider
                        value={[fps]}
                        onValueChange={([v]) => setFps(v)}
                        min={6}
                        max={30}
                        step={6}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        Guidance Scale: {guidanceScale.toFixed(1)}
                      </label>
                      <Slider
                        value={[guidanceScale]}
                        onValueChange={([v]) => setGuidanceScale(v)}
                        min={1}
                        max={15}
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                  </div>
                </details>

                <Button
                  onClick={handleGenerate}
                  disabled={
                    (!prompt && !imageUrl) ||
                    generateMutation.isPending ||
                    !!generatingJobId
                  }
                  className="w-full h-12 bg-gradient-to-r from-[#F18B6A] to-[#E07A5A] hover:opacity-90 text-white font-medium"
                >
                  {generateMutation.isPending || generatingJobId ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Create ({selectedModelData?.cost} credits)
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Film className="w-6 h-6 text-[#F18B6A]" />
                Recent Generations
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generations?.map((gen) => (
                <Card
                  key={gen.id}
                  className="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-1">
                        {videoModels.find((m) => m.id === gen.model)?.name ||
                          gen.model}
                      </p>
                      <p className="text-white font-medium line-clamp-2 text-sm">
                        {gen.prompt}
                      </p>
                    </div>
                    <Badge
                      className={
                        gen.status === "completed"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : gen.status === "failed"
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      }
                    >
                      {gen.status}
                    </Badge>
                  </div>

                  {gen.status === "completed" && gen.output_url && (
                    <div className="mt-3">
                      <video
                        src={gen.output_url}
                        controls
                        className="w-full rounded-lg border border-white/10"
                        poster={gen.input_image_url}
                      />
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-white/10 hover:bg-white/5"
                          onClick={() => window.open(gen.output_url, "_blank")}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  )}

                  {gen.status === "processing" && (
                    <div className="mt-3 flex items-center justify-center py-8 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#F18B6A] mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Processing...</p>
                      </div>
                    </div>
                  )}

                  {gen.status === "failed" && (
                    <div className="mt-3 py-4 text-center text-sm text-red-400 bg-red-500/10 rounded-lg border border-red-500/20">
                      Generation failed
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
                    <span>{gen.credits_used} credits</span>
                    <span>{new Date(gen.created_date).toLocaleString()}</span>
                  </div>
                </Card>
              ))}

              {!generations?.length && (
                <div className="col-span-full text-center py-16">
                  <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">
                    No videos yet. Create your first one!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
                plans to start creating amazing AI content!
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
