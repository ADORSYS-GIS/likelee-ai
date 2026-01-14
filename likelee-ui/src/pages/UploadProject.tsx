import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Upload, X, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

const projectTypes = [
  "reel",
  "short_film",
  "campaign",
  "edit",
  "commercial",
  "music_video",
  "other",
];
const aiTools = [
  "Sora",
  "Runway Gen-3",
  "Runway Gen-4",
  "Midjourney",
  "Pika Labs",
  "Fal AI",
  "Kaiber",
  "Stable Diffusion",
  "Luma Dream Machine",
  "Google Veo",
];
const skills = [
  "AI Video Editing",
  "Lip-sync Animation",
  "Compositing",
  "Script-to-Video",
  "Color Grading",
  "Motion Graphics",
  "Storytelling",
  "Product Visualization",
];

export default function UploadProject() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const [project, setProject] = useState({
    title: "",
    description: "",
    project_type: "",
    tools_used: [],
    skills_showcased: [],
    external_url: "",
    duration_seconds: "",
  });

  const toggleArrayItem = (field, value) => {
    setProject((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));
  };

  const handleSubmit = () => {
    if (!project.title || !project.description || !project.project_type) {
      toast({
        title: t("uploadProject.toasts.missingFields"),
        description: t("uploadProject.toasts.missingFieldsDesc"),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      toast({
        title: t("common.success"),
        description: t("uploadProject.toasts.projectUploaded"),
      });
      navigate(createPageUrl("DemoTalentDashboard"));
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-rose-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <Alert className="mb-8 bg-[#F18B6A]/10 border-2 border-[#F18B6A] rounded-none">
          <AlertCircle className="h-5 w-5 text-[#F18B6A]" />
          <AlertDescription className="text-gray-900">
            <strong>Demo Mode:</strong> This is a preview page. Real uploads
            will be available after sign up!
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => navigate(createPageUrl("DemoTalentDashboard"))}
            variant="outline"
            className="border-2 border-black rounded-none"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Upload New Project
            </h1>
            <p className="text-gray-600">Showcase your AI creative work</p>
          </div>
        </div>

        <Card className="p-8 bg-white border-2 border-black rounded-none">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Project Title *
              </Label>
              <Input
                value={project.title}
                onChange={(e) =>
                  setProject({ ...project, title: e.target.value })
                }
                placeholder="Nike AI Campaign - 'Future of Sport'"
                className="border-2 border-gray-300 rounded-none"
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Description *
              </Label>
              <Textarea
                value={project.description}
                onChange={(e) =>
                  setProject({ ...project, description: e.target.value })
                }
                placeholder="Describe your project, the creative process, and what makes it unique..."
                className="min-h-[120px] border-2 border-gray-300 rounded-none"
              />
            </div>

            {/* Project Type */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Project Type *
              </Label>
              <Select
                value={project.project_type}
                onValueChange={(value) =>
                  setProject({ ...project, project_type: value })
                }
              >
                <SelectTrigger className="border-2 border-gray-300 rounded-none">
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type
                        .split("_")
                        .map(
                          (word) =>
                            word.charAt(0).toUpperCase() + word.slice(1),
                        )
                        .join(" ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Media Upload */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Upload Video/Image
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-none p-12 text-center hover:border-[#F18B6A] transition-colors cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 font-medium mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-gray-500">
                  MP4, MOV, PNG, JPG (max 500MB)
                </p>
              </div>
            </div>

            {/* AI Tools Used */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                AI Tools Used
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {aiTools.map((tool) => (
                  <div
                    key={tool}
                    onClick={() => toggleArrayItem("tools_used", tool)}
                    className={`p-3 border-2 rounded-none cursor-pointer transition-all ${
                      project.tools_used.includes(tool)
                        ? "border-[#F18B6A] bg-[#F18B6A]/10"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {tool}
                      </span>
                      {project.tools_used.includes(tool) && (
                        <CheckCircle2 className="w-4 h-4 text-[#F18B6A]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills Showcased */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Skills Showcased
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {skills.map((skill) => (
                  <div
                    key={skill}
                    onClick={() => toggleArrayItem("skills_showcased", skill)}
                    className={`p-3 border-2 rounded-none cursor-pointer transition-all ${
                      project.skills_showcased.includes(skill)
                        ? "border-[#32C8D1] bg-[#32C8D1]/10"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {skill}
                      </span>
                      {project.skills_showcased.includes(skill) && (
                        <CheckCircle2 className="w-4 h-4 text-[#32C8D1]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Duration (seconds)
                </Label>
                <Input
                  type="number"
                  value={project.duration_seconds}
                  onChange={(e) =>
                    setProject({ ...project, duration_seconds: e.target.value })
                  }
                  placeholder="45"
                  className="border-2 border-gray-300 rounded-none"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  External URL (Optional)
                </Label>
                <Input
                  value={project.external_url}
                  onChange={(e) =>
                    setProject({ ...project, external_url: e.target.value })
                  }
                  placeholder="https://youtube.com/watch?v=..."
                  className="border-2 border-gray-300 rounded-none"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-6 border-t">
              <Button
                onClick={() => navigate(createPageUrl("DemoTalentDashboard"))}
                variant="outline"
                className="flex-1 border-2 border-black rounded-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={uploading}
                className="flex-1 bg-gradient-to-r from-[#F18B6A] to-[#E07A5A] hover:from-[#E07A5A] hover:to-[#D06A4A] text-white border-2 border-black rounded-none"
              >
                {uploading ? "Uploading..." : "Upload Project"}
                {!uploading && <CheckCircle2 className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
