import React from "react";
import { FileItem } from "../../../types/agency";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    X,
    Link,
    Copy,
    ShieldCheck,
    Share2,
} from "lucide-react";

const ShareFileModal = ({
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
            <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                <div className="p-6 border-b border-gray-100 bg-white">
                    <div className="flex justify-between items-start mb-1">
                        <DialogTitle className="text-xl font-bold text-gray-900">
                            Share File
                        </DialogTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="rounded-xl -mr-2 -mt-2"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </Button>
                    </div>
                    <DialogDescription className="text-gray-500 font-medium">
                        Generate a secure shareable link for{" "}
                        <span className="text-gray-900 font-bold">{file.name}</span>
                    </DialogDescription>
                </div>

                <div className="p-6 space-y-6 bg-gray-50/30">
                    <div className="space-y-2.5">
                        <Label className="text-sm font-bold text-gray-700 ml-1">
                            Share Link
                        </Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    readOnly
                                    value={`https://agency.likelee.ai/share/${file.id}`}
                                    className="h-12 rounded-xl border-gray-200 bg-white font-medium pl-4 pr-10 shadow-sm focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <Link className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            </div>
                            <Button className="h-12 px-5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 shadow-sm flex items-center gap-2">
                                <Copy className="w-4 h-4" />
                                Copy
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2.5">
                            <Label className="text-sm font-bold text-gray-700 ml-1">
                                Link Expiration
                            </Label>
                            <Select defaultValue="7-days">
                                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white shadow-sm">
                                    <SelectValue placeholder="Select expiration..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="24-hours" className="font-medium">
                                        24 Hours
                                    </SelectItem>
                                    <SelectItem value="7-days" className="font-medium">
                                        7 Days
                                    </SelectItem>
                                    <SelectItem value="30-days" className="font-medium">
                                        30 Days
                                    </SelectItem>
                                    <SelectItem value="never" className="font-medium">
                                        Never
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2.5">
                            <Label className="text-sm font-bold text-gray-700 ml-1">
                                Access Level
                            </Label>
                            <Select defaultValue="view">
                                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white shadow-sm">
                                    <SelectValue placeholder="Select access..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="view" className="font-medium">
                                        View Only
                                    </SelectItem>
                                    <SelectItem value="download" className="font-medium">
                                        Can Download
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <Label
                                    className="text-sm font-bold text-gray-700 cursor-pointer"
                                    htmlFor="require-password"
                                >
                                    Require password
                                </Label>
                                <p className="text-[11px] text-gray-500 font-medium">
                                    Add an extra layer of security
                                </p>
                            </div>
                        </div>
                        <Checkbox
                            id="require-password"
                            className="rounded-md w-5 h-5 border-gray-300"
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="h-12 px-6 rounded-xl border-gray-200 font-bold text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </Button>
                    <Button className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200">
                        <Share2 className="w-4 h-4" />
                        Create Share Link
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ShareFileModal;
