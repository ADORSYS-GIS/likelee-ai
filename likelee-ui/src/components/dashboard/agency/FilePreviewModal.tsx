import React from "react";
import { FileItem } from "../../../types/agency";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, File, X, Download } from "lucide-react";

const FilePreviewModal = ({
    file,
    isOpen,
    onClose,
}: {
    file: FileItem | null;
    isOpen: boolean;
    onClose: () => void;
}) => {
    if (!file) return null;
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[900px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                            {file.type === "pdf" && (
                                <FileText className="w-6 h-6 text-red-500" />
                            )}
                            {file.type === "docx" && (
                                <FileText className="w-6 h-6 text-blue-500" />
                            )}
                            {file.type === "jpg" && (
                                <File className="w-6 h-6 text-emerald-500" />
                            )}
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-gray-900">
                                {file.name}
                            </DialogTitle>
                            <p className="text-sm text-gray-500 font-medium">
                                {file.size} • Uploaded by {file.uploadedBy} on {file.uploadedAt}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="rounded-xl hover:bg-gray-50"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </Button>
                </div>
                <div className="p-10 bg-gray-50/50 flex items-center justify-center min-h-[500px] relative group">
                    {file.thumbnailUrl ? (
                        <div className="relative">
                            <img
                                src={file.thumbnailUrl}
                                alt={file.name}
                                className="max-w-full max-h-[600px] rounded-2xl shadow-2xl border-4 border-white transition-transform group-hover:scale-[1.01]"
                            />
                            <div className="absolute inset-0 rounded-2xl shadow-inner pointer-events-none" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-6 p-12 bg-white rounded-3xl shadow-sm border border-gray-100">
                            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center">
                                {file.type === "pdf" && (
                                    <FileText className="w-10 h-10 text-red-500" />
                                )}
                                {file.type === "docx" && (
                                    <FileText className="w-10 h-10 text-blue-500" />
                                )}
                            </div>
                            <div className="text-center">
                                <p className="text-gray-900 font-bold text-lg mb-1">
                                    Preview not available
                                </p>
                                <p className="text-gray-500 text-sm font-medium">
                                    Please download the file to view its content
                                </p>
                            </div>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-8">
                                Download Now
                            </Button>
                        </div>
                    )}
                </div>
                <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-white">
                    <div className="flex gap-2">
                        <Badge
                            variant="outline"
                            className="bg-gray-50 text-gray-600 border-gray-200 font-bold px-3 py-1 rounded-lg"
                        >
                            {file.folder}
                        </Badge>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="h-11 px-6 rounded-xl border-gray-200 font-bold text-gray-700 hover:bg-gray-50"
                        >
                            Close Preview
                        </Button>
                        <Button className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200">
                            <Download className="w-4 h-4" />
                            Download File
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default FilePreviewModal;
