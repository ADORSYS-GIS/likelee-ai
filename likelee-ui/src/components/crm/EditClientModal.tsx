import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import * as crmApi from "@/api/crm";
import { Client } from "@/types/crm";

const EditClientModal = ({
    client,
    isOpen,
    onClose,
}: {
    client: Client;
    isOpen: boolean;
    onClose: () => void;
}) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        company: "",
        industry: "",
        website: "",
        status: "Lead",
        tags: "",
        notes: "",
        next_follow_up_date: "",
    });

    useEffect(() => {
        if (client) {
            setFormData({
                company: client.name || "",
                industry: client.industry || "",
                website: client.website || "",
                status: client.status || "Lead",
                tags: client.tags ? client.tags.join(", ") : "",
                notes: client.notes || client.preferences?.notes || "",
                next_follow_up_date: client.next_follow_up_date ? new Date(client.next_follow_up_date).toISOString().split('T')[0] : "",
            });
        }
    }, [client]);

    const mutation = useMutation({
        mutationFn: (data: any) => crmApi.updateClient(client.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agency-clients"] });
            toast({
                title: "Success",
                description: "Client updated successfully",
            });
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update client",
                variant: "destructive",
            });
        },
    });

    const handleSubmit = () => {
        if (!formData.company) {
            toast({
                title: "Error",
                description: "Company name is required",
                variant: "destructive",
            });
            return;
        }
        mutation.mutate({
            ...formData,
            tags: formData.tags
                ? formData.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                : [],
            next_follow_up_date: formData.next_follow_up_date || null,
            preferences: { ...client.preferences, notes: formData.notes },
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-2xl border-none">
                <div className="p-8 space-y-6">
                    <div className="flex justify-between items-center">
                        <DialogTitle className="text-2xl font-bold text-gray-900">
                            Edit Client
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
                                value={formData.company}
                                onChange={(e) =>
                                    setFormData({ ...formData, company: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">
                                Industry
                            </Label>
                            <Input
                                placeholder="Fashion, Tech, etc."
                                className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                                value={formData.industry}
                                onChange={(e) =>
                                    setFormData({ ...formData, industry: e.target.value })
                                }
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">Website</Label>
                        <Input
                            placeholder="company.com"
                            className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                            value={formData.website}
                            onChange={(e) =>
                                setFormData({ ...formData, website: e.target.value })
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">
                            Pipeline Stage
                        </Label>
                        <Select
                            value={formData.status}
                            onValueChange={(val) => setFormData({ ...formData, status: val })}
                        >
                            <SelectTrigger className="h-11 bg-gray-50 border-gray-200 rounded-xl">
                                <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Lead">Lead</SelectItem>
                                <SelectItem value="Prospect">Prospect</SelectItem>
                                <SelectItem value="Active Client">Active Client</SelectItem>
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
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">Next Follow-up Date</Label>
                        <Input
                            type="date"
                            className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                            value={formData.next_follow_up_date}
                            onChange={(e) => setFormData({ ...formData, next_follow_up_date: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">Notes</Label>
                        <Textarea
                            placeholder="Add notes about this client..."
                            className="min-h-[100px] bg-gray-50 border-gray-200 rounded-xl resize-none"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                        <Button
                            onClick={handleSubmit}
                            disabled={mutation.isPending}
                            className="h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                        >
                            {mutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default EditClientModal;
