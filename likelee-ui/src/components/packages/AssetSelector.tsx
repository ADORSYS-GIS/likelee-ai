import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { packageApi } from "@/api/packages";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Image as ImageIcon,
  Video,
  X,
  Upload,
  Loader2,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Asset {
  id: string;
  url: string;
  type: "image" | "video";
  metadata: {
    section: string;
    created_at: string;
  };
}

interface AssetSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talentId: string;
  talentName: string;
  selectedAssets: any[];
  onSelect: (assets: any[]) => void;
}

export const AssetSelector: React.FC<AssetSelectorProps> = ({
  open,
  onOpenChange,
  talentId,
  talentName,
  selectedAssets,
  onSelect,
}) => {
  const [tempSelection, setTempSelection] = React.useState<string[]>(
    selectedAssets.map((a) => a.id),
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (open) {
      setTempSelection(selectedAssets.map((a) => a.id));
    }
  }, [open, selectedAssets]);

  const { data: assets, isLoading: isQueryLoading } = useQuery({
    queryKey: ["talent-assets", talentId],
    queryFn: () => packageApi.listTalentAssets(talentId),
    enabled: open && !!talentId,
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      packageApi.uploadTalentAsset(talentId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talent-assets", talentId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({
      talentId,
      assetId,
    }: {
      talentId: string;
      assetId: string;
    }) => packageApi.deleteTalentAsset(talentId, assetId),
    onMutate: async ({ assetId }) => {
      await queryClient.cancelQueries({
        queryKey: ["talent-assets", talentId],
      });
      const previousAssets = queryClient.getQueryData<Asset[]>([
        "talent-assets",
        talentId,
      ]);
      const newAssets =
        previousAssets?.filter((asset) => asset.id !== assetId) ?? [];
      queryClient.setQueryData(["talent-assets", talentId], newAssets);
      return { previousAssets };
    },
    onError: (err, variables, context) => {
      if (context?.previousAssets) {
        queryClient.setQueryData(
          ["talent-assets", talentId],
          context.previousAssets,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["talent-assets", talentId] });
    },
  });

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);
      uploadMutation.mutate(formData);
    }
  };

  const toggleAsset = (id: string) => {
    setTempSelection((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleDeleteAsset = (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation();
    deleteMutation.mutate({ talentId, assetId });
  };

  const [isApplying, setIsApplying] = React.useState(false);

  const handleConfirm = async () => {
    setIsApplying(true);
    await new Promise((r) => setTimeout(r, 400));
    const selectedAssetObjects = assets.filter((asset: Asset) =>
      tempSelection.includes(asset.id),
    );
    onSelect(selectedAssetObjects);
    setIsApplying(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden bg-white/95 backdrop-blur-xl border-none shadow-2xl rounded-3xl">
        <DialogHeader className="p-8 pb-4 bg-gray-50/50">
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">
                Select Assets for {talentName}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 font-medium mt-1">
                Choose the best photos and videos to showcase in this package
              </DialogDescription>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*"
                multiple
              />
              <Button
                variant="outline"
                onClick={handleUploadClick}
                disabled={uploadMutation.isPending}
                className="rounded-xl font-bold bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100 px-6"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Upload Assets
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-8 pt-0">
          {isQueryLoading ? (
            <div className="grid grid-cols-3 gap-4 mt-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-2xl" />
              ))}
            </div>
          ) : (
            <ScrollArea className="h-full pr-4 mt-6">
              {assets && assets.length > 0 ? (
                <div className="grid grid-cols-3 gap-6">
                  {assets.map((asset: Asset) => {
                    const isSelected = tempSelection.includes(asset.id);
                    return (
                      <motion.div
                        key={asset.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative group cursor-pointer aspect-square rounded-2xl overflow-hidden border-4 transition-all duration-300 ${isSelected ? "border-indigo-600 shadow-xl shadow-indigo-100" : "border-transparent"}`}
                        onClick={() => toggleAsset(asset.id)}
                      >
                        {asset.type === "image" ? (
                          <img
                            src={asset.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                            <Video className="w-12 h-12 text-white/50" />
                          </div>
                        )}

                        {/* Overlay */}
                        <div
                          className={`absolute inset-0 transition-opacity duration-300 ${isSelected ? "bg-indigo-600/10" : "bg-black/0 group-hover:bg-black/20"}`}
                        />

                        {/* Labels */}
                        <div className="absolute top-3 left-3 flex gap-2">
                          <div className="px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
                            {asset.type}
                          </div>
                        </div>

                        {/* Delete Button */}
                        <div className="absolute bottom-3 right-3 z-10 transition-opacity">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-600/90 text-white border-none shadow-lg"
                            onClick={(e) => handleDeleteAsset(e, asset.id)}
                            disabled={
                              deleteMutation.isPending &&
                              deleteMutation.variables?.assetId === asset.id
                            }
                          >
                            {deleteMutation.isPending &&
                              deleteMutation.variables?.assetId === asset.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>

                        {/* Status Icon */}
                        <div className="absolute top-3 right-3">
                          <AnimatePresence>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                              >
                                <CheckCircle2 className="w-7 h-7 text-indigo-600 fill-white" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Section Info */}
                        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <p className="text-[10px] font-black text-white/90 uppercase tracking-widest">
                            {asset.metadata.section.replace(/_/g, " ")}
                          </p>
                          <p className="text-[9px] font-medium text-white/60">
                            {new Date(
                              asset.metadata.created_at,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                  <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-medium">
                    No assets found for this talent
                  </p>
                  <Button
                    variant="link"
                    onClick={handleUploadClick}
                    className="text-indigo-600 font-bold mt-2"
                  >
                    Upload your first asset
                  </Button>
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="p-8 bg-gray-50/50 border-t border-gray-100">
          <div className="flex justify-between items-center w-full">
            <p className="text-sm font-black text-gray-400">
              {tempSelection.length}{" "}
              {tempSelection.length === 1 ? "ASSET" : "ASSETS"} SELECTED
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => onOpenChange(false)}
                className="rounded-xl font-bold px-6 border-none bg-white text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isApplying}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-8 shadow-lg shadow-indigo-100 border-none gap-2"
              >
                {isApplying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Apply Selection
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
