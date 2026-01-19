import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { MOCK_FOLDERS } from "../../../data/agencyMockData";

const UploadFilesModal = ({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
            <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900">
                    Upload Files
                </DialogTitle>
                <DialogDescription className="text-gray-500 font-medium">
                    Upload documents, images, or other files to your storage
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-indigo-600" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1">
                        Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                        PDF, DOC, JPG, PNG up to 50MB
                    </p>
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">
                        Save to folder
                    </Label>
                    <Select>
                        <SelectTrigger className="h-11 rounded-xl border-gray-200">
                            <SelectValue placeholder="Select a folder..." />
                        </SelectTrigger>
                        <SelectContent>
                            {MOCK_FOLDERS.map((folder) => (
                                <SelectItem key={folder.id} value={folder.id}>
                                    {folder.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter className="gap-2">
                <Button
                    variant="outline"
                    onClick={onClose}
                    className="h-11 px-6 rounded-xl border-gray-200 font-bold"
                >
                    Cancel
                </Button>
                <Button className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">
                    Upload Files
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

export default UploadFilesModal;
