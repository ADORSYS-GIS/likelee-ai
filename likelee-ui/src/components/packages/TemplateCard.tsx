import React from "react";
import { motion } from "framer-motion";
import { Send, Package as PackageIcon, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TemplateCardProps {
    template: any;
    onEdit: () => void;
    onSend: () => void;
    onDelete: () => void;
}

export function TemplateCard({ template, onEdit, onSend, onDelete }: TemplateCardProps) {
    const talentCount = template.items?.length || 0;
    const coverImage = template.cover_image_url;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
        >
            <Card
                className="relative overflow-hidden border border-blue-200/70 hover:border-blue-300 hover:shadow-[0_18px_45px_-25px_rgba(15,23,42,0.5)] transition-all duration-300 h-[400px] group cursor-pointer bg-white"
                onClick={() => onSend()}
            >
                {/* Background Image with Overlay */}
                <div className="absolute inset-0">
                    {coverImage ? (
                        <>
                            <img
                                src={coverImage}
                                alt={template.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-blue-950/70 via-slate-900/35 to-blue-800/15" />
                        </>
                    ) : (
                        <div
                            className="w-full h-full"
                            style={{
                                background: `linear-gradient(145deg, rgba(220, 236, 255, 0.98) 0%, rgba(193, 218, 248, 0.92) 45%, rgba(165, 198, 238, 0.9) 100%)`
                            }}
                        >
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.7),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(210,232,255,0.9),transparent_45%)]" />
                            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/25 via-transparent to-white/20" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="relative h-full flex flex-col p-6 pointer-events-none">
                    {/* Header with Icon and Menu */}
                    <div className="flex items-start justify-between mb-auto">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/70 backdrop-blur-sm flex items-center justify-center border border-white/60 shadow-sm">
                                <PackageIcon className="w-5 h-5 text-slate-700" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight line-clamp-1 drop-shadow-sm">
                                    {template.title}
                                </h3>
                                <Badge variant="secondary" className="bg-white/70 text-slate-700 border-white/60 font-bold text-xs mt-1 shadow-sm">
                                    {talentCount} Talent{talentCount !== 1 ? 's' : ''}
                                </Badge>
                            </div>
                        </div>

                        {/* 3-Dot Menu - Enable pointer events specifically for this */}
                        <div className="pointer-events-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-700 hover:bg-white/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit();
                                        }}
                                        className="font-bold text-xs uppercase tracking-wider cursor-pointer"
                                    >
                                        Edit Template
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete();
                                        }}
                                        className="font-bold text-xs uppercase tracking-wider text-red-600 cursor-pointer"
                                    >
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Send Button - Enable pointer events specifically for this */}
                    <Button
                        className="w-full bg-white/90 hover:bg-white text-slate-900 font-bold text-sm shadow-lg shadow-slate-900/10 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-4 group-hover:translate-y-0 border border-white/60"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSend();
                        }}
                    >
                        <Send className="w-4 h-4 mr-2" />
                        Send to Client
                    </Button>
                </div>
            </Card>
        </motion.div>
    );
}
