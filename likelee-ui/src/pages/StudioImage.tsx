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
  Image as ImageIcon,
  Loader2,
  Download,
  Coins,
  ArrowLeft,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const imageModels = [
  {
    id: "fal-ai/flux/schnell",
    name: "Flux Schnell",
    cost: 2,
    description: "Ultra-fast generation",
  },
  {
    id: "fal-ai/flux/dev",
    name: "Flux Dev",
    cost: 3,
    description: "High quality, balanced speed",
  },
  {
    id: "fal-ai/flux-pro",
    name: "Flux Pro",
    cost: 5,
    description: "Professional grade",
  },
  {
    id: "fal-ai/flux-pro/v1.1",
    name: "Flux Pro v1.1",
    cost: 6,
    description: "Latest Flux model",
  },
  {
    id: "fal-ai/flux-realism",
    name: "Flux Realism",
    cost: 4,
    description: "Photorealistic images",
  },
  {
    id: "fal-ai/aura-flow",
    name: "Aura Flow",
    cost: 3,
    description: "Creative and artistic",
  },
  {
    id: "fal-ai/stable-diffusion-v3-medium",
    name: "Stable Diffusion v3",
    cost: 3,
    description: "Open source standard",
  },
  {
    id: "fal-ai/stable-diffusion-v35-large",
    name: "Stable Diffusion v3.5",
    cost: 4,
    description: "Latest SD version",
  },
  {
    id: "fal-ai/recraft-v3",
    name: "Recraft v3",
    cost: 4,
    description: "Design-focused model",
  },
  {
    id: "fal-ai/ideogram-v2",
    name: "Ideogram v2",
    cost: 5,
    description: "Text rendering expert",
  },
  {
    id: "fal-ai/ideogram-v2/turbo",
    name: "Ideogram v2 Turbo",
    cost: 3,
    description: "Fast text rendering",
  },
];

const imageSizes = [
  { value: "square_hd", label: "Square HD (1024x1024)" },
  { value: "square", label: "Square (512x512)" },
  { value: "portrait_4_3", label: "Portrait 4:3" },
  { value: "portrait_16_9", label: "Portrait 16:9" },
  { value: "landscape_4_3", label: "Landscape 4:3" },
  { value: "landscape_16_9", label: "Landscape 16:9" },
];

export default function StudioImage() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(imageModels[0].id);
  const [imageSize, setImageSize] = useState("landscape_16_9");
  const [numImages, setNumImages] = useState(1);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [numSteps, setNumSteps] = useState(28);
  const [generatingJobId, setGeneratingJobId] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
        { user_email: user.email, generation_type: "image" },
        "-created_date",
        40,
      ),
    enabled: !!user,
  });

  const generateMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result } = await base44.functions.invoke(
        "generateImage",
        data,
      );
      return result;
    },
    onSuccess: async (result) => {
      setGeneratingJobId(result.job_id);

      await base44.entities.StudioGeneration.create({
        user_email: user.email,
        generation_type: "image",
        model: selectedModel,
        prompt: prompt,
        job_id: result.job_id,
        status: "processing",
        credits_used: result.credits_used,
        settings: {
          image_size: imageSize,
          num_images: numImages,
          guidance_scale: guidanceScale,
          num_steps: numSteps,
        },
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
              output_url: statusResult.result.images?.[0]?.url,
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

  const handleGenerate = () => {
    if (!prompt) return;

    if (!credits || credits.credits_balance < totalCost) {
      setShowSubscriptionModal(true);
      return;
    }

    generateMutation.mutate({
      prompt: prompt,
      model: selectedModel,
      image_size: imageSize,
      num_images: numImages,
      guidance_scale: guidanceScale,
      num_inference_steps: numSteps,
    });
  };

  const selectedModelData = imageModels.find((m) => m.id === selectedModel);
  const totalCost = (selectedModelData?.cost || 3) * numImages;

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
              <ImageIcon className="w-6 h-6 text-[#32C8D1]" />
              <h1 className="text-2xl font-bold text-white">
                AI Image Generator
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
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 bg-white/5 border border-white/10 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#32C8D1]" />
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
                      {imageModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div>
                            <div className="font-medium text-sm">
                              {model.name}
                            </div>
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
                    placeholder="Describe the image you want to create..."
                    className="bg-white/5 border-white/10 text-white min-h-40 resize-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Image Size
                  </label>
                  <Select value={imageSize} onValueChange={setImageSize}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {imageSizes.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Number of Images: {numImages}
                  </label>
                  <Slider
                    value={[numImages]}
                    onValueChange={([v]) => setNumImages(v)}
                    min={1}
                    max={4}
                    step={1}
                    className="w-full"
                  />
                </div>

                <details className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <summary className="cursor-pointer text-sm font-medium text-gray-300">
                    Advanced Settings
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        Guidance Scale: {guidanceScale.toFixed(1)}
                      </label>
                      <Slider
                        value={[guidanceScale]}
                        onValueChange={([v]) => setGuidanceScale(v)}
                        min={1}
                        max={20}
                        step={0.5}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        Steps: {numSteps}
                      </label>
                      <Slider
                        value={[numSteps]}
                        onValueChange={([v]) => setNumSteps(v)}
                        min={1}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                </details>

                <Button
                  onClick={handleGenerate}
                  disabled={
                    !prompt || generateMutation.isPending || !!generatingJobId
                  }
                  className="w-full h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:opacity-90 text-white font-medium"
                >
                  {generateMutation.isPending || generatingJobId ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Create ({totalCost} credits)
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-[#32C8D1]" />
              Recent Generations
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {generations?.map((gen) => (
                <Card
                  key={gen.id}
                  className="p-2 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 transition-all group"
                >
                  {gen.status === "completed" && gen.output_url ? (
                    <>
                      <div className="relative aspect-square overflow-hidden rounded-lg mb-2">
                        <img
                          src={gen.output_url}
                          alt={gen.prompt}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              window.open(gen.output_url, "_blank")
                            }
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2 mb-1 px-1">
                        {gen.prompt}
                      </p>
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs text-gray-500">
                          {gen.credits_used} credits
                        </span>
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          Done
                        </Badge>
                      </div>
                    </>
                  ) : gen.status === "processing" ? (
                    <div className="aspect-square flex flex-col items-center justify-center bg-white/5 rounded-lg border border-white/10">
                      <Loader2 className="w-8 h-8 animate-spin text-[#32C8D1] mb-2" />
                      <p className="text-xs text-gray-400">Processing...</p>
                    </div>
                  ) : (
                    <div className="aspect-square flex items-center justify-center bg-white/5 rounded-lg border border-red-500/20">
                      <p className="text-xs text-red-400">Failed</p>
                    </div>
                  )}
                </Card>
              ))}

              {!generations?.length && (
                <div className="col-span-full text-center py-16">
                  <ImageIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">
                    No images yet. Create your first one!
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
              <div className="w-16 h-16 bg-gradient-to-br from-[#32C8D1] to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Coins className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                No Credits Available
              </h3>
              <p className="text-gray-400 mb-8">
                You need credits to generate images. Subscribe to one of our
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
                  className="flex-1 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:opacity-90"
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
