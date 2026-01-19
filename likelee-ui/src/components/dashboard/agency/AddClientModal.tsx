import React from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

const AddClientModal = ({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-2xl border-none">
                <div className="p-8 space-y-6">
                    <div className="flex justify-between items-center">
                        <DialogTitle className="text-2xl font-bold text-gray-900">
                            Add New Client
                        </DialogTitle>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">
                                Company Name *
                            </Label>
                            <Input
                                placeholder="Company Inc."
                                className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">
                                Industry
                            </Label>
                            <Input
                                placeholder="Fashion, Tech, etc."
                                className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">Website</Label>
                        <Input
                            placeholder="company.com"
                            className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">
                            Pipeline Stage
                        </Label>
                        <Select defaultValue="lead">
                            <SelectTrigger className="h-11 bg-gray-50 border-gray-200 rounded-xl">
                                <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="lead">Lead</SelectItem>
                                <SelectItem value="prospect">Prospect</SelectItem>
                                <SelectItem value="active">Active Client</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">
                            Tags (comma-separated)
                        </Label>
                        <Input
                            placeholder="Fashion, Commercial, High-Budget"
                            className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">Notes</Label>
                        <Textarea
                            placeholder="Add notes about this client..."
                            className="min-h-[100px] bg-gray-50 border-gray-200 rounded-xl resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="h-11 px-8 rounded-xl border-gray-200 font-bold"
                        >
                            Cancel
                        </Button>
                        <Button className="h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">
                            Add Client
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddClientModal;
