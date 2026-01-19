import React from "react";
import { FileItem } from "../../../types/agency";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    FileText,
    File,
    MoreVertical,
    Eye,
    Download,
    Share2,
    Trash2,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FileCard = ({
    file,
    onPreview,
    onShare,
}: {
    file: FileItem;
    onPreview: (file: FileItem) => void;
    onShare: (file: FileItem) => void;
}) => (
    <Card className="overflow-hidden bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-shadow group max-w-[280px]">
        <div className="aspect-video bg-gray-50 flex items-center justify-center relative">
            {file.thumbnailUrl ? (
                <img
                    src={file.thumbnailUrl}
                    alt={file.name}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="flex flex-col items-center gap-2">
                    {file.type === "pdf" && <FileText className="w-8 h-8 text-red-500" />}
                    {file.type === "docx" && (
                        <FileText className="w-8 h-8 text-blue-500" />
                    )}
                    {file.type === "jpg" && <File className="w-8 h-8 text-emerald-500" />}
                    <span className="text-[10px] font-black uppercase text-gray-400">
                        {file.type}
                    </span>
                </div>
            )}
            <div className="absolute top-2 right-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="icon"
                            variant="secondary"
                            className="w-7 h-7 rounded-lg bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl">
                        <DropdownMenuItem
                            onClick={() => onPreview(file)}
                            className="font-bold text-gray-700 cursor-pointer"
                        >
                            <Eye className="w-4 h-4 mr-2" /> Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem className="font-bold text-gray-700 cursor-pointer">
                            <Download className="w-4 h-4 mr-2" /> Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onShare(file)}
                            className="font-bold text-gray-700 cursor-pointer"
                        >
                            <Share2 className="w-4 h-4 mr-2" /> Share Link
                        </DropdownMenuItem>
                        <DropdownMenuItem className="font-bold text-red-600 cursor-pointer">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
        <div className="p-2.5">
            <h5 className="text-[13px] font-bold text-gray-900 truncate mb-1">
                {file.name}
            </h5>
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-600 font-bold">
                        {file.size}
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold">
                        {file.uploadedAt}
                    </span>
                </div>
                <Badge
                    variant="outline"
                    className="text-[9px] font-bold text-gray-700 border-gray-200 px-1.5 py-0 bg-gray-50/50"
                >
                    {file.folder}
                </Badge>
            </div>
        </div>
    </Card>
);

export default FileCard;
