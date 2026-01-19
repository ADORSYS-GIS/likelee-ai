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
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const NewFolderModal = ({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900">
                    Create New Folder
                </DialogTitle>
                <DialogDescription className="text-gray-500 font-medium">
                    Organize your files into folders
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Folder Name</Label>
                    <Input
                        placeholder="e.g., Q1 2024 Campaigns"
                        className="h-11 rounded-xl border-gray-200"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700">Folder Type</Label>
                    <Select>
                        <SelectTrigger className="h-11 rounded-xl border-gray-200">
                            <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="talent">Talent Files</SelectItem>
                            <SelectItem value="client">Client Files</SelectItem>
                            <SelectItem value="booking">Booking Files</SelectItem>
                            <SelectItem value="expense">Expense Files</SelectItem>
                            <SelectItem value="marketing">Marketing Files</SelectItem>
                            <SelectItem value="others">others</SelectItem>
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
                    Create Folder
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

export default NewFolderModal;
