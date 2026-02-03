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
                className="relative overflow-hidden border border-gray-200 hover:border-gray-900 hover:shadow-xl transition-all duration-300 h-[400px] group cursor-pointer"
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
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
                        </>
                    ) : (
                        <div
                            className="w-full h-full"
                            style={{
                                background: `linear-gradient(135deg, ${template.primary_color || '#6366F1'} 0%, ${template.secondary_color || '#06B6D4'} 100%)`
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="relative h-full flex flex-col p-6 pointer-events-none">
                    {/* Header with Icon and Menu */}
                    <div className="flex items-start justify-between mb-auto">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                <PackageIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight line-clamp-1">
                                    {template.title}
                                </h3>
                                <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm text-white border-white/30 font-bold text-xs mt-1">
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
                                        className="h-8 w-8 text-white hover:bg-white/20 backdrop-blur-sm"
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
                        className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold text-sm shadow-lg pointer-events-auto"
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
