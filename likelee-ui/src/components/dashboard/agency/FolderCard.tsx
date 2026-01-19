import React from "react";
import { FolderItem } from "../../../types/agency";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Folder,
    MoreVertical,
    FolderOpen,
    Edit,
    Trash2,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FolderCard = ({ folder }: { folder: FolderItem }) => {
    const getFolderColor = (type: string) => {
        switch (type) {
            case "talent":
                return "text-indigo-500";
            case "client":
                return "text-emerald-500";
            case "booking":
                return "text-blue-500";
            case "expense":
                return "text-orange-500";
            case "marketing":
                return "text-purple-500";
            default:
                return "text-gray-500";
        }
    };

    const getFolderBg = (type: string) => {
        switch (type) {
            case "talent":
                return "bg-indigo-50/50";
            case "client":
                return "bg-emerald-50/50";
            case "booking":
                return "bg-blue-50/50";
            case "expense":
                return "bg-orange-50/50";
            case "marketing":
                return "bg-purple-50/50";
            default:
                return "bg-gray-50/50";
        }
    };

    return (
        <Card className="p-6 bg-white border border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div
                    className={`w-14 h-14 ${getFolderBg(folder.type)} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm border border-white/50`}
                >
                    <div className="relative">
                        <Folder
                            className={`w-8 h-8 ${getFolderColor(folder.type)} fill-current opacity-20`}
                        />
                        <Folder
                            className={`absolute inset-0 w-8 h-8 ${getFolderColor(folder.type)}`}
                        />
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="w-8 h-8 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl">
                        <DropdownMenuItem className="font-bold text-gray-700 cursor-pointer">
                            <FolderOpen className="w-4 h-4 mr-2" /> Open
                        </DropdownMenuItem>
                        <DropdownMenuItem className="font-bold text-gray-700 cursor-pointer">
                            <Edit className="w-4 h-4 mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem className="font-bold text-red-600 cursor-pointer">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="relative z-10">
                <h4 className="text-base font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                    {folder.name}
                </h4>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 font-bold">
                        {folder.fileCount} files
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500 font-bold">
                        {folder.totalSize}
                    </span>
                </div>
            </div>
        </Card>
    );
};

export default FolderCard;
