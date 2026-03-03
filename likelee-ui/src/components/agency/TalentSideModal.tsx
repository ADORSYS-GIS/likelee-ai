import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
} from "lucide-react";

import {
  createAgencyTalentInvite,
  getTalentCampaigns,
  updateAgencyTalent,
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
  });
  const [editForm, setEditForm] = useState(buildEditForm());

  useEffect(() => {
    setEditForm(buildEditForm());
    setIsEditing(false);
  }, [talent?.id]);

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
            {/* Profile Header */}
            <div className="flex gap-5 items-start">
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                <img
                  src={talent.img || "https://placehold.co/150"}
                  className="w-full h-full object-cover"
                  alt={talent.name}
                />
              </div>
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
                      className="w-full aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                      onClick={() => window.open(u, "_blank")}
                    >
                      <img
                        src={u}
                        alt="Gallery"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isEditing && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-700">
                      Full name
                    </div>
                    <Input
                      value={editForm.full_name}
                      onChange={(e) => setField("full_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-700">
                      Stage name
                    </div>
                    <Input
                      value={editForm.stage_name}
                      onChange={(e) => setField("stage_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-700">Email</div>
                    <Input
                      value={editForm.email}
                      onChange={(e) => setField("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-700">Phone</div>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-700">
                      Gender
                    </div>
                    <Input
                      value={editForm.gender_identity}
                      onChange={(e) =>
                        setField("gender_identity", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-700">
                      Instagram
                    </div>
                    <Input
                      value={editForm.instagram_handle}
                      onChange={(e) =>
                        setField("instagram_handle", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-700">
                      Categories
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {roleCategories.map((v) => {
                        const selected = Array.isArray(
                          (editForm as any).role_types,
                        )
                          ? ((editForm as any).role_types as string[]).includes(
                              v,
                            )
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
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-700">
                      Hair color
                    </div>
                    <Input
                      value={editForm.hair_color}
                      onChange={(e) => setField("hair_color", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-700">
                      Eye color
                    </div>
                    <Input
                      value={editForm.eye_color}
                      onChange={(e) => setField("eye_color", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-700">
                      Height (ft)
                    </div>
                    <Input
                      type="number"
                      value={editForm.height_feet}
                      onChange={(e) => setField("height_feet", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-700">
                      Height (in)
                    </div>
                    <Input
                      type="number"
                      value={editForm.height_inches}
                      onChange={(e) =>
                        setField("height_inches", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-gray-700">Bio</div>
                  <Textarea
                    value={editForm.bio}
                    onChange={(e) => setField("bio", e.target.value)}
                    className="min-h-[110px]"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-gray-700">
                    Race / Ethnicity (comma separated)
                  </div>
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
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-gray-700">
                    Special skills (comma separated)
                  </div>
                  <Input
                    value={editForm.special_skills}
                    onChange={(e) => setField("special_skills", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-700">City</div>
                    <Input
                      value={editForm.city}
                      onChange={(e) => setField("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-700">State</div>
                    <Input
                      value={editForm.state_province}
                      onChange={(e) =>
                        setField("state_province", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-700">
                      Country
                    </div>
                    <Input
                      value={editForm.country}
                      onChange={(e) => setField("country", e.target.value)}
                    />
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

            {/* License Status */}
            <div className="p-4 rounded-xl border border-blue-50 bg-blue-50/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  License Status
                </div>
                <Badge
                  variant="outline"
                  className={`bg-white font-bold border-none ${
                    talent.consent === "complete"
                      ? "text-green-600 bg-green-50"
                      : "text-red-600 bg-red-50"
                  }`}
                >
                  {talent.consent || "missing"}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Consent:</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {talent.consent || "missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expiry Date:</span>
                  <span className="font-medium text-gray-900">—</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-500">AI Usage:</span>
                  <span className="font-medium text-gray-900 text-right max-w-[120px]">
                    {/* Placeholder or empty */}
                  </span>
                </div>
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
