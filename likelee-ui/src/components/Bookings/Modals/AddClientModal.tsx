import React, { useState, useEffect } from "react";
import { X, Building2, CheckCircle2, Plus } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const AddClientModal = ({
    open,
    onOpenChange,
    onAdd,
    initialData,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (client: any) => void;
    initialData?: any;
}) => {
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        company: "",
        website: "",
        address: "",
        contact: "",
        email: "",
        phone: "",
        terms: "net15",
        notes: "",
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                company: initialData.company || "",
                website: initialData.website || "",
                address: initialData.address || "",
                contact: initialData.contact || "",
                email: initialData.email || "",
                phone: initialData.phone || "",
                terms: initialData.terms || "net15",
                notes: initialData.notes || "",
            });
            setSelectedTags(initialData.industryTags || []);
        } else {
            setFormData({
                company: "",
                website: "",
                address: "",
                contact: "",
                email: "",
                phone: "",
                terms: "net15",
                notes: "",
            });
            setSelectedTags([]);
        }
    }, [initialData, open]);

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
        );
    };

    const handleSave = () => {
        onAdd({
            id: initialData?.id || `client-${Date.now()}`,
            ...formData,
            industryTags: selectedTags,
            revenue: initialData?.revenue || 0,
            bookings_count: initialData?.bookings_count || 0,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                        {initialData ? "Edit Client" : "Add New Client"}
                    </DialogTitle>
                    <DialogDescription>
                        {initialData
                            ? "Update client information"
                            : "Add client information for easier booking management"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <h3 className="text-lg font-bold border-b pb-2">
                        Company Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="font-bold">Company Name *</Label>
                            <Input
                                placeholder="Acme Inc."
                                value={formData.company}
                                onChange={(e) =>
                                    setFormData({ ...formData, company: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold">Website</Label>
                            <Input
                                placeholder="https://example.com"
                                value={formData.website}
                                onChange={(e) =>
                                    setFormData({ ...formData, website: e.target.value })
                                }
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold">Address</Label>
                        <Input
                            placeholder="123 Main St, New York, NY 10001"
                            value={formData.address}
                            onChange={(e) =>
                                setFormData({ ...formData, address: e.target.value })
                            }
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="font-bold">Industry/Category Tags</Label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                "Fashion",
                                "Beauty",
                                "Fitness",
                                "Commercial",
                                "Editorial",
                                "E-commerce",
                                "Advertising",
                                "Film/TV",
                                "Events",
                                "Sports",
                                "Luxury",
                                "Tech",
                                "Food & Beverage",
                                "Automotive",
                            ].map((tag) => (
                                <Badge
                                    key={tag}
                                    variant={selectedTags.includes(tag) ? "default" : "secondary"}
                                    className={`${selectedTags.includes(tag)
                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                            : "bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                                        } cursor-pointer py-1 px-3 text-sm flex items-center gap-1.5 transition-all`}
                                    onClick={() => toggleTag(tag)}
                                >
                                    {tag}
                                    {selectedTags.includes(tag) && <X className="w-3 h-3 ml-1" />}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <h3 className="text-lg font-bold border-b pb-2 pt-2">
                        Primary Contact
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="font-bold">Contact Name *</Label>
                            <Input
                                placeholder="John Doe"
                                value={formData.contact}
                                onChange={(e) =>
                                    setFormData({ ...formData, contact: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold">Email</Label>
                            <Input
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold">Phone</Label>
                        <Input
                            placeholder="+1 (555) 123-4567"
                            value={formData.phone}
                            onChange={(e) =>
                                setFormData({ ...formData, phone: e.target.value })
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold">Payment Terms</Label>
                        <Select
                            value={formData.terms}
                            onValueChange={(v) => setFormData({ ...formData, terms: v })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="net15">Net 15</SelectItem>
                                <SelectItem value="net30">Net 30</SelectItem>
                                <SelectItem value="net60">Net 60</SelectItem>
                                <SelectItem value="net90">Net 90</SelectItem>
                                <SelectItem value="upon_completion">Upon Completion</SelectItem>
                                <SelectItem value="split_deposit">
                                    50% Deposit / 50% Upon Completion
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold">Notes & Preferences</Label>
                        <Textarea
                            placeholder="Any special notes, preferences, or important information about this client..."
                            className="min-h-[100px]"
                            value={formData.notes}
                            onChange={(e) =>
                                setFormData({ ...formData, notes: e.target.value })
                            }
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="font-bold"
                    >
                        Cancel
                    </Button>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                        onClick={handleSave}
                        disabled={!formData.company || !formData.contact}
                    >
                        Add Client
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
