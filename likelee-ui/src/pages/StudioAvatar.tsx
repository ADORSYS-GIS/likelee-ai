import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Upload, Loader2, Download, Coins } from "lucide-react";

export default function StudioAvatar() {
  const [prompt, setPrompt] = useState(
    "A professional headshot with neutral expression",
  );
  const [imageUrl, setImageUrl] = useState("");
  const [generatingJobId, setGeneratingJobId] = useState(null);
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
        { user_email: user.email, generation_type: "avatar" },
        "-created_date",
        10,
      ),
    enabled: !!user,
  });

  const generateMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result } = await base44.functions.invoke(
        "generateAvatar",
        data,
      );
      return result;
    },
    onSuccess: async (result) => {
      setGeneratingJobId(result.job_id);

      await base44.entities.StudioGeneration.create({
        user_email: user.email,
        generation_type: "avatar",
        model: "fal-ai/face-to-sticker",
        prompt: prompt,
        input_image_url: imageUrl,
        job_id: result.job_id,
        status: "processing",
        credits_used: 8,
      });

      queryClient.invalidateQueries({ queryKey: ["generations"] });
      pollJobStatus(result.job_id);
    },
  });

  const pollJobStatus = async (jobId) => {
    const interval = setInterval(async () => {
      try {
        const { data: statusResult } = await base44.functions.invoke(
          "checkJobStatus",
          {
            job_id: jobId,
            model: "fal-ai/face-to-sticker",
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
              output_url: statusResult.result.image?.url,
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
    if (!imageUrl) return;

    generateMutation.mutate({
      image_url: imageUrl,
      prompt: prompt,
    });
  };

  const handleUpload = async (file) => {
    const { data } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(data.file_url);
  };

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100vh", color: "#fff" }}>
      {/* Header */}
      <header className="px-6 py-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/studio" className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eaaf29851_Screenshot2025-10-12at31742PM.png"
                alt="Likelee Logo"
                className="h-8 w-auto"
              />
              <span className="text-lg font-bold text-white">
                likelee.studio
              </span>
            </a>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">
                {credits?.credits_balance || 0} credits
              </span>
            </div>
            <Badge className="bg-white/10 text-white">
              {credits?.plan_type || "Free"}
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Generation Form */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Brain className="w-8 h-8 text-purple-400" />
              <h1 className="text-3xl font-bold">AI Avatar Generator</h1>
            </div>

            <Card className="p-6 bg-white/5 border border-white/10 rounded-lg mb-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload Photo
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Enter image URL or upload..."
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <label className="cursor-pointer">
                      <Button
                        variant="outline"
                        className="border-white/10"
                        asChild
                      >
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
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
                      alt="Preview"
                      className="mt-4 w-full max-w-xs rounded-lg"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Style Prompt (Optional)
                  </label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the avatar style..."
                    className="bg-white/5 border-white/10 text-white min-h-24"
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={
                    !imageUrl || generateMutation.isPending || !!generatingJobId
                  }
                  className="w-full h-12 bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-90"
                >
                  {generateMutation.isPending || generatingJobId ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>Create Avatar (8 credits)</>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* Right: Generation History */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Recent Avatars</h2>
            <div className="grid grid-cols-2 gap-4">
              {generations?.map((gen) => (
                <Card
                  key={gen.id}
                  className="p-3 bg-white/5 border border-white/10 rounded-lg"
                >
                  {gen.status === "completed" && gen.output_url ? (
                    <>
                      <img
                        src={gen.output_url}
                        alt="Avatar"
                        className="w-full aspect-square object-cover rounded-lg mb-3"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-white/10"
                        onClick={() => window.open(gen.output_url, "_blank")}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </>
                  ) : gen.status === "processing" ? (
                    <div className="aspect-square flex items-center justify-center bg-white/5 rounded-lg">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                    </div>
                  ) : (
                    <div className="aspect-square flex items-center justify-center bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-500">Failed</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {new Date(gen.created_date).toLocaleDateString()}
                  </p>
                </Card>
              ))}

              {!generations?.length && (
                <div className="col-span-2 text-center py-12">
                  <p className="text-gray-400">
                    No avatars yet. Create your first one!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
