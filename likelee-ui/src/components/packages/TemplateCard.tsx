import React from "react";
import { motion } from "framer-motion";
import { Pencil, Send, Trash2, Package as PackageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface TemplateCardProps {
    template: any;
    onEdit: () => void;
    onSend: () => void;
    onDelete: () => void;
}

export function TemplateCard({ template, onEdit, onSend, onDelete }: TemplateCardProps) {
    const talentCount = template.items?.length || 0;
    const primaryColor = template.primary_color || "#6366F1";
    const secondaryColor = template.secondary_color || "#06B6D4";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="group"
        >
            <Card className="relative overflow-hidden border-2 border-gray-200 hover:border-gray-900 transition-all duration-300 cursor-pointer h-[320px] flex flex-col">
                {/* Gradient Background with Folder Shape */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                    }}
                />

                {/* Folder Tab Effect */}
                <div
                    className="absolute top-0 left-8 w-24 h-8 rounded-t-xl opacity-20"
                    style={{
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                    }}
                />

                {/* Content */}
                <div className="relative flex-1 flex flex-col items-center justify-center p-8 text-center">
                    {/* Folder Icon */}
                    <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
                        style={{
                            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                        }}
                    >
                        <PackageIcon className="w-10 h-10 text-white" />
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2 line-clamp-2">
                        {template.title}
                    </h3>

                    {/* Talent Count */}
                    <Badge variant="secondary" className="bg-gray-100 font-bold text-xs">
                        {talentCount} Talent{talentCount !== 1 ? 's' : ''}
                    </Badge>

                    {/* Description (subtle, on hover) */}
                    {template.description && (
                        <p className="text-sm text-gray-500 mt-3 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {template.description}
                        </p>
                    )}
                </div>

                {/* Action Buttons (appear on hover) */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex gap-2 justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-4 font-bold text-xs border-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                        >
                            <Pencil className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                        </Button>
                        <Button
                            size="sm"
                            className="h-9 px-4 font-bold text-xs shadow-md"
                            style={{ backgroundColor: primaryColor }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSend();
                            }}
                        >
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                            Send
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-4 font-bold text-xs border-2 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Delete
                        </Button>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}
