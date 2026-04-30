import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  User,
  Settings,
  Send,
  Search,
  Eye,
  EyeOff,
  Calendar,
  Palette,
  Type,
  Building2,
  Mail,
  GripVertical,
  Trash2,
  Globe,
  SwitchCamera,
  Layers,
  Heart,
  MessageSquare,
  CheckCircle2,
  Copy,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { packageApi } from "@/api/packages";
import { useToast } from "@/components/ui/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { AssetSelector } from "./AssetSelector";
import { ensureHexColor } from "@/utils/color";
import { base44 } from "@/api/base44Client";
import { useTeamAccess } from "@/features/team/useTeamAccess";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";

export type CreatePackageWizardMode =
  | "template"
  | "package"
  | "send-from-template"
  | "offer-send"
  | "offer-send-from-template";

interface CreatePackageWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageToEdit?: any;
  onSuccess?: () => void;
  mode?: CreatePackageWizardMode;
  isSportsAgency?: boolean;
  offerContext?: { offerId: string; offerBrandId?: string } | null;
  // Called when the agency tries to select a talent who hasn't completed portal
  // onboarding. The parent should navigate to the roster and open that talent's
  // invite flow.
  onInviteTalent?: (talent: any) => void;
}

export function CreatePackageWizard({
  open,
  onOpenChange,
  packageToEdit,
  onSuccess,
  mode = "package",
  isSportsAgency = false,
  offerContext = null,
  onInviteTalent,
}: CreatePackageWizardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasPermission, loading: accessLoading } = useTeamAccess("agency");
  const canViewConnections = hasPermission("view_brand_connections");
  const entitySingularTitle = isSportsAgency ? "Athlete" : "Talent";
  const entityPluralTitle = isSportsAgency ? "Athletes" : "Talents";
  const entitySingularLower = isSportsAgency ? "athlete" : "talent";
  const entityPluralLower = isSportsAgency ? "athletes" : "talents";
  const steps = [
    {
      id: "basic",
      title: t("agencyDashboard.analytics.createPackage.steps.basic"),
      icon: Type,
    },
    {
      id: "talent",
      title: t("agencyDashboard.analytics.createPackage.steps.talent"),
      icon: User,
    },
    {
      id: "custom",
      title: t("agencyDashboard.analytics.createPackage.steps.custom"),
      icon: Palette,
    },
    {
      id: "consent",
      title: t("agencyDashboard.analytics.createPackage.steps.consent"),
      icon: ShieldCheck,
    },
    {
      id: "send",
      title: t("agencyDashboard.analytics.createPackage.steps.send"),
      icon: Send,
    },
  ];
  const [step, setStep] = useState(0);
  const [showTalentSelector, setShowTalentSelector] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  // Invite-required modal: shown when agency tries to select a talent without a creator_id
  const [inviteRequiredTalent, setInviteRequiredTalent] = useState<any>(null);
  const [activeTalentForAssets, setActiveTalentForAssets] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [createdPackage, setCreatedPackage] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!packageToEdit && mode !== "send-from-template";
  const isTemplateMode = mode === "template";
  const isOfferMode =
    mode === "offer-send" || mode === "offer-send-from-template";
  const totalSteps = isTemplateMode ? 4 : 5; // Templates end on Consents; packages add Send

  const initialFormData = {
    title: "",
    description: "",
    cover_image_url: "",
    primary_color: "#6366F1",
    secondary_color: "#06B6D4",
    custom_message: "",
    allow_comments: true,
    allow_favorites: true,
    allow_callbacks: true,
    consent_items: [
      "Use each selected asset only for the approved campaign objective and channels.",
      "Do not alter the athlete's/talent's likeness in misleading, harmful, or defamatory ways.",
      "Do not sublicense, resell, transfer, or share raw files with third parties.",
      "Do not use the assets for political, adult, tobacco, gambling, or illegal content.",
      "Stop all usage immediately after package or license expiry unless renewed in writing.",
    ],
    password_protected: false,
    password: "",
    expires_at: "",
    client_name: "",
    client_email: "",
    items: [] as any[],
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e?.target;
    const file = (input?.files?.[0] as File | undefined) ?? undefined;
    if (input) input.value = "";
    if (!file) return;

    if (!supabase || !user?.id) {
      toast({
        title: t(
          "agencyDashboard.analytics.createPackage.basicInfo.uploadUnavailable",
        ),
        description: t(
          "agencyDashboard.analytics.createPackage.basicInfo.uploadUnavailableDesc",
        ),
        variant: "destructive",
      });
      return;
    }

    if (!file.type?.startsWith("image/")) {
      toast({
        title: t(
          "agencyDashboard.analytics.createPackage.basicInfo.invalidFile",
        ),
        description: t(
          "agencyDashboard.analytics.createPackage.basicInfo.invalidFileDesc",
        ),
        variant: "destructive",
      });
      return;
    }

    setCoverUploading(true);
    try {
      const safeName = (file.name || "cover")
        .toString()
        .replace(/[^a-zA-Z0-9_.-]/g, "_");
      const ext = safeName.includes(".")
        ? safeName.split(".").pop()
        : file.type?.includes("png")
          ? "png"
          : "jpg";
      const rand =
        (globalThis as any)?.crypto?.randomUUID?.() ||
        `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const path = `agency/${user.id}/packages/covers/cover_${rand}.${ext}`;

      const { error } = await supabase.storage
        .from("likelee-public")
        .upload(path, file, {
          upsert: true,
          contentType: file.type || "image/jpeg",
        });
      if (error) throw error;

      const { data } = supabase.storage
        .from("likelee-public")
        .getPublicUrl(path);
      const publicUrl = data?.publicUrl || "";
      if (!publicUrl) {
        throw new Error("missing_public_url");
      }

      setFormData((prev) => ({ ...prev, cover_image_url: publicUrl }));
      toast({
        title: t(
          "agencyDashboard.analytics.createPackage.basicInfo.coverUploaded",
        ),
      });
    } catch (err: any) {
      const msg = String(err?.message || err);
      toast({
        title: t(
          "agencyDashboard.analytics.createPackage.basicInfo.coverUploadFailed",
        ),
        description: msg,
        variant: "destructive",
      });
    } finally {
      setCoverUploading(false);
    }
  };

  const [formData, setFormData] = useState(initialFormData);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(
    offerContext?.offerBrandId ? String(offerContext.offerBrandId) : "",
  );

  useEffect(() => {
    if (open && packageToEdit) {
      const rawItems = Array.isArray(packageToEdit.items)
        ? packageToEdit.items
        : [];
      const normalizedItems = rawItems
        .map((it: any) => {
          const embeddedTalent =
            it?.talent || it?.agency_users || it?.talent_profile || null;
          const talentId = String(
            it?.talent_id ||
              embeddedTalent?.id ||
              it?.creator_id ||
              it?.relationship_id ||
              it?.id ||
              "",
          ).trim();
          if (!talentId) return null;
          const assets = Array.isArray(it?.assets)
            ? it.assets
            : Array.isArray(it?.asset_ids)
              ? it.asset_ids
              : [];
          return {
            ...it,
            talent_id: talentId,
            assets,
            talent:
              embeddedTalent ||
              (it?.talent_name
                ? { id: talentId, full_name: it.talent_name }
                : null),
          };
        })
        .filter(Boolean);

      setFormData({
        title: packageToEdit.title || "",
        description: packageToEdit.description || "",
        cover_image_url: packageToEdit.cover_image_url || "",
        primary_color: packageToEdit.primary_color || "#6366F1",
        secondary_color: packageToEdit.secondary_color || "#06B6D4",
        custom_message: packageToEdit.custom_message || "",
        allow_comments: packageToEdit.allow_comments ?? true,
        allow_favorites: packageToEdit.allow_favorites ?? true,
        allow_callbacks: packageToEdit.allow_callbacks ?? true,
        consent_items:
          Array.isArray(packageToEdit.consent_items) &&
          packageToEdit.consent_items.length > 0
            ? packageToEdit.consent_items
            : initialFormData.consent_items,
        password_protected: packageToEdit.password_protected || false,
        password: packageToEdit.password || "",
        expires_at: packageToEdit.expires_at
          ? format(new Date(packageToEdit.expires_at), "yyyy-MM-dd")
          : "",
        // Clear client details if we are sending from a template or in offer mode
        client_name:
          mode === "send-from-template" || isOfferMode
            ? ""
            : packageToEdit.client_name || "",
        client_email:
          mode === "send-from-template" || isOfferMode
            ? ""
            : packageToEdit.client_email || "",
        items: normalizedItems as any[],
      });
    } else if (open && !isEditMode && mode !== "send-from-template") {
      setFormData(initialFormData);
    } else if (!open) {
      resetForm();
    }
  }, [packageToEdit, open, isEditMode, mode]);

  useEffect(() => {
    if (!open) return;
    if (!isOfferMode) return;
    setSelectedBrandId(
      offerContext?.offerBrandId ? String(offerContext.offerBrandId) : "",
    );
  }, [open, isOfferMode, offerContext?.offerBrandId]);

  const { data: connectedBrands } = useQuery({
    queryKey: ["agency", "brand-connections", "wizard"],
    queryFn: async () => {
      const resp = await base44.get<{ connections?: any[] }>(
        "/api/agency/brand-connections",
      );
      return Array.isArray(resp?.connections) ? resp.connections : [];
    },
    enabled: open && isOfferMode,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: allTalentsData } = useQuery({
    queryKey: ["agency-talents", "all"],
    queryFn: () => packageApi.listTalents(""),
    enabled: open,
  });

  const talentById = useMemo(() => {
    const rows = Array.isArray(allTalentsData) ? allTalentsData : [];
    const m = new Map<string, any>();
    for (const t of rows) {
      const id = String((t as any)?.id || "").trim();
      if (id) m.set(id, t);
    }
    return m;
  }, [allTalentsData]);

  const { data: talentsData, isLoading: loadingTalents } = useQuery({
    queryKey: ["agency-talents", debouncedSearchTerm],
    queryFn: () => packageApi.listTalents(debouncedSearchTerm),
    enabled: open && showTalentSelector,
  });

  const uniqueTalentsData = useMemo(() => {
    const rows = Array.isArray(talentsData) ? talentsData : [];
    const norm = (v: any) =>
      String(v || "")
        .trim()
        .toLowerCase();
    const score = (t: any) =>
      (norm(t?.profile_photo_url) ? 10 : 0) + (t?.is_connected_creator ? 2 : 0);
    const byKey = new Map<string, any>();
    for (const t of rows) {
      const creatorKey = norm((t as any)?.creator_id);
      const emailKey = norm((t as any)?.email);
      const nameKey = norm((t as any)?.full_name);
      const idKey = norm((t as any)?.id);
      const key = creatorKey || emailKey || nameKey || idKey;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, t);
        continue;
      }
      if (score(t) > score(existing)) byKey.set(key, t);
    }
    return Array.from(byKey.values());
  }, [talentsData]);

  const mutation = useMutation({
    mutationFn: (data: any) => {
      // Sanitize payload for backend
      const payload = {
        ...data,
        // Ensure items map assets correctly to asset_ids
        items: data.items.map((item: any) => ({
          talent_id: item.talent_id || item.id, // Handle both if raw talent object
          asset_ids: (item.assets || item.asset_ids || []).map(
            (asset: any) => ({
              asset_id: asset.asset_id || asset.id,
              asset_type: asset.asset_type || asset.type || "image",
            }),
          ),
        })),
        // Remove ID if present to avoid confusion in Create mode
        id: undefined,
        // Ensure template fields are handled
        is_template: isTemplateMode,
        template_id:
          mode === "send-from-template" && packageToEdit
            ? packageToEdit.id
            : undefined,
      };

      return isEditMode
        ? packageApi.updatePackage(packageToEdit.id, payload)
        : packageApi.createPackage(payload);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["agency-packages"] });
      queryClient.invalidateQueries({ queryKey: ["agency-package-templates"] });
      queryClient.invalidateQueries({ queryKey: ["agency-sent-packages"] });
      queryClient.invalidateQueries({ queryKey: ["agency-package-stats"] });
      if (onSuccess) onSuccess();
      onOpenChange(false);
      resetForm();
    },
  });

  const offerSendMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!offerContext?.offerId) throw new Error("Missing offerId");
      const offerId = String(offerContext.offerId);

      // 1. Create the real linked agency package
      const standardPkgResp = await packageApi.createPackage(
        data.standard_package_payload,
      );

      // 2. Prepare the payload for the campaign offer package, linking the real package
      const offerPayload = {
        ...data,
        meta: {
          ...data.meta,
          agency_package_id: standardPkgResp.id,
          agency_package_token: standardPkgResp.access_token,
        },
      };
      delete offerPayload.standard_package_payload;

      const createResp = await base44.post<{ package?: any }>(
        `/api/campaign-offers/${encodeURIComponent(offerId)}/packages`,
        offerPayload,
      );
      const packageId = String(createResp?.package?.id || "").trim();
      if (!packageId) throw new Error("Package was not created");
      await base44.post(
        `/api/campaign-offers/${encodeURIComponent(offerId)}/packages/send`,
        { package_id: packageId },
      );
      return createResp?.package;
    },
    onSuccess: (pkg: any) => {
      queryClient.invalidateQueries({ queryKey: ["agency-packages"] });
      queryClient.invalidateQueries({ queryKey: ["agency-sent-packages"] });
      if (onSuccess) onSuccess();
      onOpenChange(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setStep(0);
    setShowSuccess(false);
    setCreatedPackage(null);
    setFormData(initialFormData);
  };

  const nextStep = async () => {
    if (step === 0 && !formData.title)
      return toast({
        title: t("agencyDashboard.analytics.createPackage.validation.required"),
        description: t(
          "agencyDashboard.analytics.createPackage.validation.titleRequired",
        ),
        variant: "destructive",
      });
    if (step === 1 && formData.items.length === 0)
      return toast({
        title: t("agencyDashboard.analytics.createPackage.validation.empty"),
        description: isSportsAgency
          ? t(
              "agencyDashboard.analytics.createPackage.validation.selectAthlete",
            )
          : t(
              "agencyDashboard.analytics.createPackage.validation.selectTalent",
            ),
        variant: "destructive",
      });
    if (
      step === 3 &&
      (formData.consent_items || [])
        .map((item: string) => item.trim())
        .filter(Boolean).length === 0
    )
      return toast({
        title: t("agencyDashboard.analytics.createPackage.consents.title"),
        description: t(
          "agencyDashboard.analytics.createPackage.validation.addConsent",
        ),
        variant: "destructive",
      });

    setIsNavigating(true);
    // Artificial delay to prevent double-click and show feedback
    await new Promise((r) => setTimeout(r, 400));
    setStep((s) => Math.min(s + 1, totalSteps - 1));
    setIsNavigating(false);
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const removeTalentSelection = (talentId: string) => {
    const id = String(talentId || "").trim();
    if (!id) return;
    setFormData((prev) => ({
      ...prev,
      items: (prev.items || []).filter(
        (it: any) => String(it?.talent_id || "").trim() !== id,
      ),
    }));
  };

  const toggleTalentSelection = (talent: any) => {
    const isSelected = formData.items.some(
      (item) => item.talent_id === talent.id,
    );
    if (isSelected) {
      setFormData({
        ...formData,
        items: formData.items.filter((item) => item.talent_id !== talent.id),
      });
    } else {
      setFormData({
        ...formData,
        items: [
          ...formData.items,
          { talent_id: talent.id, assets: [], talent },
        ],
      });
    }
  };

  const updateTalentAssets = (talentId: string, newAssets: any[]) => {
    setFormData((currentData) => ({
      ...currentData,
      items: currentData.items.map((item) =>
        item.talent_id === talentId ? { ...item, assets: newAssets } : item,
      ),
    }));
  };

  const updateConsentItem = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      consent_items: (prev.consent_items || []).map(
        (item: string, i: number) => (i === index ? value : item),
      ),
    }));
  };

  const addConsentItem = () => {
    setFormData((prev) => ({
      ...prev,
      consent_items: [...(prev.consent_items || []), ""],
    }));
  };

  const removeConsentItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      consent_items: (prev.consent_items || []).filter(
        (_: string, i: number) => i !== index,
      ),
    }));
  };

  const handleSubmit = () => {
    // For templates, client details are optional. For packages, they're required.
    if (!isTemplateMode && !isOfferMode) {
      if (!formData.client_name.trim()) {
        return toast({
          title: t(
            "agencyDashboard.analytics.createPackage.validation.required",
          ),
          description: t(
            "agencyDashboard.analytics.createPackage.send.clientNameRequired",
          ),
          variant: "destructive",
        });
      }
      if (!formData.client_email.trim()) {
        return toast({
          title: t(
            "agencyDashboard.analytics.createPackage.validation.required",
          ),
          description: t(
            "agencyDashboard.analytics.createPackage.send.deliveryEmailRequired",
          ),
          variant: "destructive",
        });
      }
      const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g;
      if (!emailRegex.test(formData.client_email)) {
        return toast({
          title: t("agencyDashboard.analytics.createPackage.send.clientEmail"),
          description: t(
            "agencyDashboard.analytics.createPackage.send.invalidEmail",
          ),
          variant: "destructive",
        });
      }
    }

    if (formData.password_protected && !formData.password.trim()) {
      return toast({
        title: t("agencyDashboard.analytics.createPackage.send.password"),
        description:
          "Please set a password for this protected package in the 'Customize' step.",
        variant: "destructive",
      });
    }

    if (isOfferMode) {
      if (!offerContext?.offerId) {
        return toast({
          title: t("agencyDashboard.analytics.createPackage.send.failed"),
          description: t(
            "agencyDashboard.analytics.createPackage.send.notLinkedToOffer",
          ),
          variant: "destructive",
        });
      }
      if (!selectedBrandId.trim()) {
        return toast({
          title: t("agencyDashboard.analytics.createPackage.send.required"),
          description: t(
            "agencyDashboard.analytics.createPackage.send.selectConnectedBrand",
          ),
          variant: "destructive",
        });
      }
    }

    const itemsArray = Array.isArray(formData.items)
      ? formData.items
      : [formData.items];

    const normalizedConsentItems = (formData.consent_items || [])
      .map((item: string) => item.trim())
      .filter(Boolean);

    if (isOfferMode) {
      const selectedTalentIds = itemsArray
        .map((it: any) => String(it?.talent_id || it?.id || "").trim())
        .filter(Boolean);

      const standardPackagePayload = {
        ...formData,
        is_template: false,
        consent_items: normalizedConsentItems,
        items: itemsArray.map(({ talent, assets, ...item }) => ({
          ...item,
          asset_ids: assets.map((asset: any) => ({
            asset_id: asset.asset_id || asset.id,
            asset_type: asset.asset_type || asset.type,
          })),
        })),
        meta: {
          selected_talent_ids: selectedTalentIds,
          selected_brand_id: selectedBrandId,
          wizard_source: "talent_packages",
          offer_id: offerContext.offerId,
        },
        // Offer mode: bypass legacy email system and set neutral client name for logs
        client_email: "",
        client_name: "Brand Portal",
      };

      const offerPayload = {
        title: formData.title,
        message: formData.description || formData.custom_message || "",
        expires_at: formData.expires_at
          ? new Date(formData.expires_at).toISOString()
          : null,
        meta: {
          selected_talent_ids: selectedTalentIds,
          selected_brand_id: selectedBrandId,
          wizard_source: "talent_packages",
        },
        package_snapshot: {
          title: formData.title,
          description: formData.description,
          cover_image_url: formData.cover_image_url,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          custom_message: formData.custom_message,
          allow_comments: formData.allow_comments,
          allow_favorites: formData.allow_favorites,
          allow_callbacks: formData.allow_callbacks,
          consent_items: normalizedConsentItems,
          items: itemsArray.map((item: any) => ({
            talent_id: item.talent_id || item.id,
            talent_name: item?.talent?.name || item?.talent?.full_name,
            asset_ids: (item.assets || []).map((asset: any) => ({
              asset_id: asset.asset_id || asset.id,
              asset_type: asset.asset_type || asset.type || "image",
            })),
          })),
        },
        standard_package_payload: standardPackagePayload,
      };
      offerSendMutation.mutate(offerPayload);
      return;
    }

    const finalData = {
      ...formData,
      is_template: isTemplateMode,
      consent_items: normalizedConsentItems,
      items: itemsArray.map(({ talent, assets, ...item }) => ({
        ...item,
        asset_ids: assets.map((asset: any) => ({
          asset_id: asset.asset_id || asset.id,
          asset_type: asset.asset_type || asset.type,
        })),
      })),
    };
    mutation.mutate(finalData);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[96vw] sm:max-w-4xl h-[90vh] sm:h-[85vh] flex flex-col p-0 overflow-hidden bg-white/95 backdrop-blur-xl rounded-2xl border-none shadow-[0_32px_128px_-12px_rgba(0,0,0,0.1)]">
          {/* Template Mode Banner */}
          {mode === "send-from-template" && (
            <div className="bg-indigo-50 border-b border-indigo-100 px-4 sm:px-6 py-3 flex items-center justify-center gap-2">
              <Copy className="w-4 h-4 text-indigo-600" />
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest">
                {t(
                  "agencyDashboard.analytics.createPackage.fromTemplatePrefix",
                  {
                    defaultValue: "Creating new package from",
                  },
                )}{" "}
                <span className="text-indigo-900">
                  "{packageToEdit?.title}"
                </span>{" "}
                {t(
                  "agencyDashboard.analytics.createPackage.fromTemplateSuffix",
                  {
                    defaultValue: "template",
                  },
                )}
              </p>
            </div>
          )}

          {/* Header */}
          <div className="p-4 sm:p-10 pb-0">
            <div className="flex justify-between items-start mb-8">
              <div>
                <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">
                  {isEditMode
                    ? t("agencyDashboard.analytics.createPackage.editTitle", {
                        defaultValue: "Edit {{entity}} Package",
                        entity: entitySingularTitle,
                      })
                    : t("agencyDashboard.analytics.createPackage.title", {
                        defaultValue: `Create a New ${entitySingularTitle} Package`,
                      })}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 font-medium mt-1">
                  {t("agencyDashboard.analytics.createPackage.subtitle", {
                    defaultValue:
                      "Build a beautiful portfolio package to showcase your {{entity}} to clients",
                    entity: entitySingularLower,
                  })}
                </DialogDescription>
              </div>
            </div>

            {/* Step Bar */}
            <div className="overflow-x-auto mb-8">
              <div className="flex items-center gap-0 min-w-max max-w-2xl mx-auto">
                {steps.slice(0, totalSteps).map((s, i) => (
                  <React.Fragment key={s.id}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-500 ${step >= i ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" : "bg-gray-100 text-gray-400"}`}
                      >
                        {step > i ? <Check className="w-5 h-5" /> : i + 1}
                      </div>
                      <span
                        className={`text-[10px] uppercase font-black tracking-widest ${step >= i ? "text-gray-900" : "text-gray-500"}`}
                      >
                        {s.title}
                      </span>
                    </div>
                    {i < totalSteps - 1 && (
                      <div className="flex-1 mx-3 sm:mx-6 h-1 bg-gray-300 min-w-6 sm:min-w-12" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-10 pb-6 sm:pb-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {step === 0 && (
                  <div className="space-y-8 max-w-2xl mx-auto w-full">
                    <div className="space-y-3">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                        {t(
                          "agencyDashboard.analytics.createPackage.basicInfo.titleLabel",
                        )}{" "}
                        *
                      </Label>
                      <Input
                        placeholder={t(
                          "agencyDashboard.analytics.createPackage.basicInfo.titlePlaceholder",
                        )}
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        className="h-12 bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-lg px-4 transition-all duration-300 font-medium placeholder:text-gray-400"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                        {t(
                          "agencyDashboard.analytics.createPackage.basicInfo.descriptionLabel",
                          {
                            defaultValue: "Introduction Note",
                          },
                        )}
                      </Label>
                      <Textarea
                        placeholder={t(
                          "agencyDashboard.analytics.createPackage.basicInfo.descriptionPlaceholder",
                          {
                            defaultValue:
                              "Share the vision for this selection...",
                          },
                        )}
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        className="min-h-[120px] bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-lg px-4 py-3 transition-all duration-300 font-medium placeholder:text-gray-400"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                        {t(
                          "agencyDashboard.analytics.createPackage.basicInfo.coverImage",
                        )}
                      </Label>
                      <div className="flex gap-3">
                        <Input
                          placeholder="https://images.unsplash.com/..."
                          value={formData.cover_image_url}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              cover_image_url: e.target.value,
                            })
                          }
                          className="h-12 bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-lg px-4 transition-all duration-300 font-medium placeholder:text-gray-400 flex-1"
                        />
                        <label className="h-12 px-4 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-all duration-300 shrink-0">
                          {coverUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="text-xs font-bold text-gray-600">
                            {coverUploading
                              ? t(
                                  "agencyDashboard.analytics.createPackage.common.loading",
                                  {
                                    defaultValue: "Uploading...",
                                  },
                                )
                              : t(
                                  "agencyDashboard.analytics.createPackage.basicInfo.uploadCover",
                                  { defaultValue: "Upload" },
                                )}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={coverUploading}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (!file.type.startsWith("image/")) {
                                toast({
                                  title: t(
                                    "agencyDashboard.analytics.createPackage.upload.invalidFile",
                                  ),
                                  description: t(
                                    "agencyDashboard.analytics.createPackage.upload.invalidFileDesc",
                                  ),
                                  variant: "destructive",
                                });
                                return;
                              }
                              setCoverUploading(true);
                              try {
                                const fd = new FormData();
                                fd.append("visibility", "public");
                                fd.append("file", file);
                                const resp = await base44.post<{
                                  file_url?: string;
                                  public_url?: string;
                                }>("/api/agency/storage/files/upload", fd);
                                const url = resp?.public_url || resp?.file_url;
                                if (url) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    cover_image_url: url,
                                  }));
                                  toast({
                                    title: t(
                                      "agencyDashboard.analytics.createPackage.upload.imageUploaded",
                                    ),
                                  });
                                } else {
                                  throw new Error("Upload returned no URL");
                                }
                              } catch (err: any) {
                                toast({
                                  title: t(
                                    "agencyDashboard.analytics.createPackage.upload.uploadFailed",
                                  ),
                                  description:
                                    err?.message || "Please try again.",
                                  variant: "destructive",
                                });
                              } finally {
                                setCoverUploading(false);
                                e.target.value = "";
                              }
                            }}
                          />
                        </label>
                      </div>
                      {formData.cover_image_url && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 max-w-[200px]">
                          <img
                            src={formData.cover_image_url}
                            alt="Cover preview"
                            className="w-full h-24 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-8 bg-gray-50/50 backdrop-blur-sm rounded-[2rem] border border-gray-100 space-y-8">
                      <div className="flex items-center gap-3">
                        <Palette className="w-5 h-5 text-indigo-600" />
                        <h4 className="text-sm font-black text-gray-900 tracking-tight">
                          Agency Branding
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Primary Accent
                          </Label>
                          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm shadow-gray-100">
                            <input
                              type="color"
                              value={ensureHexColor(formData.primary_color)}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  primary_color: e.target.value,
                                })
                              }
                              className="w-full h-10 cursor-pointer rounded-xl overflow-hidden border-none p-0"
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Secondary Accent
                          </Label>
                          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm shadow-gray-100">
                            <input
                              type="color"
                              value={ensureHexColor(
                                formData.secondary_color,
                                "#06B6D4",
                              )}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  secondary_color: e.target.value,
                                })
                              }
                              className="w-full h-10 cursor-pointer rounded-xl overflow-hidden border-none p-0"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Custom Footer Message
                        </Label>
                        <Textarea
                          placeholder="A personal note for the client..."
                          value={formData.custom_message}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              custom_message: e.target.value,
                            })
                          }
                          className="bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-2xl px-6 transition-all duration-300 min-h-[80px]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-8 max-w-3xl mx-auto w-full">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">
                          {`Selected ${entityPluralTitle}`}
                        </h3>
                        <p className="text-sm font-medium text-gray-700">
                          {`Select ${entityPluralLower} and pick their best assets for this package`}
                        </p>
                      </div>
                      <Button
                        onClick={() => setShowTalentSelector(true)}
                        className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-300 rounded-lg flex items-center justify-center gap-2 w-full sm:w-auto"
                      >
                        <Plus className="w-5 h-5" />{" "}
                        {`Add ${entitySingularTitle}`}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <AnimatePresence mode="popLayout">
                        {formData.items.map((item, idx) => {
                          const tid = String(item?.talent_id || "").trim();
                          const resolvedTalent = item?.talent ||
                            (tid ? talentById.get(tid) : null) || {
                              id: tid,
                              full_name: item?.talent_name || "Talent",
                            };
                          const talentName = String(
                            resolvedTalent?.stage_name ||
                              resolvedTalent?.name ||
                              resolvedTalent?.full_legal_name ||
                              resolvedTalent?.full_name ||
                              item?.talent_name ||
                              "Talent",
                          ).trim();
                          const photo = String(
                            resolvedTalent?.profile_photo_url || "",
                          ).trim();
                          const assetsCount = Array.isArray(item?.assets)
                            ? item.assets.length
                            : Array.isArray(item?.asset_ids)
                              ? item.asset_ids.length
                              : 0;
                          return (
                            <motion.div
                              key={tid || item.talent_id}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white border border-gray-200 rounded-2xl hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all duration-300"
                            >
                              <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                                <div className="hidden sm:block p-2 text-gray-200 group-hover:text-indigo-200 transition-colors cursor-grab active:cursor-grabbing">
                                  <GripVertical className="w-5 h-5" />
                                </div>
                                <div className="w-16 h-16 rounded-[1.25rem] bg-gray-100 overflow-hidden shadow-inner flex-shrink-0">
                                  {photo ? (
                                    <img
                                      src={photo}
                                      className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                      <User className="w-7 h-7" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-black text-gray-900 tracking-tight text-lg">
                                    {talentName}
                                  </h5>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge
                                      variant="secondary"
                                      className="bg-gray-100 text-gray-700 text-[9px] font-bold uppercase tracking-wider border-none px-2 rounded-md"
                                    >
                                      {assetsCount} Assets
                                    </Badge>
                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                                      Selected
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                <Button
                                  onClick={() =>
                                    setActiveTalentForAssets({
                                      id: tid,
                                      name: talentName,
                                    })
                                  }
                                  className={`h-10 px-4 sm:px-6 rounded-full border-none text-xs font-bold uppercase tracking-wider gap-2 transition-all duration-300 w-full sm:w-auto ${assetsCount > 0 ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"}`}
                                >
                                  <Layers className="w-4 h-4" />
                                  {assetsCount > 0
                                    ? t(
                                        "agencyDashboard.analytics.createPackage.common.save",
                                      )
                                    : t(
                                        "agencyDashboard.analytics.createPackage.selectTalents.addTalent",
                                      )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeTalentSelection(tid)}
                                  className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      {formData.items.length === 0 && (
                        <div className="p-20 text-center border-2 border-dashed border-gray-200 rounded-[2rem] bg-white">
                          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm shadow-gray-100">
                            <User className="w-8 h-8 text-gray-300" />
                          </div>
                          <p className="text-gray-600 font-black text-sm uppercase tracking-widest">
                            {`No ${entityPluralLower} added yet`}
                          </p>
                          <p className="text-gray-400 text-xs mt-2 font-medium">
                            {`Add ${entitySingularLower} from your roster to start building the package`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="max-w-2xl space-y-12 py-4 mx-auto w-full">
                    <div className="space-y-8">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-black text-gray-900 tracking-tighter">
                          {t(
                            "agencyDashboard.analytics.createPackage.customize.title",
                          )}
                        </h3>
                        <p className="text-sm text-gray-400 font-medium">
                          Fine-tune the client experience and permissions
                        </p>
                      </div>
                      <div className="space-y-4">
                        {[
                          {
                            id: "allow_comments",
                            label: t(
                              "agencyDashboard.analytics.createPackage.customize.allowComments",
                            ),
                            desc: `Allow clients to leave notes on specific ${entityPluralLower}`,
                          },
                          {
                            id: "allow_favorites",
                            label: t(
                              "agencyDashboard.analytics.createPackage.customize.allowFavorites",
                            ),
                            desc: `Let clients favorite ${entityPluralLower} to shortlist them`,
                          },
                          {
                            id: "allow_callbacks",
                            label: t(
                              "agencyDashboard.analytics.createPackage.customize.allowCallbacks",
                            ),
                            desc: "Clients can directly request inquiries or callbacks",
                          },
                          {
                            id: "password_protected",
                            label: "Access Control",
                            desc: "Secure this package with a private password",
                          },
                        ].map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between p-6 bg-white border-2 border-gray-50 rounded-3xl hover:border-indigo-50/50 transition-all duration-300"
                          >
                            <div className="space-y-1">
                              <Label className="text-base font-black text-gray-900 tracking-tight block">
                                {s.label}
                              </Label>
                              <p className="text-xs text-gray-600 font-medium leading-relaxed max-w-[280px]">
                                {s.desc}
                              </p>
                            </div>
                            <Switch
                              checked={(formData as any)[s.id]}
                              onCheckedChange={(val) =>
                                setFormData({ ...formData, [s.id]: val })
                              }
                              className="data-[state=checked]:bg-indigo-600 scale-110"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <AnimatePresence>
                      {formData.password_protected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -20 }}
                          animate={{ opacity: 1, height: "auto", y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -20 }}
                          className="space-y-3"
                        >
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Gateway Password
                          </Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a secure password..."
                              value={formData.password}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  password: e.target.value,
                                })
                              }
                              className="h-12 border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-600 rounded-lg px-4 pr-10 transition-all duration-300"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              aria-label={
                                showPassword
                                  ? t(
                                      "agencyDashboard.analytics.createPackage.send.password",
                                    )
                                  : t(
                                      "agencyDashboard.analytics.createPackage.send.password",
                                    )
                              }
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-4 pt-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {t(
                            "agencyDashboard.analytics.createPackage.send.expiryDate",
                          )}
                        </Label>
                      </div>
                      <Input
                        type="date"
                        value={formData.expires_at}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            expires_at: e.target.value,
                          })
                        }
                        className="h-12 bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-lg px-4 transition-all duration-300 font-medium"
                      />
                      <p className="text-xs text-gray-500 font-medium">
                        Leave empty for an evergreen package link
                      </p>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="max-w-2xl space-y-4 border border-gray-200 rounded-2xl p-5 bg-gray-50/40 mx-auto w-full">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                          {t(
                            "agencyDashboard.analytics.createPackage.consents.consentItems",
                          )}
                        </h4>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                          Default points are prefilled. Edit, remove, or add
                          custom points for this package.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={addConsentItem}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs font-bold"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        {t(
                          "agencyDashboard.analytics.createPackage.consents.addConsent",
                        )}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(formData.consent_items || []).map(
                        (item: string, idx: number) => (
                          <div key={`consent-${idx}`} className="flex gap-2">
                            <Input
                              value={item}
                              onChange={(e) =>
                                updateConsentItem(idx, e.target.value)
                              }
                              placeholder={`Consent point ${idx + 1}`}
                              className="h-10 bg-white border-gray-200"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeConsentItem(idx)}
                              className="h-10 w-10 border-gray-200"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="max-w-2xl space-y-10 py-4 mx-auto w-full">
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                          {t(
                            "agencyDashboard.analytics.createPackage.send.title",
                          )}
                        </h3>
                        <p className="text-sm text-gray-500 font-medium">
                          {isOfferMode
                            ? "Confirm the brand recipient for this offer package"
                            : "Complete the recipient details to publish the package"}
                        </p>
                      </div>

                      {formData.password_protected &&
                        !formData.password.trim() && (
                          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                            <Lock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-black text-red-900 uppercase tracking-widest">
                                {t(
                                  "agencyDashboard.analytics.createPackage.send.password",
                                )}
                              </p>
                              <p className="text-sm text-red-700 font-medium mt-1">
                                This package has access control enabled but no
                                password is set. Please go back to the{" "}
                                <span className="font-bold">Customize</span>{" "}
                                step to set one.
                              </p>
                            </div>
                          </div>
                        )}
                      {isOfferMode && (
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            {t(
                              "agencyDashboard.analytics.createPackage.send.selectBrand",
                            )}
                          </Label>
                          {canViewConnections ? (
                            <select
                              value={selectedBrandId}
                              onChange={(e) =>
                                setSelectedBrandId(e.target.value)
                              }
                              className="w-full h-12 bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-lg px-4 transition-all duration-300 font-medium"
                            >
                              <option value="">
                                {t(
                                  "agencyDashboard.analytics.createPackage.send.selectBrand",
                                )}
                                …
                              </option>
                              {(Array.isArray(connectedBrands)
                                ? connectedBrands
                                : []
                              ).map((c: any) => {
                                const id = String(c?.brand_id || "").trim();
                                const label =
                                  String(
                                    c?.brands?.company_name || "",
                                  ).trim() ||
                                  String(c?.brands?.email || "").trim() ||
                                  id;
                                if (!id) return null;
                                return (
                                  <option key={id} value={id}>
                                    {label}
                                  </option>
                                );
                              })}
                            </select>
                          ) : (
                            <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-3">
                              <Lock className="w-5 h-5 text-red-600" />
                              <p className="text-sm text-red-700 font-medium">
                                Permission Required: You do not have access to
                                view brand connections.
                              </p>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 font-medium">
                            This package will be delivered to the brand’s
                            dashboard inbox for this offer.
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {isOfferMode ? (
                          <>
                            <div className="space-y-3">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                {t(
                                  "agencyDashboard.analytics.createPackage.send.clientName",
                                )}
                              </Label>
                              <Input
                                readOnly
                                value={(() => {
                                  const list = Array.isArray(connectedBrands)
                                    ? connectedBrands
                                    : [];
                                  const match = list.find(
                                    (c: any) =>
                                      String(c?.brand_id || "").trim() ===
                                      String(selectedBrandId || "").trim(),
                                  );
                                  return (
                                    String(
                                      match?.brands?.company_name || "",
                                    ).trim() ||
                                    String(match?.brands?.email || "").trim() ||
                                    ""
                                  );
                                })()}
                                className="h-12 bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-lg px-4 transition-all duration-300 font-medium"
                              />
                            </div>
                            <div className="space-y-3">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                {t(
                                  "agencyDashboard.analytics.createPackage.send.clientEmail",
                                )}
                              </Label>
                              <Input
                                readOnly
                                type="email"
                                value={(() => {
                                  const list = Array.isArray(connectedBrands)
                                    ? connectedBrands
                                    : [];
                                  const match = list.find(
                                    (c: any) =>
                                      String(c?.brand_id || "").trim() ===
                                      String(selectedBrandId || "").trim(),
                                  );
                                  return String(
                                    match?.brands?.email || "",
                                  ).trim();
                                })()}
                                className="h-12 bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-lg px-4 transition-all duration-300 font-medium"
                              />
                              <p className="text-xs text-gray-500 font-medium">
                                Delivered via inbox (email is informational).
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-3">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                {t(
                                  "agencyDashboard.analytics.createPackage.send.clientName",
                                )}
                              </Label>
                              <Input
                                placeholder="e.g. John Doe"
                                value={formData.client_name}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    client_name: e.target.value,
                                  })
                                }
                                className="h-12 bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-lg px-4 transition-all duration-300 font-medium"
                              />
                            </div>
                            <div className="space-y-3">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                {t(
                                  "agencyDashboard.analytics.createPackage.send.clientEmail",
                                )}
                              </Label>
                              <Input
                                type="email"
                                placeholder="client@company.com"
                                value={formData.client_email}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    client_email: e.target.value,
                                  })
                                }
                                className="h-12 bg-gray-50 border border-gray-200 focus:border-indigo-600 focus:bg-white rounded-lg px-4 transition-all duration-300 font-medium"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-10 bg-white rounded-[1.75rem] border border-gray-200 shadow-sm relative overflow-hidden min-h-[190px]">
                      <div className="absolute top-4 right-4 opacity-5">
                        <Send className="w-28 h-28 text-indigo-600" />
                      </div>
                      <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-500 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        {t(
                          "agencyDashboard.analytics.createPackage.send.title",
                        )}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                        <div className="space-y-6">
                          <div>
                            <h5 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                              {formData.title || "Untitled Selection"}
                            </h5>
                            <p className="text-sm text-gray-500 font-medium mt-1 line-clamp-2">
                              {formData.description ||
                                "No introduction note provided."}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge className="bg-gray-100 text-gray-700 border-none px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-widest whitespace-nowrap">
                              {`${formData.items.length} ${entityPluralTitle}`}
                            </Badge>
                            <Badge className="bg-gray-100 text-gray-700 border-none px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-widest whitespace-nowrap">
                              {formData.items.reduce(
                                (acc, it) => acc + it.assets.length,
                                0,
                              )}{" "}
                              {t(
                                "agencyDashboard.analytics.createPackage.common.loading",
                              )}
                            </Badge>
                          </div>

                          {formData.expires_at && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-orange-600 uppercase tracking-widest bg-orange-50 px-3 py-2 rounded-lg w-fit">
                              <Calendar className="w-3 h-3" />
                              {t(
                                "agencyDashboard.analytics.createPackage.send.expiryDate",
                              )}
                              :{" "}
                              {new Date(
                                formData.expires_at,
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <div className="space-y-6">
                          <div className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">
                              {t(
                                "agencyDashboard.analytics.createPackage.customize.title",
                              )}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                {
                                  enabled: formData.allow_favorites,
                                  label: "Favorites",
                                  icon: Heart,
                                },
                                {
                                  enabled: formData.allow_comments,
                                  label: "Notes",
                                  icon: MessageSquare,
                                },
                                {
                                  enabled: formData.allow_callbacks,
                                  label: "Callbacks",
                                  icon: CheckCircle2,
                                },
                                {
                                  enabled: formData.password_protected,
                                  label: "Locked",
                                  icon: Globe,
                                },
                                {
                                  enabled:
                                    (formData.consent_items || []).length > 0,
                                  label: "Consent",
                                  icon: ShieldCheck,
                                },
                              ].map((opt, i) => (
                                <div
                                  key={i}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${opt.enabled ? "bg-white border-2 border-indigo-100/50 text-indigo-600 shadow-sm" : "opacity-20 grayscale"}`}
                                >
                                  <opt.icon className="w-3 h-3" />
                                  <span className="text-[10px] font-black uppercase tracking-tight">
                                    {opt.label === "Locked" && opt.enabled
                                      ? formData.password.trim()
                                        ? "Locked (Set)"
                                        : "Locked (Empty!)"
                                      : opt.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex -space-x-3">
                              <div
                                className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                                style={{
                                  backgroundColor: formData.primary_color,
                                }}
                                title={t(
                                  "agencyDashboard.analytics.createPackage.customize.primaryColor",
                                )}
                              />
                              <div
                                className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                                style={{
                                  backgroundColor: formData.secondary_color,
                                }}
                                title={t(
                                  "agencyDashboard.analytics.createPackage.customize.secondaryColor",
                                )}
                              />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              {t(
                                "agencyDashboard.analytics.createPackage.customize.brandingApplied",
                                { defaultValue: "Branding applied" },
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-10 bg-gray-50/50 backdrop-blur-md border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                if (step === 0) onOpenChange(false);
                else prevStep();
              }}
              className="h-10 px-6 font-bold text-sm rounded-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
            >
              {step === 0 ? (
                t("agencyDashboard.analytics.createPackage.common.cancel")
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4 mr-2" />{" "}
                  {t("agencyDashboard.analytics.createPackage.common.previous")}
                </>
              )}
            </Button>

            <div className="flex gap-3 w-full sm:w-auto">
              {step < totalSteps - 1 ? (
                <Button
                  onClick={nextStep}
                  disabled={isNavigating}
                  className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-300 rounded-lg group w-full sm:w-auto"
                >
                  {isNavigating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      {t("agencyDashboard.analytics.createPackage.common.next")}{" "}
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={mutation.isPending || offerSendMutation.isPending}
                  className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-300 rounded-lg group flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {mutation.isPending || offerSendMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isTemplateMode ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  {isTemplateMode
                    ? isEditMode
                      ? "Save Template"
                      : "Done"
                    : "Publish & Send"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Athlete/Talent Selector Overlay Modal */}
      <Dialog open={showTalentSelector} onOpenChange={setShowTalentSelector}>
        <DialogContent className="max-w-[96vw] sm:max-w-2xl rounded-2xl sm:rounded-[3rem] p-4 sm:p-10 border-none bg-white/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">
              {isEditMode
                ? `Edit ${entitySingularTitle} Package`
                : `Create a New ${entitySingularTitle} Package`}
            </DialogTitle>
            <p className="text-sm text-gray-500 font-medium mt-1">
              {`Build a beautiful portfolio package to showcase your ${entitySingularLower} to clients`}
            </p>
          </DialogHeader>

          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Filter by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 pl-10 bg-gray-100 border-none rounded-xl"
            />
          </div>

          <ScrollArea className="h-[450px] pr-2 sm:pr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.isArray(talentsData) &&
                uniqueTalentsData.map((talent: any) => {
                  const isSelected = formData.items.some(
                    (i) => i.talent_id === talent.id,
                  );
                  const isConnectedCreator = Boolean(
                    (talent as any)?.is_connected_creator,
                  );
                  // A talent is fully onboarded when they have a creator_id —
                  // meaning they accepted their portal invite and have a creators record.
                  const isOnboarded = Boolean(
                    String(talent?.creator_id || "").trim(),
                  );
                  const photo = String(talent?.profile_photo_url || "").trim();
                  return (
                    <Card
                      key={talent.id}
                      onClick={() => {
                        if (!isOnboarded) {
                          // Block selection — show invite-required modal instead
                          setInviteRequiredTalent(talent);
                          return;
                        }
                        toggleTalentSelection(talent);
                      }}
                      className={`p-5 rounded-[2rem] border-2 transition-all duration-500 flex items-center gap-5 ${
                        !isOnboarded
                          ? "cursor-not-allowed opacity-60 border-gray-100 bg-gray-50"
                          : isSelected
                            ? "cursor-pointer border-indigo-600 bg-indigo-50/30 shadow-lg shadow-indigo-100/20"
                            : "cursor-pointer border-gray-50 hover:border-gray-100 bg-white"
                      }`}
                    >
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-inner relative">
                        {photo ? (
                          <img
                            src={photo}
                            className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <User className="w-7 h-7" />
                          </div>
                        )}
                        {!isOnboarded && (
                          <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center rounded-2xl">
                            <Lock className="w-5 h-5 text-white/90" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h6 className="font-black text-gray-900 truncate tracking-tight text-base">
                          {talent.full_name}
                        </h6>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                          {talent.categories?.[0] || "Member"}
                        </p>
                        {!isOnboarded ? (
                          <div className="mt-2">
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-black tracking-widest uppercase">
                              Invite Required
                            </Badge>
                          </div>
                        ) : isConnectedCreator ? (
                          <div className="mt-2">
                            <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 text-[10px] font-black tracking-widest uppercase">
                              Connected
                            </Badge>
                          </div>
                        ) : null}
                      </div>
                      {isSelected && isOnboarded && (
                        <div className="bg-indigo-600 rounded-full p-1 shadow-md shadow-indigo-200">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </Card>
                  );
                })}
            </div>
          </ScrollArea>

          <Button
            onClick={async () => {
              setIsNavigating(true);
              await new Promise((r) => setTimeout(r, 400));
              setShowTalentSelector(false);
              setIsNavigating(false);
            }}
            disabled={isNavigating}
            className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-12 font-bold tracking-wider text-sm shadow-md shadow-indigo-200"
          >
            {isNavigating ? (
              <Loader2 className="w-5 h-5 animate-spin mr-3" />
            ) : null}
            Confirm Selection ({formData.items.length})
          </Button>
        </DialogContent>
      </Dialog>

      {/* Asset Selector Modal */}
      <AssetSelector
        open={!!activeTalentForAssets}
        onOpenChange={() => setActiveTalentForAssets(null)}
        talentId={activeTalentForAssets?.id!}
        talentName={activeTalentForAssets?.name!}
        selectedAssets={
          formData.items.find((i) => i.talent_id === activeTalentForAssets?.id)
            ?.assets || []
        }
        onSelect={(assets) =>
          updateTalentAssets(activeTalentForAssets?.id!, assets)
        }
      />

      {/* Invite Required Modal — shown when agency tries to select a talent
          who hasn't accepted their portal invite yet (no creator_id). */}
      <Dialog
        open={!!inviteRequiredTalent}
        onOpenChange={(open) => !open && setInviteRequiredTalent(null)}
      >
        <DialogContent className="max-w-sm rounded-3xl p-8 border-none bg-white shadow-2xl">
          <div className="flex flex-col items-center gap-5 text-center">
            {/* Avatar with lock overlay */}
            <div className="relative w-20 h-20">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100">
                {inviteRequiredTalent?.profile_photo_url ? (
                  <img
                    src={inviteRequiredTalent.profile_photo_url}
                    alt={inviteRequiredTalent.full_name}
                    className="w-full h-full object-cover grayscale"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <User className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-md">
                <Mail className="w-4 h-4 text-white" />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                Invite Required
              </h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                <span className="font-bold text-gray-700">
                  {inviteRequiredTalent?.full_name || "This talent"}
                </span>{" "}
                hasn't accepted their portal invite yet. They need to complete
                onboarding before they can be added to a package or assigned to
                a contract.
              </p>
            </div>

            <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left">
              <p className="text-xs font-black text-amber-800 uppercase tracking-widest mb-1">
                Why this matters
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Without portal access, this {entitySingularLower} can't receive
                payments, sign contracts, or communicate through the platform.
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full mt-1">
              <Button
                className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl h-12 font-bold"
                onClick={() => {
                  setInviteRequiredTalent(null);
                  if (onInviteTalent) {
                    onInviteTalent(inviteRequiredTalent);
                  }
                }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Go to Roster &amp; Invite
              </Button>
              <Button
                variant="ghost"
                className="w-full rounded-xl h-11 font-semibold text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setInviteRequiredTalent(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
