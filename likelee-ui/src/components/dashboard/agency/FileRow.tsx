import React from "react";
import { FileItem } from "../../../types/agency";
import { Button } from "@/components/ui/button";
import {
    FileText,
    File,
    Eye,
    Download,
    Share2,
    Trash2,
} from "lucide-react";

const FileRow = ({
    file,
    onPreview,
    onShare,
}: {
    file: FileItem;
    onPreview: (file: FileItem) => void;
    onShare: (file: FileItem) => void;
}) => (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-sm transition-shadow group">
        <div className="flex items-center gap-4 flex-1">
            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                {file.type === "pdf" && <FileText className="w-5 h-5 text-red-500" />}
                {file.type === "docx" && <FileText className="w-5 h-5 text-blue-500" />}
                {file.type === "jpg" && <File className="w-5 h-5 text-emerald-500" />}
            </div>
            <div className="flex-1 min-w-0">
                <h5 className="text-sm font-bold text-gray-900 truncate">
                    {file.name}
                </h5>
                <p className="text-xs text-gray-600 font-bold">
                    {file.size} • <span className="text-indigo-600">{file.folder}</span> •
                    Uploaded by <span className="text-gray-900">{file.uploadedBy}</span>{" "}
                    on {file.uploadedAt}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                onClick={() => onPreview(file)}
            >
                <Eye className="w-4 h-4" />
            </Button>
            <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
            >
                <Download className="w-4 h-4" />
            </Button>
            <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                onClick={() => onShare(file)}
            >
                <Share2 className="w-4 h-4" />
            </Button>
            <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
            >
                <Trash2 className="w-4 h-4" />
            </Button>
        </div>
    </div>
);

export default FileRow;
