import React, { useState } from "react";
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
  History,
  Info,
  Layers,
  Settings2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const imageModels = [
  {
    id: "fal-ai/flux/schnell",
    name: "Flux Schnell",
    cost: 1,
    description: "Ultra-fast generation",
  },
  {
    id: "fal-ai/flux/dev",
    name: "Flux Dev",
    cost: 1,
    description: "High quality, balanced speed",
  },
  {
    id: "fal-ai/flux-pro",
    name: "Flux Pro",
    cost: 1,
    description: "Professional grade",
  },
  {
    id: "fal-ai/flux-pro/v1.1",
    name: "Flux Pro v1.1",
    cost: 1,
    description: "Latest Flux model",
  },
  {
    id: "fal-ai/flux-realism",
    name: "Flux Realism",
    cost: 1,
    description: "Photorealistic images",
  },
  {
    id: "fal-ai/aura-flow",
    name: "Aura Flow",
    cost: 1,
    description: "Creative and artistic",
  },
  {
    id: "fal-ai/stable-diffusion-v3-medium",
    name: "Stable Diffusion v3",
    cost: 1,
    description: "Open source standard",
  },
  {
    id: "fal-ai/stable-diffusion-v35-large",
    name: "Stable Diffusion v3.5",
    cost: 1,
    description: "Latest SD version",
  },
  {
    id: "fal-ai/recraft-v3",
    name: "Recraft v3",
    cost: 1,
    description: "Design-focused model",
  },
  {
    id: "fal-ai/nano-banana-2",
    name: "Nano Banana 2",
    cost: 1,
    description: "Lightning fast, lightweight generation",
  },
  {
    id: "fal-ai/ideogram-v2",
    name: "Ideogram v2",
    cost: 1,
    description: "Text rendering expert",
  },
  {
    id: "fal-ai/ideogram-v2/turbo",
    name: "Ideogram v2 Turbo",
    cost: 1,
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
  const [showTransactions, setShowTransactions] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: wallet } = useQuery({
    queryKey: ["studio", "wallet"],
    queryFn: () => getWallet(),
  });

  const { data: generations } = useQuery({
    queryKey: ["studio", "generations", "image"],
    queryFn: () => listGenerations({ generation_type: "image", limit: 40 }),
  });

  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      const provider = inferProviderFromModel(selectedModel);
      return await studioGenerate({
        provider,
        model: selectedModel,
        generation_type: "image",
        input_params: data,
      });
    },
    onSuccess: async (result) => {
      setGeneratingJobId(result.generation_id);
      queryClient.invalidateQueries({ queryKey: ["studio", "wallet"] });
      queryClient.invalidateQueries({
        queryKey: ["studio", "generations", "image"],
      });
      pollJobStatus(result.generation_id);
    },
    onError: (error: any) => {
      if (
        error.message?.includes("Insufficient credits") ||
        error.status === 402
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
    const interval = setInterval(async () => {
      try {
        const statusResult = await getJobStatus(jobId);
        if (
          statusResult.status === "completed" ||
          statusResult.status === "failed"
        ) {
          clearInterval(interval);
          setGeneratingJobId(null);
          queryClient.invalidateQueries({
            queryKey: ["studio", "generations", "image"],
          });
          queryClient.invalidateQueries({ queryKey: ["studio", "wallet"] });
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

    if (!wallet || wallet.balance < totalCost) {
      setShowSubscriptionModal(true);
      return;
    }

    generateMutation.mutate({
      prompt: prompt,
      image_size: imageSize,
      num_images: numImages,
      guidance_scale: guidanceScale,
      num_inference_steps: numSteps,
    });
  };

  const selectedModelData = imageModels.find((m) => m.id === selectedModel);
  const totalCost = (selectedModelData?.cost || 3) * numImages;

  return (
    <div
      style={{
        background: "#04060C",
        minHeight: "100vh",
        color: "#F0F0FF",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Dynamic Background Glows */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "-10%",
          width: "50%",
          height: "50%",
          background:
            "radial-gradient(circle, rgba(50, 200, 209, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          right: "-10%",
          width: "60%",
          height: "60%",
          background:
            "radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <header className="px-6 py-5 border-b border-white/5 bg-[#04060C]/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("Studio"))}
              className="text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Studio
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#32C8D1] to-[#6366F1] flex items-center justify-center shadow-[0_0_20px_rgba(50,200,209,0.3)]">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1
                  className="text-xl font-bold tracking-tight text-white"
                  style={{ textShadow: "0 0 20px rgba(50,200,209,0.3)" }}
                >
                  AI Image Generator
                </h1>
                <p className="text-[10px] text-[#32C8D1] font-bold uppercase tracking-widest opacity-80">
                  Premium Studio
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] rounded-full border border-white/10 backdrop-blur-md shadow-inner">
              <Coins className="w-4 h-4 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
              <span className="text-sm font-bold tracking-tight">
                {wallet?.balance?.toLocaleString() || 0}
                <span className="ml-1 text-[10px] text-gray-500 uppercase">
                  credits
                </span>
              </span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <Button
              variant="ghost"
              onClick={() => setShowTransactions(true)}
              className="text-gray-400 hover:text-white hover:bg-white/5"
            >
              History
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("StudioSubscribe"))}
              className="bg-white text-black hover:bg-gray-200 font-bold px-6 rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_4px_15px_rgba(255,255,255,0.2)]"
            >
              Top Up
            </Button>
          </div>
        </div>
      </header>

      <WalletTransactionsDialog
        open={showTransactions}
        onOpenChange={setShowTransactions}
      />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-12 gap-10 relative z-10">
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-2 mb-6">
                <Settings2 className="w-5 h-5 text-[#32C8D1]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                  Settings
                </h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#32C8D1] opacity-70 ml-1">
                    Intelligence
                  </label>
                  <Select
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 rounded-xl hover:bg-white/10 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0A14] border-white/10 backdrop-blur-xl">
                      {imageModels.map((model) => (
                        <SelectItem
                          key={model.id}
                          value={model.id}
                          className="focus:bg-[#32C8D1]/10 focus:text-[#32C8D1] py-3"
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className="font-bold text-sm text-white">
                              {model.name}
                            </div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-tight">
                              {model.cost} Credits • {model.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#32C8D1] opacity-70 ml-1">
                    Visual Prompt
                  </label>
                  <div className="relative group">
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Surreal landscape with floating islands..."
                      className="bg-white/5 border-white/10 text-white min-h-[160px] rounded-2xl resize-none text-sm p-4 focus:ring-[#32C8D1]/30 transition-all group-hover:bg-white/[0.08]"
                    />
                    <div className="absolute top-3 right-3 opacity-30 group-hover:opacity-100 transition-opacity">
                      <Sparkles className="w-4 h-4 text-[#32C8D1]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#32C8D1] opacity-70 ml-1">
                    Canvas Size
                  </label>
                  <Select value={imageSize} onValueChange={setImageSize}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 rounded-xl hover:bg-white/10 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0A14] border-white/10 backdrop-blur-xl">
                      {imageSizes.map((size) => (
                        <SelectItem
                          key={size.value}
                          value={size.value}
                          className="focus:bg-[#32C8D1]/10 focus:text-white py-2.5"
                        >
                          <span className="text-sm font-medium text-white/90 group-hover:text-white">
                            {size.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-end">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[#32C8D1] opacity-70 ml-1">
                      Batch Count
                    </label>
                    <span className="text-xl font-bold bg-gradient-to-t from-[#32C8D1] to-white bg-clip-text text-transparent">
                      {numImages}
                    </span>
                  </div>
                  <Slider
                    value={[numImages]}
                    onValueChange={([v]) => setNumImages(v)}
                    min={1}
                    max={4}
                    step={1}
                    className="w-full"
                  />
                </div>

                <details className="overflow-hidden">
                  <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-[#32C8D1] transition-colors py-2 flex items-center gap-2">
                    <Layers className="w-3 h-3" />
                    Fine-tune Parameters
                  </summary>
                  <div className="mt-4 space-y-6 p-4 bg-black/20 rounded-2xl border border-white/5 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <label className="text-[10px] font-bold uppercase text-gray-400">
                          Guidance
                        </label>
                        <span className="text-xs font-medium text-[#32C8D1]">
                          {guidanceScale.toFixed(1)}
                        </span>
                      </div>
                      <Slider
                        value={[guidanceScale]}
                        onValueChange={([v]) => setGuidanceScale(v)}
                        min={1}
                        max={20}
                        step={0.5}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <label className="text-[10px] font-bold uppercase text-gray-400">
                          Steps
                        </label>
                        <span className="text-xs font-medium text-[#32C8D1]">
                          {numSteps}
                        </span>
                      </div>
                      <Slider
                        value={[numSteps]}
                        onValueChange={([v]) => setNumSteps(v)}
                        min={1}
                        max={50}
                        step={1}
                      />
                    </div>
                  </div>
                </details>

                <Button
                  onClick={handleGenerate}
                  disabled={
                    !prompt || generateMutation.isPending || !!generatingJobId
                  }
                  className={`w-full h-14 rounded-2xl font-bold text-sm tracking-widest uppercase transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.4)] ${
                    generateMutation.isPending || generatingJobId
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#32C8D1] via-[#6366F1] to-[#32C8D1] bg-[length:200%_auto] hover:bg-right text-white hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_20px_-10px_rgba(50,200,209,0.5)]"
                  }`}
                >
                  {generateMutation.isPending || generatingJobId ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-[#32C8D1]/30 border-t-[#32C8D1] rounded-full animate-spin" />
                      <span>Evolving...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-5 h-5" />
                      <span>Synthesize ({totalCost})</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-start gap-4">
              <div className="p-2 bg-[#32C8D1]/10 rounded-lg">
                <Info className="w-4 h-4 text-[#32C8D1]" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">
                  Notice
                </p>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Higher guidance scales follow prompts strictly but may reduce
                  overall realism.
                </p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                <History className="w-6 h-6 text-[#6366F1]" />
                Recent Artifacts
              </h2>
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className="border-white/5 bg-white/5 text-[10px] uppercase font-bold px-3 py-1"
                >
                  Grid View
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {(generations as StudioGenerationRow[] | undefined)?.map(
                (gen) => (
                  <div
                    key={gen.id}
                    className="relative group bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden hover:border-[#32C8D1]/30 transition-all duration-500 shadow-xl"
                  >
                    {gen.status === "completed" && gen.output_urls?.[0] ? (
                      <>
                        <div className="relative aspect-[4/5] overflow-hidden">
                          <img
                            src={gen.output_urls[0]}
                            alt={gen.input_params?.prompt || ""}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 blur-0"
                            loading="lazy"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500" />

                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-100">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                window.open(gen.output_urls?.[0], "_blank")
                              }
                              className="bg-white text-black hover:bg-white/90 rounded-full font-bold px-6 shadow-2xl"
                            >
                              <Download className="w-3 h-3 mr-2" />
                              Expand
                            </Button>
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          <p className="text-[11px] text-gray-300 leading-relaxed line-clamp-2 font-medium">
                            {gen.input_params?.prompt ||
                              "Mysterious generation..."}
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#32C8D1] shadow-[0_0_8px_#32C8D1]" />
                              <span className="text-[10px] font-black uppercase tracking-tighter text-[#32C8D1]">
                                Ready
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 tabular-nums bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                              {gen.credits_used} CR
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="aspect-[4/5] flex flex-col items-center justify-center text-center p-6 bg-[#04060C]">
                        <div className="relative w-16 h-16 mb-4">
                          <div className="absolute inset-0 border-4 border-[#32C8D1]/10 rounded-full" />
                          <div className="absolute inset-0 border-4 border-t-[#32C8D1] rounded-full animate-spin" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#32C8D1] animate-pulse">
                          Evolving
                        </p>
                        <p className="text-[9px] text-gray-600 mt-2 uppercase font-bold">
                          Please wait...
                        </p>
                      </div>
                    )}
                  </div>
                ),
              )}

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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] animate-in fade-in duration-300">
          <div className="bg-[#0A0A14] border border-white/10 rounded-[32px] p-8 w-full max-w-md shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Coins className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 text-center">
              Credit Exhaustion
            </h3>
            <p className="text-sm text-gray-400 mb-8 text-center leading-relaxed">
              Your creative fuel is low. To continue synthesizing high-fidelity
              imagery, please replenish your balance.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="ghost"
                onClick={() => setShowSubscriptionModal(false)}
                className="rounded-xl h-12 text-gray-500 hover:text-white"
              >
                Maybe Later
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("StudioSubscribe"))}
                className="bg-[#32C8D1] hover:bg-[#32C8D1]/80 text-black font-bold h-12 rounded-xl"
              >
                Top Up Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
