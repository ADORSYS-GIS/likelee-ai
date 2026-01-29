import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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

const LogCommunicationModal = ({
    clientId,
    contacts,
    isOpen,
    onClose,
}: {
    clientId: string;
    contacts: any[];
    isOpen: boolean;
    onClose: () => void;
}) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        contact_id: "",
        communication_type: "email",
        subject: "",
        content: "",
        occurred_at: new Date().toISOString().split("T")[0],
    });

    const mutation = useMutation({
        mutationFn: (data: any) => crmApi.createCommunication(clientId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["client-communications", clientId],
            });
            toast({
                title: "Success",
                description: "Communication logged successfully",
            });
            onClose();
            setFormData({
                contact_id: "",
                communication_type: "email",
                subject: "",
                content: "",
                occurred_at: new Date().toISOString().split("T")[0],
            });
        },
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        Log Communication
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="font-bold">Contact</Label>
                            <Select
                                value={formData.contact_id}
                                onValueChange={(val) =>
                                    setFormData({ ...formData, contact_id: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select contact" />
                                </SelectTrigger>
                                <SelectContent>
                                    {contacts.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name} ({c.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold">Type</Label>
                            <Select
                                value={formData.communication_type}
                                onValueChange={(val) =>
                                    setFormData({ ...formData, communication_type: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="call">Phone Call</SelectItem>
                                    <SelectItem value="meeting">Meeting</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold">Date</Label>
                        <Input
                            type="date"
                            value={formData.occurred_at}
                            onChange={(e) =>
                                setFormData({ ...formData, occurred_at: e.target.value })
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold">Subject</Label>
                        <Input
                            value={formData.subject}
                            onChange={(e) =>
                                setFormData({ ...formData, subject: e.target.value })
                            }
                            placeholder="Meeting summary..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold">Notes</Label>
                        <Textarea
                            value={formData.content}
                            onChange={(e) =>
                                setFormData({ ...formData, content: e.target.value })
                            }
                            placeholder="Details about the communication..."
                            className="min-h-[150px]"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => mutation.mutate(formData)}
                        disabled={mutation.isPending}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {mutation.isPending ? "Saving..." : "Log Communication"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default LogCommunicationModal;
