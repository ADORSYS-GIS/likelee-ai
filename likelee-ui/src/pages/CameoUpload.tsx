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

// Views required for reference avatar creation
const REQUIRED_VIEWS = [
  { key: "front", label: "Front" },
  { key: "left", label: "Left side" },
  { key: "right", label: "Right side" },
] as const;

type ViewKey = (typeof REQUIRED_VIEWS)[number]["key"];

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
  accept = "image/*",
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
            <img
              src={previewUrl}
              alt={`${label} preview`}
              className="absolute inset-0 w-full h-full object-cover"
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

  const [states, setStates] = useState<Record<ViewKey, FileState>>({
    front: { uploading: false, progress: 0 },
    left: { uploading: false, progress: 0 },
    right: { uploading: false, progress: 0 },
  });

  const allSelected = useMemo(
    () => REQUIRED_VIEWS.every(({ key }) => !!states[key].file),
    [states],
  );

  const anyUploading = useMemo(
    () => REQUIRED_VIEWS.some(({ key }) => states[key].uploading),
    [states],
  );

  const handlePick = (key: ViewKey, file?: File) => {
    const isImage = file ? file.type.startsWith("image/") : true;
    setStates((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        file,
        previewUrl: file && isImage ? URL.createObjectURL(file) : undefined,
        error: file && !isImage ? "Please upload an image file" : undefined,
      },
    }));
  };

  // Prefill from existing profile cameo_*_url if present
  React.useEffect(() => {
    (async () => {
      try {
        if (!user || !supabase) return;
        const { data, error } = await supabase
          .from("profiles")
          .select("cameo_front_url, cameo_left_url, cameo_right_url")
          .eq("id", user.id)
          .maybeSingle();
        if (
          !error &&
          data &&
          (data.cameo_front_url || data.cameo_left_url || data.cameo_right_url)
        ) {
          setStates(
            (prev) =>
              ({
                front: {
                  ...prev.front,
                  previewUrl: data.cameo_front_url || prev.front.previewUrl,
                  downloadUrl: data.cameo_front_url || prev.front.downloadUrl,
                  uploading: false,
                  progress: data.cameo_front_url ? 100 : prev.front.progress,
                },
                left: {
                  ...prev.left,
                  previewUrl: data.cameo_left_url || prev.left.previewUrl,
                  downloadUrl: data.cameo_left_url || prev.left.downloadUrl,
                  uploading: false,
                  progress: data.cameo_left_url ? 100 : prev.left.progress,
                },
                right: {
                  ...prev.right,
                  previewUrl: data.cameo_right_url || prev.right.previewUrl,
                  downloadUrl: data.cameo_right_url || prev.right.downloadUrl,
                  uploading: false,
                  progress: data.cameo_right_url ? 100 : prev.right.progress,
                },
              }) as any,
          );
          return;
        }
        // Fallback: read from Storage if DB columns are empty or row missing (no early profile creation)
        const prefix = `faces/${user.id}/reference`;
        const { data: files, error: listErr } = await supabase.storage
          .from("profiles")
          .list(prefix, { limit: 100 });
        if (listErr || !files) return;
        const byKey: Record<string, string> = {};
        files.forEach((f) => {
          const name = f.name.toLowerCase();
          let key: ViewKey | null = null;
          if (name.includes("front")) key = "front";
          else if (name.includes("left")) key = "left";
          else if (name.includes("right")) key = "right";
          if (key) {
            const { data: pub } = supabase.storage
              .from("profiles")
              .getPublicUrl(`${prefix}/${f.name}`);
            byKey[key] = pub.publicUrl;
          }
        });
        setStates(
          (prev) =>
            ({
              front: {
                ...prev.front,
                previewUrl: byKey.front || prev.front.previewUrl,
                downloadUrl: byKey.front || prev.front.downloadUrl,
                uploading: false,
                progress: byKey.front ? 100 : prev.front.progress,
              },
              left: {
                ...prev.left,
                previewUrl: byKey.left || prev.left.previewUrl,
                downloadUrl: byKey.left || prev.left.downloadUrl,
                uploading: false,
                progress: byKey.left ? 100 : prev.left.progress,
              },
              right: {
                ...prev.right,
                previewUrl: byKey.right || prev.right.previewUrl,
                downloadUrl: byKey.right || prev.right.downloadUrl,
                uploading: false,
                progress: byKey.right ? 100 : prev.right.progress,
              },
            }) as any,
        );
      } catch (_) { }
    })();
  }, [user]);

  const uploadOne = async (key: ViewKey, file: File): Promise<string> => {
    if (!user) throw new Error("Not authenticated");
    if (!supabase) throw new Error("Supabase not configured");
    // Pre-scan the raw bytes before storing
    try {
      const apiBase =
        (import.meta as any).env.VITE_API_BASE_URL ||
        (import.meta as any).env.VITE_API_BASE;
      const buf = await file.arrayBuffer();
      const res = await fetch(
        `${apiBase}/api/moderation/image-bytes?user_id=${encodeURIComponent(user.id)}&image_role=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "content-type": file.type || "image/jpeg" },
          body: new Uint8Array(buf),
        },
      );
      if (res.ok) {
        const out = await res.json();
        if (out?.flagged) {
          setStates((prev) => ({
            ...prev,
            [key]: {
              ...prev[key],
              uploading: false,
              error:
                "Image was flagged by moderation. Please upload a different photo.",
            },
          }));
          toast.error(
            `Your ${key} photo was flagged and cannot be used. Please upload a different photo.`,
          );
          throw new Error("Image flagged by moderation");
        }
      } else {
        // If the moderation endpoint fails, treat as error to avoid storing unscanned content
        const msg = await res.text();
        throw new Error(msg || "Moderation pre-scan failed");
      }
    } catch (e: any) {
      throw e;
    }
    const path = `faces/${user.id}/reference/${key}.jpg`;
    setStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], uploading: true, progress: 0, error: undefined },
    }));
    const { error } = await supabase.storage
      .from("profiles")
      .upload(path, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });
    if (error) {
      setStates((prev) => ({
        ...prev,
        [key]: { ...prev[key], uploading: false, error: error.message },
      }));
      throw error;
    }
    const { data } = supabase.storage.from("profiles").getPublicUrl(path);
    const url = data.publicUrl;

    // Call moderation endpoint (best-effort)
    try {
      const apiBase =
        (import.meta as any).env.VITE_API_BASE_URL ||
        (import.meta as any).env.VITE_API_BASE;
      const res = await fetch(`${apiBase}/api/moderation/image`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          image_url: url,
          user_id: user.id,
          image_role: key,
        }),
      });
      if (res.ok) {
        const out = await res.json();
        if (out?.flagged) {
          setStates((prev) => ({
            ...prev,
            [key]: {
              ...prev[key],
              uploading: false,
              error:
                "Image was flagged by moderation. Please upload a different photo.",
            },
          }));
          toast.error(
            `Your ${key} photo was flagged and cannot be used. Please upload a different photo.`,
          );
          throw new Error("Image flagged by moderation");
        }
      }
    } catch (_) {
      // non-blocking
    }

    setStates((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        uploading: false,
        downloadUrl: url,
        progress: 100,
      },
    }));
    // Persist the single cameo url back to profiles
    try {
      const column =
        key === "front"
          ? "cameo_front_url"
          : key === "left"
            ? "cameo_left_url"
            : "cameo_right_url";
      await supabase
        .from("profiles")
        .update({ [column]: url })
        .eq("id", user.id);
    } catch (_) { }
    return url;
  };

  const handleUploadAll = async () => {
    if (!user) {
      toast.error("Please log in to upload reference photos");
      return;
    }
    if (!allSelected) {
      toast.error("Please select all three photos (Front, Left, Right).");
      return;
    }

    try {
      const urls = await Promise.all(
        REQUIRED_VIEWS.map(({ key }) => uploadOne(key, states[key].file!)),
      );
      toast.success("Reference photos uploaded successfully");

      // Optional: notify backend to create/update face profile (no-op persistence in server now)
      const apiBase = import.meta.env.VITE_API_BASE;
      try {
        await fetch(`${apiBase}/api/face-profiles`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            references: {
              front: states.front.downloadUrl || urls[0],
              left: states.left.downloadUrl || urls[1],
              right: states.right.downloadUrl || urls[2],
            },
            created_at: new Date().toISOString(),
          }),
        });
      } catch (e) {
        // Non-blocking
        console.debug("face-profiles call skipped/failed", e);
      }
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
            Provide three clear photos of your face: front, left side, and right
            side. These will be used to build your avatar reference library.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 md:p-10 min-h-96">
            <div className="mb-6 text-center">
              <p className="text-sm text-gray-600">
                PNG or JPG, 1080x1080+ recommended. Keep a neutral expression,
                good lighting, and frame your face fully.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {REQUIRED_VIEWS.map(({ key, label }) => (
                <div key={key} className="space-y-3">
                  <FilePicker
                    label={`${label} photo`}
                    onChange={(f) => handlePick(key, f)}
                    value={states[key].file}
                    previewUrl={states[key].previewUrl}
                    capture
                  />
                  {states[key].uploading && (
                    <Progress value={states[key].progress} />
                  )}
                  {states[key].error && (
                    <p className="text-sm text-red-500">{states[key].error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={handleUploadAll}
              disabled={!allSelected || anyUploading}
            >
              {anyUploading ? "Uploading…" : "Upload all"}
            </Button>
            {!allSelected && (
              <span className="text-sm text-muted-foreground">
                All three photos are required
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 text-sm text-muted-foreground">
        Tips: Use good lighting, remove hats/glasses if possible, keep a neutral
        expression, and frame your face clearly.
      </div>
    </div>
  );
}
