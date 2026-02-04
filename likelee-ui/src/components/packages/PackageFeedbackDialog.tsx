import React from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Heart, Phone, Clock, User, MessageSquare, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { packageApi } from "@/api/packages";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface PackageFeedbackDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    packageId: string | null;
}

export const PackageFeedbackDialog: React.FC<PackageFeedbackDialogProps> = ({
    open,
    onOpenChange,
    packageId,
}) => {
    const { data: pkg, isLoading } = useQuery({
        queryKey: ["agency-package-feedback", packageId],
        queryFn: () => packageApi.getPackage(packageId!),
        enabled: !!packageId && open,
    });

    const interactions = pkg?.interactions || [];
    // Sort interactions by created_at desc (newest first)
    const sortedInteractions = [...interactions].sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const favorites = interactions.filter((i: any) => i.type === "favorite");
    const callbacks = interactions.filter((i: any) => i.type === "callback");
    const selected = interactions.filter((i: any) => i.type === "selected");

    const resolveTalent = (interaction: any) => {
        const item = pkg?.items?.find((i: any) =>
            i.talent_id === interaction.talent_id || i.talent?.id === interaction.talent_id
        );
        return {
            name:
                item?.talent?.stage_name ||
                item?.talent?.full_legal_name ||
                item?.talent?.full_name ||
                "Unknown Talent",
            image: item?.talent?.profile_photo_url,
        };
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl bg-white rounded-xl shadow-2xl border-none" hideClose>
                <DialogHeader className="mb-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                Client Activity
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100">
                                    {pkg?.client_name || "Client"}
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-base text-gray-500">
                                Detailed timeline of client interactions with <strong>{pkg?.title}</strong>
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="rounded-full border-2 border-emerald-200 text-emerald-600">
                                        <Check className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64">
                                    {selected.length === 0 ? (
                                        <DropdownMenuItem disabled>No selections yet</DropdownMenuItem>
                                    ) : (
                                        selected.map((interaction: any, index: number) => {
                                            const talent = resolveTalent(interaction);
                                            return (
                                                <DropdownMenuItem key={interaction.id || index} className="gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                                                        {talent.image ? (
                                                            <img src={talent.image} alt={talent.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-3 h-3 m-1.5 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <span className="font-medium text-sm text-gray-700">{talent.name}</span>
                                                </DropdownMenuItem>
                                            );
                                        })
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="rounded-full border-2 border-red-200 text-red-600">
                                        <Heart className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64">
                                    {favorites.length === 0 ? (
                                        <DropdownMenuItem disabled>No favorites yet</DropdownMenuItem>
                                    ) : (
                                        favorites.map((interaction: any, index: number) => {
                                            const talent = resolveTalent(interaction);
                                            return (
                                                <DropdownMenuItem key={interaction.id || index} className="gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                                                        {talent.image ? (
                                                            <img src={talent.image} alt={talent.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-3 h-3 m-1.5 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <span className="font-medium text-sm text-gray-700">{talent.name}</span>
                                                </DropdownMenuItem>
                                            );
                                        })
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="rounded-full border-2 border-blue-200 text-blue-600">
                                        <Phone className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64">
                                    {callbacks.length === 0 ? (
                                        <DropdownMenuItem disabled>No callbacks yet</DropdownMenuItem>
                                    ) : (
                                        callbacks.map((interaction: any, index: number) => {
                                            const talent = resolveTalent(interaction);
                                            return (
                                                <DropdownMenuItem key={interaction.id || index} className="gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                                                        {talent.image ? (
                                                            <img src={talent.image} alt={talent.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-3 h-3 m-1.5 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <span className="font-medium text-sm text-gray-700">{talent.name}</span>
                                                </DropdownMenuItem>
                                            );
                                        })
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-gray-300 mb-4" />
                        <p className="text-sm font-bold text-gray-400">Loading activity...</p>
                    </div>
                ) : sortedInteractions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-100">
                        <Clock className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-lg font-bold text-gray-900">No activity yet</p>
                        <p className="text-sm text-gray-500 mt-1">
                            The client hasn't interacted with this package yet.
                        </p>
                    </div>
                ) : (
                    <ScrollArea className="h-[500px] pr-4">
                        <div className="space-y-6">
                            {sortedInteractions.map((interaction: any, index: number) => {
                                const isFavorite = interaction.type === "favorite";
                                const isCallback = interaction.type === "callback";
                                const isSelected = interaction.type === "selected";
                                // Find talent name from pkg.items 
                                // (Logic: interaction has talent_id, pkg.items has talent embedded)
                                const item = pkg.items.find((i: any) =>
                                    i.talent_id === interaction.talent_id || i.talent?.id === interaction.talent_id
                                );
                                const talentName =
                                    item?.talent?.stage_name ||
                                    item?.talent?.full_legal_name ||
                                    item?.talent?.full_name ||
                                    "Unknown Talent";
                                const talentImage = item?.talent?.profile_photo_url;

                                return (
                                    <div key={interaction.id || index} className="flex gap-4 group">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm z-10 ${
                                            isFavorite
                                                ? "bg-red-100 text-red-600"
                                                : isSelected
                                                    ? "bg-emerald-100 text-emerald-600"
                                                    : "bg-blue-100 text-blue-600"
                                            }`}>
                                                {isFavorite ? (
                                                    <Heart className="w-4 h-4 fill-current" />
                                                ) : isSelected ? (
                                                    <Check className="w-4 h-4" />
                                                ) : (
                                                    <Phone className="w-4 h-4" />
                                                )}
                                            </div>
                                            {index !== sortedInteractions.length - 1 && (
                                                <div className="w-0.5 grow bg-gray-100 mt-2 group-last:hidden" />
                                            )}
                                        </div>

                                        <div className="flex-1 pb-6">
                                            <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm group-hover:shadow-md transition-shadow group-hover:border-gray-200">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 text-sm">
                                                            {isFavorite
                                                                ? "Favorited a Talent"
                                                                : isSelected
                                                                    ? "Selected a Talent"
                                                                    : "Requested Callback"}
                                                        </h4>
                                                        <p className="text-xs text-gray-400 font-medium">
                                                            {format(new Date(interaction.created_at), "MMM d, yyyy 'at' h:mm a")}
                                                        </p>
                                                    </div>
                                                    {interaction.interaction_data?.message && (
                                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                                            Has Message
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-100 mb-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                                        {talentImage ? (
                                                            <img src={talentImage} alt={talentName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-4 h-4 m-2 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-sm text-gray-700">{talentName}</span>
                                                </div>

                                                {interaction.interaction_data?.message && (
                                                    <div className="text-sm text-gray-600 bg-yellow-50/50 p-3 rounded-lg border border-yellow-100/50 flex gap-3 items-start">
                                                        <MessageSquare className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                                                        <p className="italic">"{interaction.interaction_data.message}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                )}

                <div className="mt-6 flex justify-end pt-6 border-t border-gray-100">
                    <Button onClick={() => onOpenChange(false)} variant="outline" className="font-bold">
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
