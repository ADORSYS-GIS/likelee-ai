import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Instagram,
  TrendingUp,
  Image,
  DollarSign,
  ShieldCheck,
  FileText,
  Mail,
  Loader2,
  RefreshCw,
  Pencil,
  X,
  Maximize2,
} from "lucide-react";

import {
  createAgencyTalentInvite,
  getTalentCampaigns,
  updateAgencyTalent,
  uploadTalentAsset,
  scrapeInstagramProfile,
} from "@/api/functions";

interface TalentSideModalProps {
  talent: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const TalentSideModal = ({
  talent,
  open,
  onOpenChange,
  onSaved,
}: TalentSideModalProps) => {
  const { toast } = useToast();
  const safeTextFromMaybeJsonArray = (v: any): string => {
    if (v === null || v === undefined) return "";
    if (Array.isArray(v)) return v.filter(Boolean).join(", ");
    const s = String(v);
    const t = s.trim();
    if (t.startsWith("[") && t.endsWith("]")) {
      try {
        const arr = JSON.parse(t);
        if (Array.isArray(arr)) return arr.filter(Boolean).join(", ");
      } catch (_) {}
    }
    return s;
  };

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fetchingInstagram, setFetchingInstagram] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const roleCategories = ["Model", "Actor", "Creator", "Voice", "Athlete"];
  const skillsText = safeTextFromMaybeJsonArray(
    (talent as any)?.special_skills,
  );
  const roleTypes = React.useMemo(() => {
    const raw = (talent as any)?.role_types;
    if (Array.isArray(raw)) {
      return (raw as any[])
        .filter((x) => typeof x === "string")
        .map((s) => String(s).trim())
        .filter(Boolean);
    }
    const role = safeTextFromMaybeJsonArray((talent as any)?.role);
    return role ? [role] : [];
  }, [talent]);
  const galleryUrls = React.useMemo(() => {
    const raw = (talent as any)?.photo_urls;
    const urls = Array.isArray(raw)
      ? (raw as any[]).filter((u) => typeof u === "string")
      : [];
    const img =
      typeof (talent as any)?.img === "string" ? (talent as any).img : "";
    const combined = [...urls];
    if (img && !combined.includes(img)) combined.unshift(img);
    return combined.filter(
      (u) => typeof u === "string" && u.trim().length > 0,
    ) as string[];
  }, [talent]);
  const skills = skillsText
    ? skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const safeTalent = talent || ({} as any);
  const buildEditForm = () => ({
    full_name: safeTalent.name || "",
    stage_name: safeTalent.stage_name || "",
    email: safeTalent.email || "",
    phone: safeTalent.phone || "",
    bio: safeTalent.bio || "",
    instagram_handle: safeTalent.instagram_handle || "",
    instagram_followers:
      safeTalent.followers ?? safeTalent.instagram_followers ?? "",
    engagement_rate: safeTalent.engagement_rate ?? "",
    role_types: roleTypes,
    gender_identity: safeTalent.gender_identity || "",
    hair_color: safeTalent.hair_color || "",
    eye_color: safeTalent.eye_color || "",
    height_feet: safeTalent.height_feet ?? "",
    height_inches: safeTalent.height_inches ?? "",
    race_ethnicity: Array.isArray(safeTalent.race_ethnicity)
      ? safeTalent.race_ethnicity
      : [],
    special_skills: skillsText || "",
    city: safeTalent.city || "",
    state_province: safeTalent.state_province || "",
    country: safeTalent.country || "",
    licensing_rate_monthly_usd:
      typeof safeTalent.licensing_rate_monthly_cents === "number" &&
      safeTalent.licensing_rate_monthly_cents > 0
        ? String(Math.round(safeTalent.licensing_rate_monthly_cents / 100))
        : "",
    accept_negotiations: safeTalent.accept_negotiations ?? true,
    rate_currency: safeTalent.rate_currency || "USD",
  });
  const [editForm, setEditForm] = useState(buildEditForm());

  useEffect(() => {
    setEditForm(buildEditForm());
    setIsEditing(false);
  }, [talent?.id]);

  const [showPhotoFull, setShowPhotoFull] = useState(false);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    setLocalPhotoUrl(null); // Reset when talent changes
  }, [talent?.id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !talent?.id) return;

    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res: any = await uploadTalentAsset(talent.id, fd);
      const newImg = res?.public_url || res?.url || "";
      if (newImg) {
        await updateAgencyTalent(talent.id, { profile_photo_url: newImg });
        setLocalPhotoUrl(newImg);
        toast({ title: "Photo updated successfully" });
        onSaved?.();
      } else {
        throw new Error("No URL returned from upload");
      }
    } catch (err: any) {
      toast({
        title: "Photo upload failed",
        description: err.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!open || !talent?.id) return;
      setCampaignsLoading(true);
      try {
        const resp = (await getTalentCampaigns(talent.id)) as any;
        if (!mounted) return;
        setCampaigns(Array.isArray(resp) ? resp : []);
      } catch (_e) {
        if (!mounted) return;
        setCampaigns([]);
      } finally {
        if (!mounted) return;
        setCampaignsLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [open, talent?.id]);

  const formatCampaignAmount = (v: any) => {
    if (v === null || v === undefined || v === "") return "—";
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return "—";
    return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  const setField = (k: string, v: any) => {
    setEditForm((prev: any) => ({ ...prev, [k]: v }));
  };

  const toggleRoleCategory = (category: string) => {
    const current = Array.isArray((editForm as any).role_types)
      ? ((editForm as any).role_types as string[])
      : [];
    if (current.includes(category)) {
      setField(
        "role_types",
        current.filter((c) => c !== category),
      );
    } else {
      setField("role_types", [...current, category]);
    }
  };

  const fetchInstagramData = async () => {
    const handle = editForm.instagram_handle?.trim().replace("@", "");
    if (!handle) return;

    setFetchingInstagram(true);
    try {
      const data = await scrapeInstagramProfile(handle);

      if (data?.success && data?.profile) {
        setField("instagram_followers", data.profile?.followers || 0);
      }
    } catch (e) {
      // Silently fail - user can proceed without Instagram data
    } finally {
      setFetchingInstagram(false);
    }
  };

  const sendPortalInvite = async () => {
    const email = String((talent as any)?.email || "").trim();
    if (!email) {
      toast({
        title: "Missing email",
        description: "This talent does not have an email on file.",
        variant: "destructive",
      });
      return;
    }

    setInviteSending(true);
    try {
      const res: any = await createAgencyTalentInvite({ email });
      if (String(res?.invite_status || "") === "already_connected") {
        toast({
          title: "Already connected",
          description:
            "This creator is already connected to your agency. No new invite was sent.",
        });
        return;
      }
      toast({
        title: "Portal invite sent",
        description: `Invitation sent to ${email}`,
      });
    } catch (e: any) {
      toast({
        title: "Failed to send portal invite",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setInviteSending(false);
    }
  };

  const save = async () => {
    try {
      setIsSaving(true);
      await updateAgencyTalent(talent.id, {
        full_name: editForm.full_name,
        stage_name: editForm.stage_name || undefined,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        bio: editForm.bio || undefined,
        instagram_handle: editForm.instagram_handle || undefined,
        instagram_followers:
          editForm.instagram_followers !== "" &&
          editForm.instagram_followers !== undefined
            ? Number(editForm.instagram_followers)
            : undefined,
        engagement_rate:
          editForm.engagement_rate !== "" &&
          editForm.engagement_rate !== undefined
            ? Number(editForm.engagement_rate)
            : undefined,
        role_type: Array.isArray(editForm.role_types)
          ? editForm.role_types
          : undefined,
        gender_identity: editForm.gender_identity || undefined,
        hair_color: editForm.hair_color || undefined,
        eye_color: editForm.eye_color || undefined,
        height_feet:
          editForm.height_feet === ""
            ? undefined
            : Number(editForm.height_feet),
        height_inches:
          editForm.height_inches === ""
            ? undefined
            : Number(editForm.height_inches),
        race_ethnicity: editForm.race_ethnicity,
        special_skills: editForm.special_skills || undefined,
        city: editForm.city || undefined,
        state_province: editForm.state_province || undefined,
        country: editForm.country || undefined,
        licensing_rate_monthly_cents: editForm.licensing_rate_monthly_usd
          ? Math.round(Number(editForm.licensing_rate_monthly_usd) * 100)
          : undefined,
        accept_negotiations: !!editForm.accept_negotiations,
        rate_currency: String(editForm.rate_currency || "USD"),
      });
      setIsEditing(false);
      onSaved?.();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto bg-white p-6 border-l border-gray-200 shadow-2xl">
        <SheetHeader className="mb-6 flex flex-row items-center justify-between border-b border-gray-100 pb-4 space-y-0">
          <SheetTitle className="text-xl font-bold text-gray-900">
            Talent Details
          </SheetTitle>
          <SheetDescription className="sr-only">
            Talent details
          </SheetDescription>
          {/* Close button is handled by Sheet primitive usually, but we can have custom if needed */}
        </SheetHeader>

        {!talent ? (
          <div className="py-10 text-center text-sm text-gray-500 font-medium">
            No talent selected.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-5 items-start">
              <div className="relative shrink-0">
                <div
                  className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden relative group cursor-zoom-in border border-gray-200"
                  onClick={() => setShowPhotoFull(true)}
                >
                  <img
                    src={
                      localPhotoUrl ||
                      talent.profile_photo_url ||
                      talent.img ||
                      "https://placehold.co/150"
                    }
                    className="w-full h-full object-contain"
                    alt={talent.name}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Obvious Change button */}
                <label className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 shadow-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors group">
                  {uploadingPhoto ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#32C8D1]" />
                  ) : (
                    <Pencil className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#32C8D1]" />
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>

              {/* Full Photo Dialog */}
              <Dialog open={showPhotoFull} onOpenChange={setShowPhotoFull}>
                <DialogContent className="max-w-2xl p-0 bg-transparent border-none shadow-none flex items-center justify-center">
                  <div className="relative group">
                    <img
                      src={talent.img || "https://placehold.co/800"}
                      className="max-h-[85vh] rounded-lg shadow-2xl"
                      alt={talent.name}
                    />
                    <button
                      onClick={() => setShowPhotoFull(false)}
                      className="absolute -top-10 right-0 text-white hover:text-[#32C8D1] transition-colors"
                    >
                      Close X
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {talent.name}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {roleTypes.length > 0 ? (
                    roleTypes.slice(0, 3).map((r) => (
                      <Badge
                        key={r}
                        variant="secondary"
                        className="bg-gray-100 text-gray-600 border-none font-bold text-[10px]"
                      >
                        {r}
                      </Badge>
                    ))
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 text-gray-600 border-none font-bold text-[10px]"
                    >
                      {safeTextFromMaybeJsonArray(talent.role) || "Model"}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 leading-tight">
                  {talent.bio || ""}
                </p>
              </div>
            </div>

            {skillsText && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Special skills
                </div>
                <div className="text-sm text-gray-700">{skillsText}</div>
              </div>
            )}

            {/* Media (Video/Voice) */}
            {(talent.video_url || talent.voice_sample_url) && (
              <div className="space-y-4">
                {talent.video_url && (
                  <div>
                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-2">
                      Hero Video
                    </div>
                    <div className="rounded-xl overflow-hidden border border-gray-100 bg-black shadow-sm">
                      <video
                        src={talent.video_url}
                        controls
                        className="w-full aspect-video"
                      />
                    </div>
                  </div>
                )}
                {talent.voice_sample_url && (
                  <div>
                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-2">
                      Voice Sample
                    </div>
                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex flex-col gap-2 shadow-sm">
                      <audio
                        src={talent.voice_sample_url}
                        controls
                        className="w-full h-8"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {galleryUrls.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase font-bold text-gray-400">
                    Photo Gallery
                  </div>
                  <div className="text-[10px] font-bold text-gray-400">
                    {galleryUrls.length}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {galleryUrls.slice(0, 12).map((u) => (
                    <button
                      key={u}
                      type="button"
                      className="w-full aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shadow-sm hover:shadow-md transition-shadow"
                      onClick={() => window.open(u, "_blank")}
                    >
                      <img
                        src={u}
                        alt="Gallery"
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isEditing && (
              <div className="space-y-5">
                {/* Identity */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                    Identity
                  </h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600">
                          Full name
                        </label>
                        <Input
                          value={editForm.full_name}
                          onChange={(e) =>
                            setField("full_name", e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600">
                          Stage name
                        </label>
                        <Input
                          value={editForm.stage_name}
                          onChange={(e) =>
                            setField("stage_name", e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600">
                          Email
                        </label>
                        <Input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setField("email", e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600">
                          Phone
                        </label>
                        <Input
                          value={editForm.phone}
                          onChange={(e) => setField("phone", e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                    Social
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600">
                        Instagram
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            value={editForm.instagram_handle}
                            onChange={(e) =>
                              setField("instagram_handle", e.target.value)
                            }
                            placeholder="@handle"
                            className="h-9 pr-20"
                          />
                          {fetchingInstagram ? (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded-md">
                              <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
                              <span className="text-[11px] font-medium text-indigo-600">
                                Syncing
                              </span>
                            </div>
                          ) : editForm.instagram_followers > 0 ? (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-green-50 rounded-md">
                              <span className="text-[11px] font-medium text-green-700">
                                {(
                                  editForm.instagram_followers as number
                                ).toLocaleString()}
                              </span>
                            </div>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={fetchInstagramData}
                          disabled={
                            fetchingInstagram || !editForm.instagram_handle
                          }
                          className="h-9 whitespace-nowrap"
                        >
                          {fetchingInstagram ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Instagram className="w-3 h-3 mr-1" />
                              Connect
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600">
                          Followers
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="e.g. 12500"
                          value={editForm.instagram_followers}
                          onChange={(e) =>
                            setField("instagram_followers", e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600">
                          Engagement rate (%)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="e.g. 3.5"
                          value={editForm.engagement_rate}
                          onChange={(e) =>
                            setField("engagement_rate", e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                    Categories
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {roleCategories.map((v) => {
                      const selected = Array.isArray(
                        (editForm as any).role_types,
                      )
                        ? ((editForm as any).role_types as string[]).includes(v)
                        : false;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleRoleCategory(v)}
                          className="rounded-lg"
                        >
                          <Badge
                            variant="secondary"
                            className={
                              selected
                                ? "bg-indigo-600 text-white border-none font-bold"
                                : "bg-gray-100 text-gray-700 border-none font-bold"
                            }
                          >
                            {v}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Appearance */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                    Appearance
                  </h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600">
                          Gender
                        </label>
                        <Input
                          value={editForm.gender_identity}
                          onChange={(e) =>
                            setField("gender_identity", e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600">
                          Hair color
                        </label>
                        <Input
                          value={editForm.hair_color}
                          onChange={(e) =>
                            setField("hair_color", e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600">
                          Eye color
                        </label>
                        <Input
                          value={editForm.eye_color}
                          onChange={(e) =>
                            setField("eye_color", e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600">
                          Height (ft)
                        </label>
                        <Input
                          type="number"
                          value={editForm.height_feet}
                          onChange={(e) =>
                            setField("height_feet", e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600">
                          Height (in)
                        </label>
                        <Input
                          type="number"
                          value={editForm.height_inches}
                          onChange={(e) =>
                            setField("height_inches", e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600">
                        Race / Ethnicity
                      </label>
                      <Input
                        value={(editForm.race_ethnicity || []).join(", ")}
                        onChange={(e) =>
                          setField(
                            "race_ethnicity",
                            e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          )
                        }
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                    Details
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600">
                        Bio
                      </label>
                      <Textarea
                        value={editForm.bio}
                        onChange={(e) => setField("bio", e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600">
                        Special skills
                      </label>
                      <Input
                        value={editForm.special_skills}
                        onChange={(e) =>
                          setField("special_skills", e.target.value)
                        }
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                    Location
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600">
                        City
                      </label>
                      <Input
                        value={editForm.city}
                        onChange={(e) => setField("city", e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600">
                        State
                      </label>
                      <Input
                        value={editForm.state_province}
                        onChange={(e) =>
                          setField("state_province", e.target.value)
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600">
                        Country
                      </label>
                      <Input
                        value={editForm.country}
                        onChange={(e) => setField("country", e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Business */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                    Business
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600">
                        Licensing rate (USD/mo)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={editForm.licensing_rate_monthly_usd}
                        onChange={(e) =>
                          setField("licensing_rate_monthly_usd", e.target.value)
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600">
                        Negotiation
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700 mt-1">
                        <input
                          type="checkbox"
                          checked={!!editForm.accept_negotiations}
                          onChange={(e) =>
                            setField("accept_negotiations", e.target.checked)
                          }
                        />
                        Open to negotiations
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Instagram Followers
                </p>
                <p className="text-xl font-bold text-gray-900 flex items-center gap-1">
                  {talent.followers || "0"}
                </p>
              </div>
              <div className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Engagement Rate
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {talent.engagement_rate || 0}%
                </p>
              </div>
              <div className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Total Assets
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {talent.assets || 0}
                </p>
              </div>
              <div className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                  30D Earnings
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {talent.earnings || "$0"}
                </p>
              </div>
            </div>

            {/* Recent Campaigns */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <FileText className="w-4 h-4" /> Recent Campaigns
              </h3>
              {campaignsLoading ? (
                <div className="p-8 text-center text-gray-400 text-sm italic border border-dashed border-gray-200 rounded-xl">
                  Loading campaigns…
                </div>
              ) : campaigns.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm italic border border-dashed border-gray-200 rounded-xl">
                  No campaigns yet
                </div>
              ) : (
                <div className="space-y-2">
                  {campaigns.slice(0, 3).map((c: any) => (
                    <div
                      key={c.id}
                      className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {c.name || "Untitled campaign"}
                        </p>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                          {c.date || "—"}
                        </p>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-xs text-gray-500 font-bold">
                            Talent earns
                          </div>
                          <div className="text-xs font-bold text-gray-900">
                            {(() => {
                              const cents = Number(c?.talent_earnings_cents);
                              if (!Number.isFinite(cents)) return "—";
                              return `$${(cents / 100).toFixed(2)}`;
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-3">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCampaignAmount(c.payment_amount)}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                          {c.status || "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4">
              {isEditing ? (
                <>
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 shadow-lg shadow-indigo-100 gap-2"
                    onClick={save}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-gray-200 text-gray-700 font-bold h-10 gap-2"
                    onClick={() => {
                      setEditForm(buildEditForm());
                      setIsEditing(false);
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 gap-2"
                    onClick={sendPortalInvite}
                    disabled={isSaving || inviteSending}
                  >
                    {inviteSending ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending…
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Send Portal Invite
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-gray-200 text-gray-700 font-bold h-10 gap-2"
                    onClick={() => setIsEditing(true)}
                    disabled={isSaving || inviteSending}
                  >
                    <Pencil className="w-4 h-4" /> Edit Profile
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default TalentSideModal;
