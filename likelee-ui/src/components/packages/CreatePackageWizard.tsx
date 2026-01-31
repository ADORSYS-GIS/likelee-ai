import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Loader2, Plus, X, Check, ArrowRight, ArrowLeft,
    Image as ImageIcon, User, Settings, Send, Search,
    Eye, Calendar, Palette, Type, Building2, Mail,
    GripVertical, Trash2, Globe, SwitchCamera
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { packageApi } from "@/api/packages";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

interface CreatePackageWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const STEPS = [
    { id: "basic", title: "Basic Info", icon: Type },
    { id: "talent", title: "Select Talents", icon: User },
    { id: "custom", title: "Customize", icon: Palette },
    { id: "send", title: "Send", icon: Send },
];

export function CreatePackageWizard({ open, onOpenChange }: CreatePackageWizardProps) {
    const [step, setStep] = useState(0);
    const [showTalentSelector, setShowTalentSelector] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        cover_image_url: "",
        primary_color: "#6366F1",
        secondary_color: "#06B6D4",
        custom_message: "",
        allow_comments: true,
        allow_favorites: true,
        allow_callbacks: true,
        password_protected: false,
        password: "",
        expires_at: "",
        client_name: "",
        client_email: "",
        items: [] as any[],
    });

    const { data: talentsData, isLoading: loadingTalents } = useQuery({
        queryKey: ["agency-talents"],
        queryFn: () => packageApi.listTalents(),
        enabled: open && showTalentSelector,
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => packageApi.createPackage(data),
        onSuccess: () => {
            toast({
                title: "Package Created",
                description: "Your talent portal has been published successfully!",
            });
            queryClient.invalidateQueries({ queryKey: ["agency-packages"] });
            onOpenChange(false);
            resetForm();
        },
    });

    const resetForm = () => {
        setStep(0);
        setFormData({
            title: "",
            description: "",
            cover_image_url: "",
            primary_color: "#6366F1",
            secondary_color: "#06B6D4",
            custom_message: "",
            allow_comments: true,
            allow_favorites: true,
            allow_callbacks: true,
            password_protected: false,
            password: "",
            expires_at: "",
            client_name: "",
            client_email: "",
            items: [],
        });
    };

    const nextStep = () => {
        if (step === 0 && !formData.title) return toast({ title: "Required", description: "Title is required", variant: "destructive" });
        if (step === 1 && formData.items.length === 0) return toast({ title: "Empty", description: "Please select at least one talent", variant: "destructive" });
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
    };

    const prevStep = () => setStep((s) => Math.max(s - 1, 0));

    const toggleTalentSelection = (talent: any) => {
        const isSelected = formData.items.some((item) => item.talent_id === talent.id);
        if (isSelected) {
            setFormData({
                ...formData,
                items: formData.items.filter((item) => item.talent_id !== talent.id),
            });
        } else {
            setFormData({
                ...formData,
                items: [...formData.items, { talent_id: talent.id, asset_ids: [], talent }],
            });
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden bg-white rounded-3xl border-none shadow-[0_32px_128px_-12px_rgba(0,0,0,0.1)]">
                    {/* Header */}
                    <div className="p-8 pb-0">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <DialogTitle className="text-3xl font-black text-gray-900 tracking-tighter">
                                    Create New Package
                                </DialogTitle>
                                <p className="text-sm text-gray-400 font-medium mt-1">
                                    Build a beautiful portfolio package to showcase your talent to clients
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-50" onClick={() => onOpenChange(false)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Step Bar */}
                        <div className="flex items-center gap-0 mb-8 max-w-2xl">
                            {STEPS.map((s, i) => (
                                <React.Fragment key={s.id}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${step >= i ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-gray-100 text-gray-400"}`}>
                                            {step > i ? <Check className="w-4 h-4" /> : i + 1}
                                        </div>
                                        <span className={`text-xs font-black tracking-tight ${step >= i ? "text-gray-900" : "text-gray-400"}`}>
                                            {s.title}
                                        </span>
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div className="flex-1 mx-4 h-[2px] bg-gray-100" />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-8 pb-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                {step === 0 && (
                                    <div className="space-y-6 max-w-2xl">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-gray-900">Package Title *</Label>
                                            <Input
                                                placeholder="Enter title..."
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                className="h-12 bg-white border-gray-100 focus:border-indigo-600 rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-gray-900">Description</Label>
                                            <Textarea
                                                placeholder="Add a brief description..."
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                className="min-h-[100px] border-gray-100 rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-gray-900">Cover Image URL</Label>
                                            <Input
                                                placeholder="https://..."
                                                value={formData.cover_image_url}
                                                onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                                                className="h-12 border-gray-100 rounded-xl"
                                            />
                                        </div>

                                        <div className="p-6 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-6">
                                            <h4 className="text-sm font-black text-gray-900 tracking-tight">Agency Branding</h4>
                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Primary Color</Label>
                                                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-100">
                                                        <input
                                                            type="color"
                                                            value={formData.primary_color}
                                                            onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                                                            className="w-full h-8 cursor-pointer rounded-lg overflow-hidden border-none"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Secondary Color</Label>
                                                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-100">
                                                        <input
                                                            type="color"
                                                            value={formData.secondary_color}
                                                            onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                                                            className="w-full h-8 cursor-pointer rounded-lg overflow-hidden border-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2 pt-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Custom Message</Label>
                                                <Textarea
                                                    placeholder="A personal note for the client..."
                                                    value={formData.custom_message}
                                                    onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}
                                                    className="bg-white border-gray-100 rounded-xl"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 1 && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Selected Talents ({formData.items.length})</h3>
                                            <Button
                                                onClick={() => setShowTalentSelector(true)}
                                                className="bg-gray-900 hover:bg-black text-white rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest gap-2"
                                            >
                                                <Plus className="w-4 h-4" /> Add Talent
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            <AnimatePresence>
                                                {formData.items.map((item, idx) => (
                                                    <motion.div
                                                        key={item.talent_id}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-lg hover:shadow-gray-100 transition-all duration-300"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-2 border border-gray-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                                                                <GripVertical className="w-4 h-4 text-gray-300" />
                                                            </div>
                                                            <div className="w-12 h-12 rounded-xl bg-gray-50 overflow-hidden">
                                                                <img src={item.talent.profile_photo_url} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div>
                                                                <h5 className="font-black text-gray-900 tracking-tight">{item.talent.full_name}</h5>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">0 photos, 0 videos</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <Button variant="outline" className="h-9 px-4 rounded-xl border-gray-100 text-[10px] font-black uppercase tracking-widest gap-2">
                                                                <ImageIcon className="w-3.5 h-3.5" /> Select Assets
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => toggleTalentSelection(item.talent)}
                                                                className="h-9 w-9 text-gray-300 hover:text-red-500 rounded-xl"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                            {formData.items.length === 0 && (
                                                <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                                                    <User className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                                                    <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">No talents selected</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="max-w-2xl space-y-10 py-4">
                                        <div className="space-y-6">
                                            <h3 className="text-xl font-black text-gray-900 tracking-tighter">Package Settings</h3>
                                            <div className="space-y-4">
                                                {[
                                                    { id: 'allow_comments', label: 'Allow Client Comments', desc: 'Clients can leave comments on each talent' },
                                                    { id: 'allow_favorites', label: 'Allow Favorites', desc: 'Clients can favorite talents they\'re interested in' },
                                                    { id: 'allow_callbacks', label: 'Allow Callback Requests', desc: 'Clients can request a callback from your agency' },
                                                    { id: 'password_protected', label: 'Password Protection', desc: 'Require password to view package' },
                                                ].map((s) => (
                                                    <div key={s.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors">
                                                        <div>
                                                            <Label className="text-sm font-black text-gray-900 tracking-tight block mb-1">{s.label}</Label>
                                                            <p className="text-xs text-gray-400 font-medium">{s.desc}</p>
                                                        </div>
                                                        <Switch
                                                            checked={(formData as any)[s.id]}
                                                            onCheckedChange={(val) => setFormData({ ...formData, [s.id]: val })}
                                                            className="data-[state=checked]:bg-indigo-600"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {formData.password_protected && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="space-y-2"
                                                >
                                                    <Label className="text-xs font-black uppercase tracking-widest text-gray-900">Access Password</Label>
                                                    <Input
                                                        type="password"
                                                        placeholder="Enter password..."
                                                        value={formData.password}
                                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                        className="h-12 border-gray-100 rounded-xl"
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-gray-900">Expiration Date (Optional)</Label>
                                            <Input
                                                type="date"
                                                value={formData.expires_at}
                                                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                                                className="h-12 border-gray-100 rounded-xl font-bold"
                                            />
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="max-w-2xl space-y-8 py-4">
                                        <div className="space-y-6">
                                            <h3 className="text-xl font-black text-gray-900 tracking-tighter">Final Details</h3>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-black uppercase tracking-widest text-gray-900">Client Name *</Label>
                                                    <Input
                                                        placeholder="e.g. John Doe"
                                                        value={formData.client_name}
                                                        onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                                        className="h-12 border-gray-100 rounded-xl font-bold"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-black uppercase tracking-widest text-gray-900">Client Email *</Label>
                                                    <Input
                                                        type="email"
                                                        placeholder="client@company.com"
                                                        value={formData.client_email}
                                                        onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                                                        className="h-12 border-gray-100 rounded-xl font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-8 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Package Preview</h4>
                                            <div className="space-y-1">
                                                <h5 className="text-lg font-black text-indigo-900 uppercase tracking-tight">Title: <span className="font-bold lowercase opacity-70">"{formData.title || 'Untitled'}"</span></h5>
                                                <p className="text-sm font-bold text-indigo-900/60 uppercase tracking-widest">Talents: <span className="text-indigo-900">{formData.items.length} selected</span></p>
                                                <p className="text-sm font-bold text-indigo-900/60 uppercase tracking-widest">Settings: <span className="text-indigo-900">
                                                    {[
                                                        formData.allow_comments && "Comments",
                                                        formData.allow_favorites && "Favorites",
                                                        formData.allow_callbacks && "Callbacks",
                                                        formData.password_protected && "Password Protected"
                                                    ].filter(Boolean).join(", ")}
                                                </span></p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <DialogFooter className="p-8 pt-0 flex flex-row items-center justify-between sm:justify-between w-full">
                        <Button
                            variant="ghost"
                            onClick={prevStep}
                            disabled={step === 0}
                            className="bg-gray-50 hover:bg-gray-100 rounded-xl px-6 h-12 font-black uppercase tracking-widest text-[10px] gap-2 border border-gray-100"
                        >
                            Cancel
                        </Button>

                        <div className="flex gap-4">
                            {step > 0 && step < STEPS.length - 1 && (
                                <Button
                                    variant="outline"
                                    onClick={prevStep}
                                    className="rounded-xl px-8 h-12 font-black uppercase tracking-widest text-[10px] border-gray-200"
                                >
                                    Previous
                                </Button>
                            )}

                            {step < STEPS.length - 1 ? (
                                <Button
                                    onClick={nextStep}
                                    className="bg-black hover:bg-gray-900 text-white rounded-xl px-12 h-12 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-gray-200"
                                >
                                    Next
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => createMutation.mutate(formData)}
                                    disabled={createMutation.isPending}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-12 h-12 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-indigo-200 gap-2"
                                >
                                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Create & Send Package
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Talent Selector Overlay Modal */}
            <Dialog open={showTalentSelector} onOpenChange={setShowTalentSelector}>
                <DialogContent className="max-w-2xl rounded-3xl p-8 border-none scrollbar-hide">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-black text-gray-900 tracking-tighter">Select Talent</DialogTitle>
                    </DialogHeader>

                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input placeholder="Search roster..." className="pl-11 h-12 rounded-xl bg-gray-50 border-transparent focus:bg-white" />
                    </div>

                    <ScrollArea className="h-[400px]">
                        <div className="grid grid-cols-2 gap-4">
                            {Array.isArray(talentsData) && talentsData.map((talent: any) => {
                                const isSelected = formData.items.some(i => i.talent_id === talent.id);
                                return (
                                    <Card
                                        key={talent.id}
                                        onClick={() => toggleTalentSelection(talent)}
                                        className={`p-4 cursor-pointer rounded-2xl border-2 transition-all duration-300 flex items-center gap-4 ${isSelected ? "border-indigo-600 bg-indigo-50/30" : "border-gray-50 hover:border-gray-200"}`}
                                    >
                                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                            <img src={talent.profile_photo_url} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h6 className="font-black text-gray-900 truncate tracking-tight">{talent.full_name}</h6>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{talent.categories?.[0] || 'Model'}</p>
                                        </div>
                                        {isSelected && <Check className="w-5 h-5 text-indigo-600" />}
                                    </Card>
                                );
                            })}
                        </div>
                    </ScrollArea>

                    <Button
                        onClick={() => setShowTalentSelector(false)}
                        className="w-full mt-8 bg-gray-900 hover:bg-black text-white rounded-2xl h-14 font-black uppercase tracking-widest text-[11px]"
                    >
                        Save Selection ({formData.items.length})
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
}
