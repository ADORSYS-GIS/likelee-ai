import React, { useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Camera, Upload } from "lucide-react";

type FileState = {
  file?: File;
  previewUrl?: string;
  uploading: boolean;
  progress: number;
  downloadUrl?: string;
  error?: string;
};

function FilePicker({
  label,
  accept = "video/*",
  onChange,
  value,
  previewUrl,
  capture = true,
}: {
  label: string;
  accept?: string;
  onChange: (file: File | undefined) => void;
  value?: File;
  previewUrl?: string;
  capture?: boolean;
}) {
  const inputId = useMemo(
    () =>
      `file-${label.replace(/\s+/g, "-").toLowerCase()}-${Math.random().toString(36).slice(2)}`,
    [label],
  );
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground/90">
        {label}
      </label>
      <input
        id={inputId}
        className="hidden"
        type="file"
        accept={accept}
        capture={capture ? "user" : undefined}
        onChange={(e) => onChange(e.target.files?.[0])}
      />
      <label htmlFor={inputId} className="block cursor-pointer">
        <div className="relative w-full h-80 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors">
          {previewUrl ? (
            <video
              src={previewUrl}
              className="absolute inset-0 w-full h-full object-cover"
              controls
            />
          ) : (
            <div className="flex flex-col items-center text-center px-4">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">
                Click to upload {label.toLowerCase()}
              </p>
              <p className="text-xs text-gray-500">
                Or open camera on mobile{" "}
                <Camera className="inline w-4 h-4 ml-1 align-text-top" />
              </p>
            </div>
          )}
        </div>
      </label>
      {value && (
        <div className="text-xs text-muted-foreground truncate">
          {value.name}
        </div>
      )}
    </div>
  );
}

export default function CameoUpload() {
  const { user } = useAuth();
  const [video, setVideo] = useState<FileState>({
    uploading: false,
    progress: 0,
  });

  const anyUploading = video.uploading;

  const handlePick = (file?: File) => {
    const isVideo = file ? file.type.startsWith("video/") : true;
    setVideo((prev) => ({
      ...prev,
      file,
      previewUrl: file && isVideo ? URL.createObjectURL(file) : undefined,
      error: file && !isVideo ? "Please upload a video file" : undefined,
    }));
  };

  // Prefill from existing profile cameo_*_url if present
  React.useEffect(() => {
    (async () => {
      try {
        if (!user || !supabase) return;
        const { data, error } = await supabase
          .from("creators")
          .select("cameo_front_url")
          .eq("id", user.id)
          .maybeSingle();
        if (!error && data && data.cameo_front_url) {
          setVideo((prev) => ({
            ...prev,
            previewUrl: data.cameo_front_url || prev.previewUrl,
            downloadUrl: data.cameo_front_url || prev.downloadUrl,
            uploading: false,
            progress: data.cameo_front_url ? 100 : prev.progress,
          }));
          return;
        }
        // Fallback: read from Storage if DB columns are empty or row missing
        const prefix = `faces/${user.id}/train`;
        const { data: files, error: listErr } = await supabase.storage
          .from("likelee-public")
          .list(prefix, { limit: 100 });
        if (listErr || !files) return;
        const mp4 = files.find((f) => f.name.toLowerCase().endsWith(".mp4"));
        if (mp4) {
          const { data: pub } = supabase.storage
            .from("likelee-public")
            .getPublicUrl(`${prefix}/${mp4.name}`);
          setVideo((prev) => ({
            ...prev,
            previewUrl: pub.publicUrl,
            downloadUrl: pub.publicUrl,
            uploading: false,
            progress: 100,
          }));
        }
      } catch (_) {}
    })();
  }, [user]);

  const uploadVideo = async (file: File): Promise<string> => {
    if (!user) throw new Error("Not authenticated");
    if (!supabase) throw new Error("Supabase not configured");
    const path = `faces/${user.id}/train/train.mp4`;
    setVideo((prev) => ({
      ...prev,
      uploading: true,
      progress: 0,
      error: undefined,
    }));
    const { error } = await supabase.storage
      .from("likelee-public")
      .upload(path, file, {
        upsert: true,
        contentType: file.type || "video/mp4",
      });
    if (error) {
      setVideo((prev) => ({ ...prev, uploading: false, error: error.message }));
      throw error;
    }
    const { data } = supabase.storage.from("likelee-public").getPublicUrl(path);
    const url = data.publicUrl;
    setVideo((prev) => ({
      ...prev,
      uploading: false,
      downloadUrl: url,
      progress: 100,
    }));
    // Persist the training video url back to profiles
    try {
      await supabase
        .from("creators")
        .update({ cameo_front_url: url })
        .eq("id", user.id);
    } catch (_) {}
    return url;
  };

  const handleUploadAll = async () => {
    if (!user) {
      toast.error("Please log in to upload a training video");
      return;
    }
    if (!video.file) {
      toast.error("Please select a short training video.");
      return;
    }

    try {
      await uploadVideo(video.file!);
      toast.success("Training video uploaded successfully");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed, please try again");
    }
  };

  return (
    <div className="w-full px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Cameo Images</CardTitle>
          <CardDescription>
            Upload a short training video of yourself. Ensure good lighting and
            a clear view of your face. Include the required consent statement at
            the beginning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 md:p-10 min-h-96">
            <div className="mb-6 text-center">
              <p className="text-sm text-gray-600">
                MP4 recommended. 30–120 seconds. Keep a neutral expression,
                speak the consent statement clearly, and ensure good lighting.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <FilePicker
                  label={`Training video`}
                  onChange={(f) => handlePick(f)}
                  value={video.file}
                  previewUrl={video.previewUrl}
                  capture
                />
                {video.uploading && <Progress value={video.progress} />}
                {video.error && (
                  <p className="text-sm text-red-500">{video.error}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={handleUploadAll}
              disabled={!video.file || anyUploading}
            >
              {anyUploading ? "Uploading…" : "Upload video"}
            </Button>
            {!video.file && (
              <span className="text-sm text-muted-foreground">
                A short training video is required
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 text-sm text-muted-foreground">
        Tips: Use good lighting, keep a neutral expression, frame your face
        clearly, and read the consent statement at the start of the video.
      </div>
    </div>
  );
}
