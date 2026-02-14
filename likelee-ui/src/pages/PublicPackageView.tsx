import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  MessageSquare,
  Send,
  Calendar,
  MapPin,
  User,
  ChevronRight,
  Eye,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  Play,
  X,
  Lock,
  Check,
} from "lucide-react";
import { packageApi } from "@/api/packages";
import AssetGallery from "@/components/packages/AssetGallery";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function PublicPackageView() {
  const { token } = useParams<{ token: string }>();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const selectedTalent = selectedItem ? selectedItem.talent : null;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [initialFavorites, setInitialFavorites] = useState<Set<string>>(
    new Set(),
  );
  const [initialCallbacks, setInitialCallbacks] = useState<Set<string>>(
    new Set(),
  );
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(
    new Set(),
  );
  const [selectedCallbacks, setSelectedCallbacks] = useState<Set<string>>(
    new Set(),
  );
  const [initialSelections, setInitialSelections] = useState<Set<string>>(
    new Set(),
  );
  const [selectedSelections, setSelectedSelections] = useState<Set<string>>(
    new Set(),
  );
  const [pendingNotes, setPendingNotes] = useState<
    Record<string, { comment: string; clientName: string }>
  >({});
  const [lockedComments, setLockedComments] = useState<Record<string, boolean>>(
    {},
  );
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [clientName, setClientName] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [fullAssetsRequestOpen, setFullAssetsRequestOpen] = useState(false);
  const [requestClientName, setRequestClientName] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [requestMessage, setRequestMessage] = useState("");

  const {
    data: packageData,
    isLoading,
    error,
    refetch,
  } = useQuery<any>({
    queryKey: ["public-package", token],
    queryFn: () => packageApi.getPublicPackage(token!, password),
    enabled: !!token,
    retry: false, // We will handle retries manually for password prompt
  });

  const interactionMutation = useMutation({
    mutationFn: (data: any) => packageApi.createInteraction(token!, data),
  });

  useEffect(() => {
    const message = (error as any)?.message || "";
    if (message.includes(" 401 ")) {
      setShowPasswordPrompt(true);
      if (password) {
        setPasswordError("Invalid password. Please try again.");
      }
    } else {
      setPasswordError(null);
    }
  }, [error, password]);

  const fullAssetsRequestMutation = useMutation({
    mutationFn: (data: {
      client_name?: string;
      client_email?: string;
      message?: string;
    }) => packageApi.createPublicPackageFullAssetsRequest(token!, data),
    onSuccess: () => {
      setFullAssetsRequestOpen(false);
      setRequestClientName("");
      setRequestEmail("");
      setRequestMessage("");
      toast({
        title: "Request sent",
        description: "Your request has been sent to the agency.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Request failed",
        description: String(err?.message || "Please try again."),
        variant: "destructive",
      });
    },
  });

  const submitFullAssetsRequest = () => {
    if (!token) {
      toast({
        title: "Request failed",
        description: "Missing package token.",
        variant: "destructive",
      });
      return;
    }
    if (fullAssetsRequestMutation.isPending) return;

    const name = requestClientName.trim();
    const email = requestEmail.trim();
    const message = requestMessage.trim();
    fullAssetsRequestMutation.mutate({
      client_name: name ? name : undefined,
      client_email: email ? email : undefined,
      message: message ? message : undefined,
    });
  };

  const rawPackageData = packageData as any;

  const pkg = useMemo(() => {
    const d = rawPackageData;
    if (!d || typeof d !== "object") return d;
    // Common wrappers
    return d.package || d.data || d;
  }, [rawPackageData]);

  const apiPayloadIsError = useMemo(() => {
    const d = rawPackageData;
    if (!d || typeof d !== "object") return false;
    // Supabase/PostgREST style errors often have code/message/details/hint
    const hasErrorSignature =
      typeof d.code === "string" && typeof d.message === "string";
    if (!hasErrorSignature) return false;
    // If it looks like a real package too, don't treat it as an error.
    const looksLikePackage =
      typeof (d as any).title === "string" ||
      typeof (d as any)?.data?.title === "string" ||
      typeof (d as any)?.package?.title === "string";
    return !looksLikePackage;
  }, [rawPackageData]);

  const selectedAssets = useMemo(() => {
    if (!selectedItem?.assets) return [];
    return selectedItem.assets
      .map((a: any) => a.asset || a)
      .filter(
        (asset: any) => asset?.asset_url || asset?.public_url || asset?.url,
      );
  }, [selectedItem]);

  useEffect(() => {
    if (selectedItem && packageData) {
      const talentId = selectedItem.talent.id;
      const existingComment = (packageData.interactions || []).find(
        (i: any) => i.talent_id === talentId && i.type === "comment",
      );
      if (existingComment) {
        setComment(existingComment.content || "");
        setClientName(existingComment.client_name || "");
      } else {
        setComment("");
        setClientName("");
      }
    }
  }, [selectedItem, packageData]);

  const deleteInteractionMutation = useMutation({
    mutationFn: (data: {
      talent_id: string;
      type: "favorite" | "callback" | "selected";
    }) => packageApi.deleteInteraction(token!, data),
  });

  const isPasswordError = (() => {
    const message = (error as any)?.message || "";
    return message.includes(" 401 ");
  })();

  useEffect(() => {
    if (isPasswordError) {
      setShowPasswordPrompt(true);
    } else {
      setShowPasswordPrompt(false);
    }
  }, [isPasswordError]);

  useEffect(() => {
    if (packageData) {
      const initialFavs = new Set<string>();
      const initialCalls = new Set<string>();
      const initialSelected = new Set<string>();
      (packageData.interactions || []).forEach((interaction: any) => {
        if (interaction.type === "favorite") {
          initialFavs.add(interaction.talent_id);
        } else if (interaction.type === "callback") {
          initialCalls.add(interaction.talent_id);
        } else if (interaction.type === "selected") {
          initialSelected.add(interaction.talent_id);
        }
      });
      setInitialFavorites(initialFavs);
      setSelectedFavorites(initialFavs);
      setInitialCallbacks(initialCalls);
      setSelectedCallbacks(initialCalls);
      setInitialSelections(initialSelected);
      setSelectedSelections(initialSelected);
    }
  }, [packageData]);

  const toggleFavorite = (talentId: string) => {
    setSelectedFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(talentId)) {
        next.delete(talentId);
      } else {
        next.add(talentId);
      }
      return next;
    });
  };

  const toggleCallback = (talentId: string) => {
    setSelectedCallbacks((prev) => {
      const next = new Set(prev);
      if (next.has(talentId)) {
        next.delete(talentId);
      } else {
        next.add(talentId);
      }
      return next;
    });
  };

  const toggleSelected = (talentId: string) => {
    setSelectedSelections((prev) => {
      const next = new Set(prev);
      if (next.has(talentId)) {
        next.delete(talentId);
      } else {
        next.add(talentId);
      }
      return next;
    });
  };

  const handlePasswordSubmit = () => {
    setPasswordError(null);
    refetch();
  };

  const submitInteractions = async (talentId: string) => {
    const promises: Promise<any>[] = [];

    // Determine changes for favorites
    const isFavoriteInitially = initialFavorites.has(talentId);
    const isFavoriteCurrently = selectedFavorites.has(talentId);
    if (isFavoriteCurrently && !isFavoriteInitially) {
      promises.push(
        interactionMutation.mutateAsync({
          talent_id: talentId,
          type: "favorite",
        }),
      );
    } else if (!isFavoriteCurrently && isFavoriteInitially) {
      promises.push(
        deleteInteractionMutation.mutateAsync({
          talent_id: talentId,
          type: "favorite",
        }),
      );
    }

    // Determine changes for callbacks
    const isCallbackInitially = initialCallbacks.has(talentId);
    const isCallbackCurrently = selectedCallbacks.has(talentId);
    if (isCallbackCurrently && !isCallbackInitially) {
      promises.push(
        interactionMutation.mutateAsync({
          talent_id: talentId,
          type: "callback",
        }),
      );
    } else if (!isCallbackCurrently && isCallbackInitially) {
      promises.push(
        deleteInteractionMutation.mutateAsync({
          talent_id: talentId,
          type: "callback",
        }),
      );
    }

    // Determine changes for selected
    const isSelectedInitially = initialSelections.has(talentId);
    const isSelectedCurrently = selectedSelections.has(talentId);
    if (isSelectedCurrently && !isSelectedInitially) {
      promises.push(
        interactionMutation.mutateAsync({
          talent_id: talentId,
          type: "selected",
        }),
      );
    } else if (!isSelectedCurrently && isSelectedInitially) {
      promises.push(
        deleteInteractionMutation.mutateAsync({
          talent_id: talentId,
          type: "selected",
        }),
      );
    }

    // Comments are always upserted
    const pending = pendingNotes[talentId];
    if (pending?.comment) {
      promises.push(
        interactionMutation.mutateAsync({
          talent_id: talentId,
          type: "comment",
          content: pending.comment,
          client_name: pending.clientName,
        }),
      );
    }

    try {
      await Promise.all(promises);
      await queryClient.invalidateQueries({
        queryKey: ["public-package", token],
      });
      setPendingNotes({});
      setComment("");
      setClientName("");
      setSelectedItem(null);
    } catch (error) {
      console.error("Failed to save interactions:", error);
    }
  };

  const hasUnsavedChanges = useMemo(() => {
    const favoritesChanged =
      initialFavorites.size !== selectedFavorites.size ||
      [...initialFavorites].some((id) => !selectedFavorites.has(id)) ||
      [...selectedFavorites].some((id) => !initialFavorites.has(id));

    const callbacksChanged =
      initialCallbacks.size !== selectedCallbacks.size ||
      [...initialCallbacks].some((id) => !selectedCallbacks.has(id)) ||
      [...selectedCallbacks].some((id) => !initialCallbacks.has(id));

    const selectionsChanged =
      initialSelections.size !== selectedSelections.size ||
      [...initialSelections].some((id) => !selectedSelections.has(id)) ||
      [...selectedSelections].some((id) => !initialSelections.has(id));

    const notesChanged = Object.values(pendingNotes).some(
      (note) => note.comment || note.clientName,
    );

    return (
      favoritesChanged || callbacksChanged || selectionsChanged || notesChanged
    );
  }, [
    selectedFavorites,
    selectedCallbacks,
    selectedSelections,
    pendingNotes,
    initialFavorites,
    initialCallbacks,
    initialSelections,
  ]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 animate-spin text-gray-900 mb-4" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
          Loading Portfolio...
        </p>
      </div>
    );
  }

  if (showPasswordPrompt) {
    return (
      <Dialog open={showPasswordPrompt} onOpenChange={setShowPasswordPrompt}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" /> Password Required
            </DialogTitle>
            <DialogDescription>
              This package is password protected. Please enter the password to
              view.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password-input" className="text-right">
                Password
              </Label>
              <Input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
                onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
              />
            </div>
            {passwordError && (
              <p className="col-span-4 text-red-500 text-sm text-center">
                {passwordError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handlePasswordSubmit}>
              Unlock Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (
    (error && !isPasswordError) ||
    (!isLoading && !packageData && !isPasswordError) ||
    apiPayloadIsError
  ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
          Access Denied
        </h1>
        <p className="text-gray-500 max-w-md mt-2">
          This package may have expired or the link is invalid. Please contact
          the agency for a new link.
        </p>
        {apiPayloadIsError &&
          typeof (rawPackageData as any)?.message === "string" && (
            <p className="text-xs text-gray-400 max-w-2xl mt-4 break-words">
              {(rawPackageData as any).message}
            </p>
          )}
        <Button
          variant="outline"
          className="mt-8 border-2"
          onClick={() => (window.location.href = "/")}
        >
          Return Home
        </Button>
      </div>
    );
  }
  if (!packageData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-500">
        Loading package...
      </div>
    );
  }

  const primaryColor =
    pkg?.primary_color || pkg?.primaryColor || pkg?.theme?.primary || "#6366F1";
  const secondaryColor =
    pkg?.secondary_color ||
    pkg?.secondaryColor ||
    pkg?.theme?.secondary ||
    "#06B6D4";

  return (
    <div
      className="min-h-screen bg-white pb-20 overflow-x-hidden"
      style={{ "--selection-bg": primaryColor } as any}
    >
      <style>{`::selection { background-color: var(--selection-bg); color: white; }`}</style>
      {/* Branding Bar */}
      <div
        className="h-1 bg-gray-100 w-full"
        style={{ backgroundColor: secondaryColor + "22" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.5 }}
          className="h-full"
          style={{ backgroundColor: primaryColor }}
        />
      </div>

      <header className="max-w-7xl mx-auto px-6 pt-16 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-end gap-10">
          <div className="space-y-4">
            <Badge
              variant="outline"
              className="border-2 font-black uppercase tracking-widest px-4 py-1"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              Portfolio Package
            </Badge>
            <h1 className="text-6xl md:text-8xl font-black text-gray-900 tracking-tighter leading-[0.9]">
              {pkg.title}
            </h1>
            <p className="text-xl text-gray-500 font-medium max-w-2xl">
              {pkg.description ||
                "Explore our latest talent selections curated specifically for your upcoming project."}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
              Curated by
            </span>
            {pkg.agency?.logo_url && (
              <img
                src={pkg.agency.logo_url}
                alt={pkg.agency.agency_name}
                className="h-12 w-12 rounded-full object-cover"
              />
            )}
            <h2
              className="text-lg font-black uppercase tracking-tight text-center"
              style={{ color: primaryColor }}
            >
              {pkg.agency?.agency_name ||
                pkg.agency_name ||
                "Premier Talent Agency"}
            </h2>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 -mt-10 mb-10">
        <Card className="border-2 border-gray-200 rounded-3xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <Lock className="w-6 h-6" style={{ color: primaryColor }} />
            </div>
            <div>
              <div className="font-black text-gray-900 text-lg">
                Need full assets?
              </div>
              <div className="text-gray-500 text-sm">
                Send a request to the agency for the full asset package.
              </div>
            </div>
          </div>
          <Button
            className="rounded-2xl font-black uppercase tracking-widest text-[10px]"
            style={{ backgroundColor: primaryColor }}
            onClick={() => setFullAssetsRequestOpen(true)}
          >
            Request Full Assets
          </Button>
        </Card>
      </div>

      {/* Talent Grid */}
      <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {(pkg.items || pkg.package_items || pkg.talents || [])?.map(
          (item: any, idx: number) => {
            const talent = item.talent;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group cursor-pointer"
              >
                <div
                  className="aspect-[3/4] rounded-3xl overflow-hidden relative mb-6 shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                  onClick={() => setSelectedItem(item)}
                >
                  {talent.profile_photo_url ? (
                    <img
                      src={talent.profile_photo_url}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                      alt={talent.full_name}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                      <User className="w-20 h-20" />
                    </div>
                  )}

                  {/* Favorite Toggle */}
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="pointer-events-none absolute top-6 left-6 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-sm"
                  >
                    <Heart
                      className={`w-5 h-5 ${selectedFavorites.has(talent.id) ? "text-red-500" : "text-gray-500"}`}
                      fill={
                        selectedFavorites.has(talent.id)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>

                  {/* Selected Toggle */}
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="pointer-events-none absolute top-6 right-6 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-sm"
                  >
                    <Check
                      className={`w-5 h-5 ${selectedSelections.has(talent.id) ? "text-emerald-600" : "text-gray-500"}`}
                    />
                  </button>

                  <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex justify-between items-end translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="text-white">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">
                        {talent.categories?.[0] || "Talent"}
                      </p>
                      <h3 className="text-3xl font-black uppercase tracking-tighter">
                        {talent.stage_name ||
                          talent.full_legal_name ||
                          talent.full_name}
                      </h3>
                    </div>
                    <ChevronRight className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </motion.div>
            );
          },
        )}
      </main>

      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto px-6 mt-40 border-t border-gray-100 pt-16 text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-300 mb-6">
          Powered by LikeLee.ai
        </p>
        <div className="flex justify-center gap-8 mb-20 grayscale opacity-40">
          {/* Logos for credibility */}
          <div className="w-8 h-8 rounded bg-gray-200" />
          <div className="w-8 h-8 rounded bg-gray-200" />
          <div className="w-8 h-8 rounded bg-gray-200" />
        </div>
      </footer>

      {/* Talent Detail Modal */}
      <AnimatePresence>
        {selectedItem && selectedTalent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
              onClick={() => setSelectedItem(null)}
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-6xl rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col md:flex-row h-[90vh]"
            >
              <div className="w-full md:w-[60%] h-1/2 md:h-full relative overflow-hidden bg-gray-100 flex items-center justify-center">
                {selectedAssets.length > 0 ? (
                  <AssetGallery assets={selectedAssets} />
                ) : (
                  <img
                    src={selectedTalent.profile_photo_url}
                    className="w-full h-full object-cover"
                    alt={selectedTalent.full_name}
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-6 left-6 text-white hover:bg-white/20 rounded-full z-10"
                  onClick={() => setSelectedItem(null)}
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <div className="flex-1 p-12 overflow-y-auto flex flex-col">
                <div className="flex justify-between items-start mb-10">
                  <div className="space-y-2 min-w-0 mr-4">
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 font-black uppercase text-[10px]"
                    >
                      {selectedTalent.categories?.[0]}
                    </Badge>
                    <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter break-words">
                      {selectedTalent.stage_name ||
                        selectedTalent.full_legal_name ||
                        selectedTalent.full_name}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full border-2"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                      onClick={() => toggleFavorite(selectedTalent.id)}
                    >
                      <Heart
                        className={`${selectedFavorites.has(selectedTalent.id) ? "text-red-500" : ""}`}
                        fill={
                          selectedFavorites.has(selectedTalent.id)
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </Button>
                    <Button
                      variant={
                        selectedSelections.has(selectedTalent.id)
                          ? "default"
                          : "outline"
                      }
                      size="icon"
                      className="rounded-full border-2"
                      style={
                        selectedSelections.has(selectedTalent.id)
                          ? {
                              backgroundColor: "#10B981",
                              borderColor: "#10B981",
                              color: "white",
                            }
                          : { borderColor: "#10B981", color: "#10B981" }
                      }
                      onClick={() => toggleSelected(selectedTalent.id)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={
                        selectedCallbacks.has(selectedTalent.id)
                          ? "default"
                          : "outline"
                      }
                      className="rounded-full h-9 px-4 font-black uppercase text-[9px] tracking-widest"
                      style={
                        selectedCallbacks.has(selectedTalent.id)
                          ? { backgroundColor: primaryColor }
                          : { borderColor: primaryColor, color: primaryColor }
                      }
                      onClick={() => toggleCallback(selectedTalent.id)}
                    >
                      Request Callback
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-8 mb-12">
                  {[
                    {
                      label: "Location",
                      value: selectedTalent.city,
                      icon: MapPin,
                    },
                    {
                      label: "Ethnicity",
                      value: selectedTalent.race_ethnicity,
                      icon: Globe,
                    },
                    {
                      label: "Availability",
                      value: selectedTalent.availability,
                      icon: Calendar,
                    },
                  ].map((stat, i) => (
                    <div key={i} className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                        <stat.icon className="w-3 h-3" /> {stat.label}
                      </p>
                      <p className="font-bold text-gray-900">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 mb-12">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                    Internal Bio
                  </h3>
                  <p className="text-gray-500 font-medium leading-relaxed">
                    {selectedTalent.bio_notes || selectedTalent.bio}
                  </p>
                </div>

                <div className="mt-auto space-y-6 pt-10 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                      Feedback & Notes
                    </h4>
                    <Badge
                      variant="outline"
                      className="text-[9px] uppercase tracking-tighter opacity-50"
                    >
                      Private Selection
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <Input
                      placeholder="Your Name"
                      value={clientName}
                      readOnly={
                        !!selectedItem && lockedComments[selectedItem.talent.id]
                      }
                      onClick={() => {
                        if (!selectedItem) return;
                        setLockedComments((prev) => ({
                          ...prev,
                          [selectedItem.talent.id]: false,
                        }));
                      }}
                      onChange={(e) => {
                        setClientName(e.target.value);
                        if (!selectedItem) return;
                        setPendingNotes((prev) => ({
                          ...prev,
                          [selectedItem.talent.id]: {
                            comment,
                            clientName: e.target.value,
                          },
                        }));
                      }}
                      className="bg-gray-50 border-transparent focus:bg-white h-12 font-bold"
                    />
                    <div className="relative">
                      <Textarea
                        placeholder="Add a comment or share your thoughts on this talent..."
                        className="bg-gray-50 border-transparent focus:bg-white min-h-[100px] font-medium"
                        value={comment}
                        readOnly={
                          !!selectedItem &&
                          lockedComments[selectedItem.talent.id]
                        }
                        onClick={() => {
                          if (!selectedItem) return;
                          setLockedComments((prev) => ({
                            ...prev,
                            [selectedItem.talent.id]: false,
                          }));
                        }}
                        onFocus={() => {
                          if (!selectedItem) return;
                          setLockedComments((prev) => ({
                            ...prev,
                            [selectedItem.talent.id]: false,
                          }));
                        }}
                        onChange={(e) => {
                          setComment(e.target.value);
                          if (!selectedItem) return;
                          setPendingNotes((prev) => ({
                            ...prev,
                            [selectedItem.talent.id]: {
                              comment: e.target.value,
                              clientName,
                            },
                          }));
                        }}
                      />
                      <Button
                        type="button"
                        size="icon"
                        className={`absolute bottom-4 right-4 rounded-xl shadow-lg shadow-black/10 ring-1 ring-white/60 transition-transform ${
                          !comment ||
                          (selectedItem &&
                            lockedComments[selectedItem.talent.id])
                            ? "opacity-40 grayscale cursor-not-allowed"
                            : "hover:-translate-y-0.5"
                        }`}
                        style={{ backgroundColor: primaryColor }}
                        onClick={() => {
                          if (!selectedItem) return;
                          setPendingNotes((prev) => ({
                            ...prev,
                            [selectedItem.talent.id]: {
                              comment,
                              clientName,
                            },
                          }));
                          setLockedComments((prev) => ({
                            ...prev,
                            [selectedItem.talent.id]: true,
                          }));
                        }}
                        disabled={
                          !comment ||
                          (selectedItem &&
                            lockedComments[selectedItem.talent.id])
                        }
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="pt-6">
                  <Button
                    className="w-full h-12 rounded-full font-black uppercase text-[11px] tracking-widest"
                    style={{ backgroundColor: primaryColor }}
                    disabled={
                      !hasUnsavedChanges ||
                      interactionMutation.isPending ||
                      deleteInteractionMutation.isPending
                    }
                    onClick={() => submitInteractions(selectedTalent.id)}
                  >
                    {interactionMutation.isPending ||
                    deleteInteractionMutation.isPending
                      ? "Saving..."
                      : "Save Changes"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Dialog
        open={fullAssetsRequestOpen}
        onOpenChange={setFullAssetsRequestOpen}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" /> Request Full Assets
            </DialogTitle>
            <DialogDescription>
              Send a request to the agency for full assets.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="request-client-name">Name (optional)</Label>
              <Input
                id="request-client-name"
                placeholder="Your name"
                value={requestClientName}
                onChange={(e) => setRequestClientName(e.target.value)}
                disabled={fullAssetsRequestMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-email">Email (optional)</Label>
              <Input
                id="request-email"
                type="email"
                placeholder="client@company.com"
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
                disabled={fullAssetsRequestMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-message">Message (optional)</Label>
              <Textarea
                id="request-message"
                placeholder="Tell the agency what you need..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                disabled={fullAssetsRequestMutation.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFullAssetsRequestOpen(false)}
              disabled={fullAssetsRequestMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={submitFullAssetsRequest}
              disabled={fullAssetsRequestMutation.isPending}
            >
              {fullAssetsRequestMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                </span>
              ) : (
                "Send Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `,
        }}
      />
    </div>
  );
}

const Globe = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
    />
  </svg>
);
